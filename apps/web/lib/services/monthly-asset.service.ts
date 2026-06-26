import { prisma } from '@/lib/prisma';
import { getKSTDateParts, getMonthRangeKST } from '@/lib/date-utils';
import {
  buildMonthWindow,
  formatMonthKey,
  kstMonthEndUTC,
  previousMonth,
  ymFromMonthKey,
} from '@/lib/utils/asset-month';

const DEFAULT_RANGE = 6;
const MAX_RANGE = 12;

type DecimalLike = { toString(): string } | null | undefined;

export interface MonthlyAssetSnapshotData {
  month: string;
  totalAssetKrw: number;
  cashKrw: number;
  investmentKrw: number;
  savingsKrw: number;
  otherKrw: number;
  cashRatio: number;
  investmentRatio: number;
  savingsRatio: number;
  otherRatio: number;
  monthlyIncomeKrw: number;
  monthlyExpenseKrw: number;
  monthlySavingsKrw: number;
  investmentPnlKrw: number;
  investmentChangeKrw: number | null;
  sourceStatus: string;
  stored: boolean;
}

export interface MonthlyInvestmentPosition {
  accountId: string;
  accountName: string;
  broker: string;
  snapshotDate: string;
  asOf: string;
  symbol: string;
  name: string;
  market: string | null;
  currency: string;
  quantity: number;
  avgCost: number | null;
  lastPrice: number | null;
  marketValue: number;
  marketValueKrw: number;
  unrealizedPnlKrw: number;
  pnlRate: number | null;
  fxRateToKrw: number | null;
}

export interface MonthlyInvestmentAccount {
  accountId: string;
  accountName: string;
  broker: string;
  snapshotDate: string;
  asOf: string;
  cashKrw: number;
  positionsValueKrw: number;
  totalEquityKrw: number;
}

export interface MonthlyInvestmentDailyBalance {
  date: string;
  broker: string;
  cashKrw: number;
  positionsValueKrw: number;
  totalEquityKrw: number;
}

export interface MonthlySavingsGoalReport {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  targetYear: number;
  targetMonth: number;
  isPrimary: boolean;
  progressPercent: number;
  monthlyDepositKrw: number;
}

export interface MonthlyDailyExpense {
  date: string;
  day: number;
  amount: number;
  cumulativeAmount: number;
  budgetPaceKrw: number | null;
}

export interface MonthlyRecentExpense {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  categoryName: string;
  categoryColor: string | null;
}

export interface MonthlyAssetReport {
  months: string[];
  snapshots: MonthlyAssetSnapshotData[];
  current: MonthlyAssetSnapshotData & {
    previousTotalAssetKrw: number | null;
    totalMomDelta: number | null;
    totalMomPercent: number | null;
  };
  report: {
    expenseBudgetKrw: number;
    expenseBudgetUsedPercent: number | null;
    expenseMomPercent: number | null;
    savingsRate: number | null;
    emergencyMonths: number | null;
    dailyExpenses: MonthlyDailyExpense[];
    recentExpenses: MonthlyRecentExpense[];
    topExpenseCategories: Array<{
      categoryId: string;
      name: string;
      color: string | null;
      amount: number;
      budgetKrw: number | null;
      usedPercent: number | null;
    }>;
    primarySavingsGoal: {
      id: string;
      name: string;
      currentAmount: number;
      targetAmount: number;
      targetYear: number;
      targetMonth: number;
      isPrimary: boolean;
      progressPercent: number;
      monthlyDepositKrw: number;
    } | null;
    savingsGoals: MonthlySavingsGoalReport[];
    investment: {
      totalKrw: number;
      monthlyChangeKrw: number | null;
      unrealizedPnlKrw: number;
      snapshotDate: string | null;
      snapshotDateCount: number;
      accounts: MonthlyInvestmentAccount[];
      dailyBalances: MonthlyInvestmentDailyBalance[];
      topPosition: {
        symbol: string;
        name: string;
        pnlKrw: number;
        pnlRate: number | null;
      } | null;
      positions: MonthlyInvestmentPosition[];
    };
  };
}

type InvestmentDailyBalanceAccumulator = {
  date: string;
  broker: string;
  cashKrw: number;
  positionsValueKrw: number;
  totalEquityKrw: number;
};

function num(value: DecimalLike): number {
  const n = Number(value?.toString() ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function roundWon(value: number): number {
  return Math.round(Number.isFinite(value) ? value : 0);
}

function ratio(value: number, total: number): number {
  if (total <= 0) return 0;
  return Number(((value / total) * 100).toFixed(1));
}

function percentDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function kstDateKey(date: Date): string {
  const parts = getKSTDateParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

async function getCashAt(userId: string, monthEnd: Date): Promise<number> {
  const row = await prisma.dailyBalance.findFirst({
    where: { userId, date: { lte: monthEnd } },
    orderBy: { date: 'desc' },
    select: { balance: true },
  });
  return row?.balance ?? 0;
}

async function getSavingsTotalAt(userId: string, monthEnd: Date): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: {
      userId,
      savingsGoalId: { not: null },
      date: { lte: monthEnd },
      deletedAt: null,
    },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

async function getOtherAssetsAt(userId: string, monthKey: Date): Promise<number> {
  const result = await prisma.assetSnapshot.aggregate({
    where: { userId, month: monthKey },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

async function getInvestmentAt(userId: string, monthEnd: Date) {
  const rows = await prisma.brokerageSnapshot.findMany({
    where: {
      date: { lte: monthEnd },
      account: { connection: { userId, deletedAt: null } },
    },
    orderBy: [{ accountId: 'asc' }, { date: 'desc' }, { createdAt: 'desc' }],
    select: {
      accountId: true,
      date: true,
      asOf: true,
      cashKrw: true,
      totalEquityKrw: true,
      positionsValueKrw: true,
      account: {
        select: {
          displayName: true,
          connection: {
            select: {
              broker: true,
            },
          },
        },
      },
      positions: {
        select: {
          symbol: true,
          name: true,
          market: true,
          currency: true,
          quantity: true,
          avgCost: true,
          lastPrice: true,
          marketValue: true,
          marketValueKrw: true,
          unrealizedPnl: true,
          fxRateToKrw: true,
        },
      },
    },
  });

  const latestByAccount = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latestByAccount.has(row.accountId)) latestByAccount.set(row.accountId, row);
  }

  let totalKrw = 0;
  let unrealizedPnlKrw = 0;
  let topPosition: {
    symbol: string;
    name: string;
    pnlKrw: number;
    pnlRate: number | null;
  } | null = null;
  const positions: MonthlyInvestmentPosition[] = [];
  const accounts: MonthlyInvestmentAccount[] = [];
  const snapshotDates = new Set<string>();
  let snapshotDate: string | null = null;

  for (const row of latestByAccount.values()) {
    const rowSnapshotDate = dateKey(row.date);
    snapshotDates.add(rowSnapshotDate);
    if (!snapshotDate || rowSnapshotDate > snapshotDate) snapshotDate = rowSnapshotDate;
    const accountTotalKrw = num(row.totalEquityKrw);
    totalKrw += accountTotalKrw;
    accounts.push({
      accountId: row.accountId,
      accountName: row.account.displayName,
      broker: row.account.connection.broker,
      snapshotDate: rowSnapshotDate,
      asOf: row.asOf.toISOString(),
      cashKrw: roundWon(num(row.cashKrw)),
      positionsValueKrw: roundWon(num(row.positionsValueKrw)),
      totalEquityKrw: roundWon(accountTotalKrw),
    });
    for (const position of row.positions) {
      const pnl = num(position.unrealizedPnl);
      const marketValue = num(position.marketValueKrw);
      const costBasis = marketValue - pnl;
      const pnlRate = costBasis > 0 ? pnl / costBasis : null;
      unrealizedPnlKrw += pnl;
      positions.push({
        accountId: row.accountId,
        accountName: row.account.displayName,
        broker: row.account.connection.broker,
        snapshotDate: rowSnapshotDate,
        asOf: row.asOf.toISOString(),
        symbol: position.symbol,
        name: position.name,
        market: position.market,
        currency: position.currency,
        quantity: num(position.quantity),
        avgCost: position.avgCost == null ? null : num(position.avgCost),
        lastPrice: position.lastPrice == null ? null : num(position.lastPrice),
        marketValue: num(position.marketValue),
        marketValueKrw: roundWon(marketValue),
        unrealizedPnlKrw: roundWon(pnl),
        pnlRate,
        fxRateToKrw: position.fxRateToKrw == null ? null : num(position.fxRateToKrw),
      });
      if (!topPosition || pnl > topPosition.pnlKrw) {
        topPosition = {
          symbol: position.symbol,
          name: position.name,
          pnlKrw: roundWon(pnl),
          pnlRate,
        };
      }
    }
  }

  return {
    totalKrw: roundWon(totalKrw),
    unrealizedPnlKrw: roundWon(unrealizedPnlKrw),
    snapshotDate,
    snapshotDateCount: snapshotDates.size,
    accounts: accounts.sort((a, b) => b.totalEquityKrw - a.totalEquityKrw),
    topPosition,
    positions: positions.sort((a, b) => b.marketValueKrw - a.marketValueKrw),
  };
}

async function getInvestmentDailyBalances(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<MonthlyInvestmentDailyBalance[]> {
  const rows = await prisma.brokerageSnapshot.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      account: { connection: { userId, deletedAt: null } },
    },
    orderBy: [{ date: 'asc' }, { accountId: 'asc' }],
    select: {
      date: true,
      cashKrw: true,
      totalEquityKrw: true,
      positionsValueKrw: true,
      account: {
        select: {
          connection: {
            select: {
              broker: true,
            },
          },
        },
      },
    },
  });

  const byDateAndBroker = new Map<string, InvestmentDailyBalanceAccumulator>();
  for (const row of rows) {
    const date = dateKey(row.date);
    const broker = row.account.connection.broker;
    const key = `${date}:${broker}`;
    const current = byDateAndBroker.get(key) ?? {
      date,
      broker,
      cashKrw: 0,
      positionsValueKrw: 0,
      totalEquityKrw: 0,
    };
    current.cashKrw += num(row.cashKrw);
    current.positionsValueKrw += num(row.positionsValueKrw);
    current.totalEquityKrw += num(row.totalEquityKrw);
    byDateAndBroker.set(key, current);
  }

  return Array.from(byDateAndBroker.values())
    .map((row) => ({
      ...row,
      cashKrw: roundWon(row.cashKrw),
      positionsValueKrw: roundWon(row.positionsValueKrw),
      totalEquityKrw: roundWon(row.totalEquityKrw),
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.broker.localeCompare(b.broker));
}

async function getMonthlyFlow(userId: string, monthKey: Date) {
  const { year, month } = ymFromMonthKey(monthKey);
  const { startDate, endDate } = getMonthRangeKST(year, month);
  const [incomeAgg, expenseAgg, savingsAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, deletedAt: null, date: { gte: startDate, lte: endDate }, type: 'INCOME' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
        type: 'EXPENSE',
        savingsGoalId: null,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, deletedAt: null, date: { gte: startDate, lte: endDate }, savingsGoalId: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  return {
    income: incomeAgg._sum.amount ?? 0,
    expense: expenseAgg._sum.amount ?? 0,
    savings: savingsAgg._sum.amount ?? 0,
    startDate,
    endDate,
  };
}

async function getDailyExpenseAmounts(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Map<string, number>> {
  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      date: { gte: startDate, lte: endDate },
      type: 'EXPENSE',
      savingsGoalId: null,
    },
    select: {
      date: true,
      amount: true,
    },
    orderBy: { date: 'asc' },
  });

  const amountByDate = new Map<string, number>();
  for (const row of rows) {
    const key = kstDateKey(row.date);
    amountByDate.set(key, (amountByDate.get(key) ?? 0) + row.amount);
  }
  return amountByDate;
}

function buildDailyExpenses(
  year: number,
  month: number,
  amountByDate: Map<string, number>,
  budgetKrw: number
): MonthlyDailyExpense[] {
  const days = new Date(year, month, 0).getDate();
  let cumulativeAmount = 0;
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const amount = roundWon(amountByDate.get(date) ?? 0);
    cumulativeAmount += amount;
    return {
      date,
      day,
      amount,
      cumulativeAmount: roundWon(cumulativeAmount),
      budgetPaceKrw: budgetKrw > 0 ? roundWon((budgetKrw / days) * day) : null,
    };
  });
}

async function computeSnapshot(
  userId: string,
  monthKey: Date,
  investmentChangeKrw: number | null = null,
  sourceStatus = 'computed'
): Promise<MonthlyAssetSnapshotData> {
  const { year, month } = ymFromMonthKey(monthKey);
  const monthEnd = kstMonthEndUTC(year, month);
  const [cash, savings, other, investment, flow] = await Promise.all([
    getCashAt(userId, monthEnd),
    getSavingsTotalAt(userId, monthEnd),
    getOtherAssetsAt(userId, monthKey),
    getInvestmentAt(userId, monthEnd),
    getMonthlyFlow(userId, monthKey),
  ]);

  const cashKrw = roundWon(cash);
  const savingsKrw = roundWon(savings);
  const otherKrw = roundWon(other);
  const investmentKrw = roundWon(investment.totalKrw);
  const totalAssetKrw = cashKrw + investmentKrw + savingsKrw + otherKrw;

  return {
    month: formatMonthKey(monthKey),
    totalAssetKrw,
    cashKrw,
    investmentKrw,
    savingsKrw,
    otherKrw,
    cashRatio: ratio(cashKrw, totalAssetKrw),
    investmentRatio: ratio(investmentKrw, totalAssetKrw),
    savingsRatio: ratio(savingsKrw, totalAssetKrw),
    otherRatio: ratio(otherKrw, totalAssetKrw),
    monthlyIncomeKrw: roundWon(flow.income),
    monthlyExpenseKrw: roundWon(flow.expense),
    monthlySavingsKrw: roundWon(flow.savings),
    investmentPnlKrw: roundWon(investment.unrealizedPnlKrw),
    investmentChangeKrw,
    sourceStatus,
    stored: false,
  };
}

function snapshotFromRow(row: {
  month: Date;
  totalAssetKrw: number;
  cashKrw: number;
  investmentKrw: number;
  savingsKrw: number;
  otherKrw: number;
  cashRatio: number;
  investmentRatio: number;
  savingsRatio: number;
  otherRatio: number;
  monthlyIncomeKrw: number;
  monthlyExpenseKrw: number;
  monthlySavingsKrw: number;
  investmentPnlKrw: number;
  investmentChangeKrw: number | null;
  sourceStatus: string;
}): MonthlyAssetSnapshotData {
  return {
    month: formatMonthKey(row.month),
    totalAssetKrw: roundWon(row.totalAssetKrw),
    cashKrw: roundWon(row.cashKrw),
    investmentKrw: roundWon(row.investmentKrw),
    savingsKrw: roundWon(row.savingsKrw),
    otherKrw: roundWon(row.otherKrw),
    cashRatio: row.cashRatio,
    investmentRatio: row.investmentRatio,
    savingsRatio: row.savingsRatio,
    otherRatio: row.otherRatio,
    monthlyIncomeKrw: roundWon(row.monthlyIncomeKrw),
    monthlyExpenseKrw: roundWon(row.monthlyExpenseKrw),
    monthlySavingsKrw: roundWon(row.monthlySavingsKrw),
    investmentPnlKrw: roundWon(row.investmentPnlKrw),
    investmentChangeKrw: row.investmentChangeKrw == null ? null : roundWon(row.investmentChangeKrw),
    sourceStatus: row.sourceStatus,
    stored: true,
  };
}

export async function upsertMonthlyAssetSnapshot(
  userId: string,
  monthKey: Date,
  sourceStatus = 'manual'
): Promise<MonthlyAssetSnapshotData> {
  const prevMonthKey = previousMonth(monthKey);
  const prevYm = ymFromMonthKey(prevMonthKey);
  const currentYm = ymFromMonthKey(monthKey);
  const prevInvestment = await getInvestmentAt(userId, kstMonthEndUTC(prevYm.year, prevYm.month));
  const currentInvestment = await getInvestmentAt(userId, kstMonthEndUTC(currentYm.year, currentYm.month));
  const investmentChangeKrw = currentInvestment.totalKrw - prevInvestment.totalKrw;
  const computed = await computeSnapshot(userId, monthKey, investmentChangeKrw, sourceStatus);

  const row = await prisma.monthlyAssetSnapshot.upsert({
    where: { userId_month: { userId, month: monthKey } },
    update: {
      totalAssetKrw: computed.totalAssetKrw,
      cashKrw: computed.cashKrw,
      investmentKrw: computed.investmentKrw,
      savingsKrw: computed.savingsKrw,
      otherKrw: computed.otherKrw,
      cashRatio: computed.cashRatio,
      investmentRatio: computed.investmentRatio,
      savingsRatio: computed.savingsRatio,
      otherRatio: computed.otherRatio,
      monthlyIncomeKrw: computed.monthlyIncomeKrw,
      monthlyExpenseKrw: computed.monthlyExpenseKrw,
      monthlySavingsKrw: computed.monthlySavingsKrw,
      investmentPnlKrw: computed.investmentPnlKrw,
      investmentChangeKrw: computed.investmentChangeKrw,
      sourceStatus,
    },
    create: {
      userId,
      month: monthKey,
      totalAssetKrw: computed.totalAssetKrw,
      cashKrw: computed.cashKrw,
      investmentKrw: computed.investmentKrw,
      savingsKrw: computed.savingsKrw,
      otherKrw: computed.otherKrw,
      cashRatio: computed.cashRatio,
      investmentRatio: computed.investmentRatio,
      savingsRatio: computed.savingsRatio,
      otherRatio: computed.otherRatio,
      monthlyIncomeKrw: computed.monthlyIncomeKrw,
      monthlyExpenseKrw: computed.monthlyExpenseKrw,
      monthlySavingsKrw: computed.monthlySavingsKrw,
      investmentPnlKrw: computed.investmentPnlKrw,
      investmentChangeKrw: computed.investmentChangeKrw,
      sourceStatus,
    },
  });

  return snapshotFromRow(row);
}

export async function getMonthlyAssetReport(
  userId: string,
  endMonthKey: Date,
  range = DEFAULT_RANGE
): Promise<MonthlyAssetReport> {
  const safeRange = Math.min(Math.max(range, 1), MAX_RANGE);
  const monthKeys = buildMonthWindow(endMonthKey, safeRange);
  const storedRows = await prisma.monthlyAssetSnapshot.findMany({
    where: { userId, month: { in: monthKeys } },
  });
  const storedByMonth = new Map(storedRows.map((row) => [formatMonthKey(row.month), snapshotFromRow(row)]));

  const snapshots = await Promise.all(
    monthKeys.map(async (monthKey) => {
      const key = formatMonthKey(monthKey);
      return storedByMonth.get(key) ?? computeSnapshot(userId, monthKey);
    })
  );

  for (let i = 0; i < snapshots.length; i++) {
    if (snapshots[i].investmentChangeKrw != null) continue;
    snapshots[i].investmentChangeKrw = i > 0 ? snapshots[i].investmentKrw - snapshots[i - 1].investmentKrw : null;
  }

  const current = snapshots[snapshots.length - 1];
  const previous = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const detail = await getCurrentMonthReportDetail(userId, endMonthKey, current, previous);

  return {
    months: snapshots.map((snapshot) => snapshot.month),
    snapshots,
    current: {
      ...current,
      previousTotalAssetKrw: previous?.totalAssetKrw ?? null,
      totalMomDelta: previous ? current.totalAssetKrw - previous.totalAssetKrw : null,
      totalMomPercent: previous ? percentDelta(current.totalAssetKrw, previous.totalAssetKrw) : null,
    },
    report: detail,
  };
}

async function getCurrentMonthReportDetail(
  userId: string,
  monthKey: Date,
  current: MonthlyAssetSnapshotData,
  previous: MonthlyAssetSnapshotData | null
): Promise<MonthlyAssetReport['report']> {
  const { year, month } = ymFromMonthKey(monthKey);
  const { startDate, endDate } = getMonthRangeKST(year, month);
  const previousExpense = previous?.monthlyExpenseKrw ?? 0;

  const [
    investment,
    dailyBalances,
    dailyExpenseAmounts,
    recentExpenseRows,
    categories,
    expenseRows,
    budgets,
    savingsGoals,
    savingsDepositRows,
  ] = await Promise.all([
    getInvestmentAt(userId, kstMonthEndUTC(year, month)),
    getInvestmentDailyBalances(userId, startDate, endDate),
    getDailyExpenseAmounts(userId, startDate, endDate),
    prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
        type: 'EXPENSE',
        savingsGoalId: null,
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      select: {
        id: true,
        date: true,
        description: true,
        amount: true,
        category: {
          select: {
            name: true,
            color: true,
          },
        },
      },
    }),
    prisma.category.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, name: true, color: true, defaultBudget: true },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
        type: 'EXPENSE',
        savingsGoalId: null,
        categoryId: { not: null },
      },
      _sum: { amount: true },
    }),
    prisma.budget.findMany({
      where: {
        userId,
        deletedAt: null,
        month: {
          gte: startDate,
          lt: new Date(endDate.getTime() + 1),
        },
      },
      select: { categoryId: true, amount: true },
    }),
    prisma.savingsGoal.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        currentAmount: true,
        targetAmount: true,
        targetYear: true,
        targetMonth: true,
        isPrimary: true,
      },
    }),
    prisma.transaction.groupBy({
      by: ['savingsGoalId'],
      where: {
        userId,
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
        savingsGoalId: { not: null },
      },
      _sum: { amount: true },
    }),
  ]);

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const budgetByCategory = new Map(budgets.map((budget) => [budget.categoryId, budget.amount]));
  const totalBudgetRow = budgets.find((budget) => budget.categoryId == null);
  const totalBudget = totalBudgetRow?.amount ?? budgets.reduce((sum, budget) => sum + budget.amount, 0);
  const dailyExpenses = buildDailyExpenses(year, month, dailyExpenseAmounts, totalBudget);
  const averageExpense = await getRecentAverageMonthlyExpense(userId, monthKey, 3);
  const depositByGoal = new Map(
    savingsDepositRows
      .filter((row) => row.savingsGoalId != null)
      .map((row) => [row.savingsGoalId!, roundWon(row._sum.amount ?? 0)])
  );
  const savingsGoalReports = savingsGoals.map((goal) => ({
    id: goal.id,
    name: goal.name,
    currentAmount: roundWon(goal.currentAmount),
    targetAmount: roundWon(goal.targetAmount),
    targetYear: goal.targetYear,
    targetMonth: goal.targetMonth,
    isPrimary: goal.isPrimary,
    progressPercent:
      goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0,
    monthlyDepositKrw: depositByGoal.get(goal.id) ?? 0,
  }));
  const primaryGoal = savingsGoalReports.find((goal) => goal.isPrimary) ?? savingsGoalReports[0] ?? null;

  const topExpenseCategories = expenseRows
    .map((row) => {
      const categoryId = row.categoryId!;
      const category = categoryMap.get(categoryId);
      if (!category) return null;
      const amount = roundWon(row._sum.amount ?? 0);
      const budget = budgetByCategory.get(categoryId) ?? category.defaultBudget ?? null;
      return {
        categoryId,
        name: category.name,
        color: category.color,
        amount,
        budgetKrw: budget,
        usedPercent: budget && budget > 0 ? Math.min(999, Math.round((amount / budget) * 100)) : null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
  const recentExpenses = recentExpenseRows.map((row) => ({
    id: row.id,
    date: kstDateKey(row.date),
    description: row.description,
    amount: roundWon(row.amount),
    categoryName: row.category?.name ?? '미분류',
    categoryColor: row.category?.color ?? null,
  }));

  return {
    expenseBudgetKrw: roundWon(totalBudget),
    expenseBudgetUsedPercent: totalBudget > 0 ? Math.round((current.monthlyExpenseKrw / totalBudget) * 100) : null,
    expenseMomPercent: previous ? percentDelta(current.monthlyExpenseKrw, previousExpense) : null,
    savingsRate: current.monthlyIncomeKrw > 0 ? Number(((current.monthlySavingsKrw / current.monthlyIncomeKrw) * 100).toFixed(1)) : null,
    emergencyMonths: averageExpense > 0 ? Number((current.cashKrw / averageExpense).toFixed(1)) : null,
    dailyExpenses,
    recentExpenses,
    topExpenseCategories,
    primarySavingsGoal: primaryGoal,
    savingsGoals: savingsGoalReports,
    investment: {
      totalKrw: current.investmentKrw,
      monthlyChangeKrw: current.investmentChangeKrw,
      unrealizedPnlKrw: current.investmentPnlKrw,
      snapshotDate: investment.snapshotDate,
      snapshotDateCount: investment.snapshotDateCount,
      accounts: investment.accounts,
      dailyBalances,
      topPosition: investment.topPosition,
      positions: investment.positions,
    },
  };
}

async function getRecentAverageMonthlyExpense(userId: string, endMonthKey: Date, count: number): Promise<number> {
  const monthKeys = buildMonthWindow(endMonthKey, count);
  const expenses = await Promise.all(monthKeys.map((monthKey) => getMonthlyFlow(userId, monthKey)));
  const nonZero = expenses.map((flow) => flow.expense).filter((expense) => expense > 0);
  if (nonZero.length === 0) return 0;
  return nonZero.reduce((sum, expense) => sum + expense, 0) / nonZero.length;
}

export function normalizeRange(rangeStr: string | null): number {
  const parsed = rangeStr ? parseInt(rangeStr, 10) : DEFAULT_RANGE;
  if (!Number.isFinite(parsed)) return DEFAULT_RANGE;
  return Math.min(Math.max(parsed, 1), MAX_RANGE);
}
