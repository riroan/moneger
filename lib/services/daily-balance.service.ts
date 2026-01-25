import { prisma } from '@/lib/prisma';
import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

type TransactionClient = Prisma.TransactionClient;

/**
 * 한국 시간대(KST, UTC+9) 기준으로 날짜 추출
 */
function getKSTDay(date: Date): number {
  const KST_OFFSET = 9 * 60 * 60 * 1000; // 9시간을 밀리초로
  const kstDate = new Date(date.getTime() + KST_OFFSET);
  return kstDate.getUTCDate();
}

interface Transaction {
  type: 'INCOME' | 'EXPENSE';
  amount: number;
}

/**
 * 거래 목록에서 잔액 계산
 */
function calculateBalance(transactions: Transaction[]): number {
  return transactions.reduce((balance, tx) => {
    return tx.type === 'INCOME' ? balance + tx.amount : balance - tx.amount;
  }, 0);
}

/**
 * 거래 목록에서 일별 수입/지출 계산
 */
function calculateDailyStats(transactions: Transaction[]): { income: number; expense: number } {
  return transactions.reduce(
    (stats, tx) => {
      if (tx.type === 'INCOME') {
        stats.income += tx.amount;
      } else {
        stats.expense += tx.amount;
      }
      return stats;
    },
    { income: 0, expense: 0 }
  );
}

/**
 * 특정 날짜의 시작/끝 시간 반환
 */
function getDayBoundaries(date: Date): { startOfDay: Date; endOfDay: Date } {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
}

/**
 * 일별 잔액 업데이트 (Prisma 트랜잭션 내에서 사용) - DB 집계로 최적화
 */
export async function updateDailyBalanceInTransaction(
  tx: TransactionClient,
  userId: string,
  date: Date
): Promise<void> {
  const { startOfDay, endOfDay } = getDayBoundaries(date);

  // 병렬로 DB 집계 쿼리 실행
  const [incomeAgg, expenseAgg, dayIncomeAgg, dayExpenseAgg] = await Promise.all([
    // 누적 수입 합계
    tx.transaction.aggregate({
      where: { userId, date: { lte: endOfDay }, type: 'INCOME', deletedAt: null },
      _sum: { amount: true },
    }),
    // 누적 지출 합계
    tx.transaction.aggregate({
      where: { userId, date: { lte: endOfDay }, type: 'EXPENSE', deletedAt: null },
      _sum: { amount: true },
    }),
    // 당일 수입 합계
    tx.transaction.aggregate({
      where: { userId, date: { gte: startOfDay, lte: endOfDay }, type: 'INCOME', deletedAt: null },
      _sum: { amount: true },
    }),
    // 당일 지출 합계
    tx.transaction.aggregate({
      where: { userId, date: { gte: startOfDay, lte: endOfDay }, type: 'EXPENSE', deletedAt: null },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = incomeAgg._sum.amount || 0;
  const totalExpense = expenseAgg._sum.amount || 0;
  const balance = totalIncome - totalExpense;
  const income = dayIncomeAgg._sum.amount || 0;
  const expense = dayExpenseAgg._sum.amount || 0;

  await tx.dailyBalance.upsert({
    where: {
      userId_date: { userId, date: startOfDay },
    },
    update: { balance, income, expense },
    create: { userId, date: startOfDay, balance, income, expense },
  });
}

/**
 * 일별 잔액 업데이트 (독립적 호출용) - DB 집계로 최적화
 */
export async function updateDailyBalance(userId: string, date: Date): Promise<void> {
  try {
    const { startOfDay, endOfDay } = getDayBoundaries(date);

    // 병렬로 DB 집계 쿼리 실행
    const [incomeAgg, expenseAgg, dayIncomeAgg, dayExpenseAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, date: { lte: endOfDay }, type: 'INCOME', deletedAt: null },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, date: { lte: endOfDay }, type: 'EXPENSE', deletedAt: null },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, date: { gte: startOfDay, lte: endOfDay }, type: 'INCOME', deletedAt: null },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, date: { gte: startOfDay, lte: endOfDay }, type: 'EXPENSE', deletedAt: null },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = incomeAgg._sum.amount || 0;
    const totalExpense = expenseAgg._sum.amount || 0;
    const balance = totalIncome - totalExpense;
    const income = dayIncomeAgg._sum.amount || 0;
    const expense = dayExpenseAgg._sum.amount || 0;

    await prisma.dailyBalance.upsert({
      where: {
        userId_date: { userId, date: startOfDay },
      },
      update: { balance, income, expense },
      create: { userId, date: startOfDay, balance, income, expense },
    });

    logger.debug(`Daily balance updated for ${startOfDay.toISOString().split('T')[0]}`, { balance });
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
  expense: number
) {
  return prisma.dailyBalance.upsert({
    where: {
      userId_date: { userId, date },
    },
    update: { balance, income, expense },
    create: { userId, date, balance, income, expense },
  });
}

/**
 * 최근 N일 일별 잔액 조회
 */
export async function getRecentDailyBalances(userId: string, days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  return prisma.dailyBalance.findMany({
    where: {
      userId,
      date: { gte: startDate },
    },
    orderBy: { date: 'asc' },
  });
}

/**
 * 특정 월의 일별 잔액 조회
 */
export async function getMonthlyDailyBalances(userId: string, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(year, month, 0);
  endDate.setHours(23, 59, 59, 999);

  const daysInMonth = endDate.getDate();

  // 항상 거래 데이터로부터 계산 (타임존 정확성 보장)
  return calculateMonthlyDailyBalancesFromTransactions(userId, year, month);
}

/**
 * 거래 데이터로부터 특정 월의 일별 잔액 계산 - DB 집계 최적화
 */
async function calculateMonthlyDailyBalancesFromTransactions(userId: string, year: number, month: number) {
  // KST 기준 월의 시작과 끝을 UTC로 변환
  const KST_OFFSET_HOURS = 9;

  // KST 기준 월 1일 00:00:00 -> UTC
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - KST_OFFSET_HOURS * 60 * 60 * 1000);

  // KST 기준 월 마지막일 23:59:59 -> UTC
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const endDate = new Date(Date.UTC(year, month - 1, lastDayOfMonth, 23, 59, 59, 999) - KST_OFFSET_HOURS * 60 * 60 * 1000);

  const daysInMonth = lastDayOfMonth;

  // DB에서 일별로 그룹화하여 집계 (type별, savingsGoalId 존재 여부별)
  const [incomeGrouped, expenseGrouped, savingsGrouped] = await Promise.all([
    // 수입 (저축 제외)
    prisma.transaction.groupBy({
      by: ['date'],
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
        type: 'INCOME',
        savingsGoalId: null,
      },
      _sum: { amount: true },
    }),
    // 지출 (저축 제외)
    prisma.transaction.groupBy({
      by: ['date'],
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
        type: 'EXPENSE',
        savingsGoalId: null,
      },
      _sum: { amount: true },
    }),
    // 저축
    prisma.transaction.groupBy({
      by: ['date'],
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
        savingsGoalId: { not: null },
      },
      _sum: { amount: true },
    }),
  ]);

  // 일별 데이터 초기화
  const dailyData: { [day: number]: { income: number; expense: number; savings: number } } = {};
  for (let day = 1; day <= daysInMonth; day++) {
    dailyData[day] = { income: 0, expense: 0, savings: 0 };
  }

  // 집계 결과를 일별 데이터에 매핑
  incomeGrouped.forEach((item) => {
    const day = getKSTDay(new Date(item.date));
    if (dailyData[day]) {
      dailyData[day].income += item._sum.amount || 0;
    }
  });

  expenseGrouped.forEach((item) => {
    const day = getKSTDay(new Date(item.date));
    if (dailyData[day]) {
      dailyData[day].expense += item._sum.amount || 0;
    }
  });

  savingsGrouped.forEach((item) => {
    const day = getKSTDay(new Date(item.date));
    if (dailyData[day]) {
      dailyData[day].savings += item._sum.amount || 0;
    }
  });

  // 결과 생성
  const result: { date: Date; income: number; expense: number; savings: number; balance: number }[] = [];
  let cumulativeBalance = 0;

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
 * 거래 데이터로부터 일별 잔액 계산
 */
export async function calculateDailyBalancesFromTransactions(userId: string, days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
      deletedAt: null,
    },
    orderBy: { date: 'asc' },
  });

  // 일별 데이터 초기화
  const dailyData: { [key: string]: { income: number; expense: number; balance: number } } = {};

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateKey = date.toISOString().split('T')[0];
    dailyData[dateKey] = { income: 0, expense: 0, balance: 0 };
  }

  // 거래 데이터로부터 일별 수입/지출 계산 (KST 기준)
  transactions.forEach((transaction) => {
    const txDate = new Date(transaction.date);
    const KST_OFFSET = 9 * 60 * 60 * 1000;
    const kstDate = new Date(txDate.getTime() + KST_OFFSET);
    const dateKey = kstDate.toISOString().split('T')[0];
    if (dailyData[dateKey]) {
      if (transaction.type === 'INCOME') {
        dailyData[dateKey].income += transaction.amount;
      } else {
        dailyData[dateKey].expense += transaction.amount;
      }
    }
  });

  // 누적 잔액 계산
  let cumulativeBalance = 0;
  return Object.keys(dailyData)
    .sort()
    .map((dateKey) => {
      const { income, expense } = dailyData[dateKey];
      cumulativeBalance += income - expense;
      return {
        date: new Date(dateKey),
        balance: cumulativeBalance,
        income,
        expense,
      };
    });
}
