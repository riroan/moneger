import { prisma } from '@/lib/prisma';
import { getKSTDateParts, getMonthRangeKST } from '@/lib/date-utils';
import { calculateEffectiveMonthlyBudget } from './budget-calculation';
import {
  buildMonthWindow,
  formatMonthKey,
  kstMonthEndUTC,
  kstMonthKey,
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
  savingsGoalId: string | null;
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
  // 증권 계좌 연결(원금 vs 평가액). 연결 계좌 ids, 평가액 = Σ 연결계좌 totalEquityKrw,
  // 손익 = 평가액 − 원금. 연결됐지만 유효 스냅샷이 없으면 marketValueKrw/pnlKrw = null
  // (동기화 중 상태). 미연결이면 linkedAccountIds = [], 둘 다 null.
  linkedAccountIds: string[];
  marketValueKrw: number | null;
  pnlKrw: number | null;
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
    expenseCategories: Array<{
      categoryId: string;
      name: string;
      color: string | null;
      amount: number;
      budgetKrw: number | null;
      usedPercent: number | null;
    }>;
    topExpenseCategories?: Array<{
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

interface MonthlyAssetReportOptions {
  detail?: 'full' | 'summary';
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

// 메인 대시보드의 "잔액"과 동일: 월말까지 누적 수입 − 누적 소비(저축 제외) − 누적 저축 이체
async function getCashAt(userId: string, monthEnd: Date): Promise<number> {
  const [incomeAgg, expenseAgg, savingsAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, deletedAt: null, date: { lte: monthEnd }, type: 'INCOME' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, deletedAt: null, date: { lte: monthEnd }, type: 'EXPENSE', savingsGoalId: null },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, deletedAt: null, date: { lte: monthEnd }, savingsGoalId: { not: null } },
      _sum: { amount: true },
    }),
  ]);
  return (incomeAgg._sum.amount ?? 0) - (expenseAgg._sum.amount ?? 0) - (savingsAgg._sum.amount ?? 0);
}

// 저축 목표들의 currentAmount 합. 단, 증권 계좌에 연결되어 투자 평가액(investmentKrw)으로
// 이미 카운트되는 목표(excludedGoalIds)는 원금을 제외해 이중계상을 막는다.
// 연결됐지만 유효 스냅샷이 없는 목표는 excludedGoalIds에 없으므로 원금 fallback으로 합산된다.
async function getSavingsTotalAt(userId: string, excludedGoalIds: Set<string>): Promise<number> {
  const goals = await prisma.savingsGoal.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, currentAmount: true },
  });
  return goals.reduce(
    (sum, goal) => (excludedGoalIds.has(goal.id) ? sum : sum + goal.currentAmount),
    0
  );
}

// 연결된 저축 목표별 증권 평가액 집계.
//
//   BrokerageAccount.savingsGoalId ──┐ (1목표 ↔ N계좌)
//                                    ▼
//   goalId ──> { marketValueKrw = Σ 연결계좌 totalEquityKrw(>0), accountIds }
//
// 유효 스냅샷(totalEquityKrw > 0)이 있는 연결 계좌만 합산한다. 맵의 key(goalId)는
// savingsKrw 총합에서 제외해야 한다(평가액이 대신 카운트). 유효 스냅샷이 없으면 맵에
// 없음 → 그 목표는 원금(currentAmount)으로 fallback되어 돈이 사라지지 않는다.
function linkedGoalValuations(
  accounts: MonthlyInvestmentAccount[]
): Map<string, { marketValueKrw: number; accountIds: string[] }> {
  const byGoal = new Map<string, { marketValueKrw: number; accountIds: string[] }>();
  for (const account of accounts) {
    if (!account.savingsGoalId) continue;
    if (account.totalEquityKrw <= 0) continue; // 유효성: 0원/실패 스냅샷은 제외 트리거 안 함
    const entry = byGoal.get(account.savingsGoalId) ?? { marketValueKrw: 0, accountIds: [] };
    entry.marketValueKrw += account.totalEquityKrw;
    entry.accountIds.push(account.accountId);
    byGoal.set(account.savingsGoalId, entry);
  }
  return byGoal;
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
          savingsGoalId: true,
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
      savingsGoalId: row.account.savingsGoalId,
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

async function getRecurringExpenseAmountsByDay(userId: string, year: number, month: number): Promise<Map<number, number>> {
  const days = new Date(year, month, 0).getDate();
  const monthEnd = kstMonthEndUTC(year, month);
  const rows = await prisma.recurringExpense.findMany({
    where: {
      userId,
      deletedAt: null,
      isActive: true,
      type: 'EXPENSE',
      createdAt: { lte: monthEnd },
    },
    select: {
      amount: true,
      dayOfMonth: true,
      createdAt: true,
    },
  });

  const amountByDay = new Map<number, number>();
  for (const row of rows) {
    const day = Math.min(Math.max(row.dayOfMonth, 1), days);
    const created = getKSTDateParts(row.createdAt);
    if (created.year === year && created.month === month && created.day > day) continue;
    amountByDay.set(day, (amountByDay.get(day) ?? 0) + row.amount);
  }
  return amountByDay;
}

function buildDailyExpenses(
  year: number,
  month: number,
  amountByDate: Map<string, number>,
  budgetKrw: number,
  fixedExpenseByDay: Map<number, number>
): MonthlyDailyExpense[] {
  const days = new Date(year, month, 0).getDate();
  const fixedExpenseTotal = Array.from(fixedExpenseByDay.values()).reduce((sum, amount) => sum + amount, 0);
  const variableBudget = Math.max(budgetKrw - fixedExpenseTotal, 0);
  let cumulativeAmount = 0;
  let fixedCumulativeAmount = 0;
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const amount = roundWon(amountByDate.get(date) ?? 0);
    cumulativeAmount += amount;
    fixedCumulativeAmount += fixedExpenseByDay.get(day) ?? 0;
    const variablePace = budgetKrw > 0 ? (variableBudget / days) * day : 0;
    return {
      date,
      day,
      amount,
      cumulativeAmount: roundWon(cumulativeAmount),
      budgetPaceKrw: budgetKrw > 0 ? roundWon(fixedCumulativeAmount + variablePace) : null,
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
  const [cash, other, investment, flow] = await Promise.all([
    getCashAt(userId, monthEnd),
    getOtherAssetsAt(userId, monthKey),
    getInvestmentAt(userId, monthEnd),
    getMonthlyFlow(userId, monthKey),
  ]);
  // 투자 평가액으로 카운트되는 연결 목표는 savings 총합에서 제외(이중계상 방지).
  const excludedGoalIds = new Set(linkedGoalValuations(investment.accounts).keys());
  const savings = await getSavingsTotalAt(userId, excludedGoalIds);

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
  range = DEFAULT_RANGE,
  options: MonthlyAssetReportOptions = {}
): Promise<MonthlyAssetReport> {
  const safeRange = Math.min(Math.max(range, 1), MAX_RANGE);
  const monthKeys = buildMonthWindow(endMonthKey, safeRange);
  const storedRows = await prisma.monthlyAssetSnapshot.findMany({
    where: { userId, month: { in: monthKeys } },
  });
  const storedByMonth = new Map(storedRows.map((row) => [formatMonthKey(row.month), snapshotFromRow(row)]));

  // 진행 중인 이번 달은 항상 실시간 계산한다. 스냅샷은 월말(KST)에 cron이 freeze 하는 "완료된 달"의 값이므로,
  // 이번 달 행이 (수동 저장 등으로) 남아 있어도 무시하고 현재 현금/저축/투자 값을 그대로 반영한다.
  const currentMonthKey = formatMonthKey(kstMonthKey(new Date()));

  const snapshots = await Promise.all(
    monthKeys.map(async (monthKey) => {
      const key = formatMonthKey(monthKey);
      if (key === currentMonthKey) return computeSnapshot(userId, monthKey);
      return storedByMonth.get(key) ?? computeSnapshot(userId, monthKey);
    })
  );

  for (let i = 0; i < snapshots.length; i++) {
    if (snapshots[i].investmentChangeKrw != null) continue;
    snapshots[i].investmentChangeKrw = i > 0 ? snapshots[i].investmentKrw - snapshots[i - 1].investmentKrw : null;
  }

  const current = snapshots[snapshots.length - 1];
  const previous = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const detail =
    options.detail === 'summary'
      ? await getCurrentMonthReportSummary(userId, endMonthKey, current, previous)
      : await getCurrentMonthReportDetail(userId, endMonthKey, current, previous);

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

async function getCurrentMonthReportSummary(
  userId: string,
  monthKey: Date,
  current: MonthlyAssetSnapshotData,
  previous: MonthlyAssetSnapshotData | null
): Promise<MonthlyAssetReport['report']> {
  const { year, month } = ymFromMonthKey(monthKey);
  const { startDate, endDate } = getMonthRangeKST(year, month);
  const previousExpense = previous?.monthlyExpenseKrw ?? 0;

  const [categories, budgets, userBudgetSetting, averageExpense] = await Promise.all([
    prisma.category.findMany({
      where: { userId, deletedAt: null, type: 'EXPENSE' },
      select: { id: true, defaultBudget: true },
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
    prisma.user.findUnique({
      where: { id: userId },
      select: { defaultExpenseBudget: true },
    }),
    getRecentAverageMonthlyExpense(userId, monthKey, 3),
  ]);

  const totalBudget = calculateEffectiveMonthlyBudget(categories, budgets, userBudgetSetting?.defaultExpenseBudget);

  return {
    expenseBudgetKrw: roundWon(totalBudget),
    expenseBudgetUsedPercent: totalBudget > 0 ? Math.round((current.monthlyExpenseKrw / totalBudget) * 100) : null,
    expenseMomPercent: previous ? percentDelta(current.monthlyExpenseKrw, previousExpense) : null,
    savingsRate: current.monthlyIncomeKrw > 0 ? Number(((current.monthlySavingsKrw / current.monthlyIncomeKrw) * 100).toFixed(1)) : null,
    emergencyMonths: averageExpense > 0 ? Number((current.cashKrw / averageExpense).toFixed(1)) : null,
    dailyExpenses: [],
    recentExpenses: [],
    expenseCategories: [],
    topExpenseCategories: [],
    primarySavingsGoal: null,
    savingsGoals: [],
    investment: {
      totalKrw: current.investmentKrw,
      monthlyChangeKrw: current.investmentChangeKrw,
      unrealizedPnlKrw: current.investmentPnlKrw,
      snapshotDate: null,
      snapshotDateCount: 0,
      accounts: [],
      dailyBalances: [],
      topPosition: null,
      positions: [],
    },
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
    fixedExpenseByDay,
    recentExpenseRows,
    categories,
    expenseRows,
    budgets,
    userBudgetSetting,
    savingsGoals,
    savingsDepositRows,
  ] = await Promise.all([
    getInvestmentAt(userId, kstMonthEndUTC(year, month)),
    getInvestmentDailyBalances(userId, startDate, endDate),
    getDailyExpenseAmounts(userId, startDate, endDate),
    getRecurringExpenseAmountsByDay(userId, year, month),
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
      where: { userId, deletedAt: null, type: 'EXPENSE' },
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
    prisma.user.findUnique({
      where: { id: userId },
      select: { defaultExpenseBudget: true },
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
        brokerageAccounts: { select: { id: true } },
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
  const totalBudget = calculateEffectiveMonthlyBudget(categories, budgets, userBudgetSetting?.defaultExpenseBudget);
  const dailyExpenses = buildDailyExpenses(year, month, dailyExpenseAmounts, totalBudget, fixedExpenseByDay);
  const averageExpense = await getRecentAverageMonthlyExpense(userId, monthKey, 3);
  const depositByGoal = new Map(
    savingsDepositRows
      .filter((row) => row.savingsGoalId != null)
      .map((row) => [row.savingsGoalId!, roundWon(row._sum.amount ?? 0)])
  );
  // 연결 목표 평가액: 유효 스냅샷이 있는 연결 계좌만. 연결됐지만 유효 스냅샷 없으면
  // marketValueKrw=null(동기화 중)로 두어 UI가 원금만 표시한다.
  const goalValuations = linkedGoalValuations(investment.accounts);
  const savingsGoalReports = savingsGoals.map((goal) => {
    const currentAmount = roundWon(goal.currentAmount);
    const linkedAccountIds = goal.brokerageAccounts.map((account) => account.id);
    const valuation = goalValuations.get(goal.id);
    const marketValueKrw = valuation ? roundWon(valuation.marketValueKrw) : null;
    const pnlKrw = marketValueKrw != null ? marketValueKrw - currentAmount : null;
    return {
      id: goal.id,
      name: goal.name,
      currentAmount,
      targetAmount: roundWon(goal.targetAmount),
      targetYear: goal.targetYear,
      targetMonth: goal.targetMonth,
      isPrimary: goal.isPrimary,
      progressPercent:
        goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0,
      monthlyDepositKrw: depositByGoal.get(goal.id) ?? 0,
      linkedAccountIds,
      marketValueKrw,
      pnlKrw,
    };
  });
  const primaryGoal = savingsGoalReports.find((goal) => goal.isPrimary) ?? savingsGoalReports[0] ?? null;

  const expenseCategories = expenseRows
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
    .sort((a, b) => b.amount - a.amount);
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
    expenseCategories,
    topExpenseCategories: expenseCategories,
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
