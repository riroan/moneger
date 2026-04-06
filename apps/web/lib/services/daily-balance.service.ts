import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import {
  getMonthRangeKST,
  getDaysInMonth,
  getKSTDay,
  getLastNDaysRange,
  KST_OFFSET_MS,
  toKST,
  getKSTDayRangeUTC,
} from '@/lib/date-utils';

type TransactionClient = Prisma.TransactionClient;

// Prisma 클라이언트 인터페이스 (prisma 또는 트랜잭션 클라이언트 공통)
type DbClient = {
  dailyBalance: Pick<TransactionClient['dailyBalance'], 'findUnique' | 'upsert'>;
  transaction: Pick<TransactionClient['transaction'], 'aggregate'>;
};

/**
 * 일별 잔액 계산 및 upsert (공통 헬퍼)
 * 트랜잭션 클라이언트와 독립 클라이언트 모두 지원
 */
async function computeAndUpsertDailyBalance(
  client: DbClient,
  userId: string,
  date: Date
): Promise<{ dateForDB: Date; balance: number; savings: number }> {
  const { startOfDay, endOfDay, dateForDB } = getKSTDayRangeUTC(date);

  const kstDate = toKST(date);
  const previousDateForDB = new Date(Date.UTC(
    kstDate.getUTCFullYear(),
    kstDate.getUTCMonth(),
    kstDate.getUTCDate() - 1
  ));

  const [previousBalance, dayIncomeAgg, dayExpenseAgg, daySavingsAgg] = await Promise.all([
    client.dailyBalance.findUnique({
      where: { userId_date: { userId, date: previousDateForDB } },
      select: { balance: true },
    }),
    client.transaction.aggregate({
      where: { userId, date: { gte: startOfDay, lte: endOfDay }, type: 'INCOME', deletedAt: null, savingsGoalId: null },
      _sum: { amount: true },
    }),
    client.transaction.aggregate({
      where: { userId, date: { gte: startOfDay, lte: endOfDay }, type: 'EXPENSE', deletedAt: null, savingsGoalId: null },
      _sum: { amount: true },
    }),
    client.transaction.aggregate({
      where: { userId, date: { gte: startOfDay, lte: endOfDay }, deletedAt: null, savingsGoalId: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const prevBalance = previousBalance?.balance || 0;
  const income = dayIncomeAgg._sum.amount || 0;
  const expense = dayExpenseAgg._sum.amount || 0;
  const savings = daySavingsAgg._sum.amount || 0;
  const balance = prevBalance + income - expense - savings;

  await client.dailyBalance.upsert({
    where: { userId_date: { userId, date: dateForDB } },
    update: { balance, income, expense, savings },
    create: { userId, date: dateForDB, balance, income, expense, savings },
  });

  return { dateForDB, balance, savings };
}

/**
 * 일별 잔액 업데이트 (Prisma 트랜잭션 내에서 사용)
 */
export async function updateDailyBalanceInTransaction(
  tx: TransactionClient,
  userId: string,
  date: Date
): Promise<void> {
  await computeAndUpsertDailyBalance(tx, userId, date);
}

/**
 * 일별 잔액 업데이트 (독립적 호출용)
 */
export async function updateDailyBalance(userId: string, date: Date): Promise<void> {
  try {
    const { dateForDB, balance, savings } = await computeAndUpsertDailyBalance(prisma, userId, date);
    logger.debug(`Daily balance updated for ${dateForDB.toISOString().split('T')[0]}`, { balance, savings });
  } catch (error) {
    logger.error('Failed to update daily balance', error);
    throw error;
  }
}

/**
 * 일별 잔액 저장/업데이트
 */
export async function saveDailyBalance(
  userId: string,
  date: Date,
  balance: number,
  income: number,
  expense: number,
  savings: number = 0
) {
  return prisma.dailyBalance.upsert({
    where: { userId_date: { userId, date } },
    update: { balance, income, expense, savings },
    create: { userId, date, balance, income, expense, savings },
  });
}

/**
 * 최근 N일 일별 잔액 조회 (KST 기준)
 */
export async function getRecentDailyBalances(userId: string, days: number) {
  const kstNow = toKST(new Date());
  const kstYear = kstNow.getUTCFullYear();
  const kstMonth = kstNow.getUTCMonth();
  const kstDay = kstNow.getUTCDate();

  const startDate = new Date(Date.UTC(kstYear, kstMonth, kstDay - days + 1));
  const endDate = new Date(Date.UTC(kstYear, kstMonth, kstDay));

  return prisma.dailyBalance.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });
}

/**
 * 특정 월의 일별 잔액 조회
 */
export async function getMonthlyDailyBalances(userId: string, year: number, month: number) {
  return calculateMonthlyDailyBalancesFromTransactions(userId, year, month);
}

/**
 * 집계 결과를 일별 데이터에 매핑하는 헬퍼
 */
function mapGroupedToDaily(
  grouped: { date: Date; _sum: { amount: number | null } }[],
  dailyData: { [day: number]: { income: number; expense: number; savings: number } },
  field: 'income' | 'expense' | 'savings'
) {
  grouped.forEach((item) => {
    const day = getKSTDay(new Date(item.date));
    if (dailyData[day]) {
      dailyData[day][field] += item._sum.amount || 0;
    }
  });
}

/**
 * 거래 데이터로부터 특정 월의 일별 잔액 계산
 * 최적화: 6개 쿼리 → 4개 쿼리 (이전 잔액 type별 groupBy 1개 + 이전 저축 1개 + 당월 date+type별 groupBy 1개 + 당월 저축 1개)
 */
async function calculateMonthlyDailyBalancesFromTransactions(userId: string, year: number, month: number) {
  const { startDate, endDate } = getMonthRangeKST(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  const [previousByType, previousSavingsAgg, currentByDateType, savingsGrouped] = await Promise.all([
    // 이전 달까지 type별 합계 (2개 aggregate → 1개 groupBy)
    prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, date: { lt: startDate }, savingsGoalId: null, deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, date: { lt: startDate }, savingsGoalId: { not: null }, deletedAt: null },
      _sum: { amount: true },
    }),
    // 당월 date+type별 합계 (2개 groupBy → 1개 groupBy)
    prisma.transaction.groupBy({
      by: ['date', 'type'],
      where: { userId, date: { gte: startDate, lte: endDate }, deletedAt: null, savingsGoalId: null },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['date'],
      where: { userId, date: { gte: startDate, lte: endDate }, deletedAt: null, savingsGoalId: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const prevIncome = previousByType.find(g => g.type === 'INCOME')?._sum.amount || 0;
  const prevExpense = previousByType.find(g => g.type === 'EXPENSE')?._sum.amount || 0;
  const prevSavings = previousSavingsAgg._sum.amount || 0;
  const initialBalance = prevIncome - prevExpense - prevSavings;

  // 일별 데이터 초기화
  const dailyData: { [day: number]: { income: number; expense: number; savings: number } } = {};
  for (let day = 1; day <= daysInMonth; day++) {
    dailyData[day] = { income: 0, expense: 0, savings: 0 };
  }

  // 당월 수입/지출 매핑
  currentByDateType.forEach((item) => {
    const day = getKSTDay(new Date(item.date));
    if (!dailyData[day]) return;
    if (item.type === 'INCOME') {
      dailyData[day].income += item._sum.amount || 0;
    } else {
      dailyData[day].expense += item._sum.amount || 0;
    }
  });

  // 당월 저축 매핑
  mapGroupedToDaily(savingsGrouped, dailyData, 'savings');

  // 누적 잔액 계산
  const result: { date: Date; income: number; expense: number; savings: number; balance: number }[] = [];
  let cumulativeBalance = initialBalance;

  for (let day = 1; day <= daysInMonth; day++) {
    const { income, expense, savings } = dailyData[day];
    cumulativeBalance += income - expense - savings;
    result.push({
      date: new Date(year, month - 1, day),
      income,
      expense,
      savings,
      balance: cumulativeBalance,
    });
  }

  return result;
}

/**
 * 거래 데이터로부터 일별 잔액 계산 (KST 기준, 최근 N일)
 */
export async function calculateDailyBalancesFromTransactions(userId: string, days: number) {
  const { startDate, endDate } = getLastNDaysRange(days);

  const kstNow = toKST(new Date());
  const previousDay = new Date(Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate() - days
  ));

  const [transactions, previousDailyBalance] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: startDate, lte: endDate }, deletedAt: null },
      orderBy: { date: 'asc' },
    }),
    prisma.dailyBalance.findUnique({
      where: { userId_date: { userId, date: previousDay } },
      select: { balance: true },
    }),
  ]);

  const previousBalance = previousDailyBalance?.balance || 0;

  // 일별 데이터 초기화 (KST 기준)
  const dailyData: { [key: string]: { income: number; expense: number; savings: number } } = {};

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate() - i));
    const dateKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    dailyData[dateKey] = { income: 0, expense: 0, savings: 0 };
  }

  // 거래 데이터 → 일별 매핑
  transactions.forEach((transaction) => {
    const kstDate = new Date(new Date(transaction.date).getTime() + KST_OFFSET_MS);
    const dateKey = `${kstDate.getUTCFullYear()}-${String(kstDate.getUTCMonth() + 1).padStart(2, '0')}-${String(kstDate.getUTCDate()).padStart(2, '0')}`;
    if (dailyData[dateKey]) {
      if (transaction.savingsGoalId) {
        dailyData[dateKey].savings += transaction.amount;
      } else if (transaction.type === 'INCOME') {
        dailyData[dateKey].income += transaction.amount;
      } else {
        dailyData[dateKey].expense += transaction.amount;
      }
    }
  });

  // 누적 잔액 계산
  let cumulativeBalance = previousBalance;
  return Object.keys(dailyData)
    .sort()
    .map((dateKey) => {
      const { income, expense, savings } = dailyData[dateKey];
      cumulativeBalance += income - expense - savings;
      return {
        date: new Date(dateKey),
        balance: cumulativeBalance,
        income,
        expense,
        savings,
      };
    });
}
