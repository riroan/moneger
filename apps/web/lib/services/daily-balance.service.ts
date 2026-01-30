import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import {
  getDayRange,
  getMonthRangeKST,
  getDaysInMonth,
  getKSTDay,
  getDateKey,
  getLastNDaysRange,
  KST_OFFSET_MS,
  toKST,
  getKSTDayRangeUTC,
} from '@/lib/date-utils';

type TransactionClient = Prisma.TransactionClient;

/**
 * 일별 잔액 업데이트 (Prisma 트랜잭션 내에서 사용)
 * balance = 이전 날짜 잔액 + 당일 수입 - 당일 지출 - 당일 저축
 */
export async function updateDailyBalanceInTransaction(
  tx: TransactionClient,
  userId: string,
  date: Date
): Promise<void> {
  // KST 기준 날짜 범위 계산
  const { startOfDay, endOfDay, dateForDB } = getKSTDayRangeUTC(date);

  // 이전 날짜 계산 (KST 기준)
  const kstDate = toKST(date);
  const previousDateForDB = new Date(Date.UTC(
    kstDate.getFullYear(),
    kstDate.getMonth(),
    kstDate.getDate() - 1
  ));

  // 병렬로 이전 잔액과 당일 집계 쿼리 실행
  const [previousBalance, dayIncomeAgg, dayExpenseAgg, daySavingsAgg] = await Promise.all([
    // 이전 날짜의 잔액 조회
    tx.dailyBalance.findUnique({
      where: { userId_date: { userId, date: previousDateForDB } },
      select: { balance: true },
    }),
    // 당일 수입 합계 (저축 제외)
    tx.transaction.aggregate({
      where: { userId, date: { gte: startOfDay, lte: endOfDay }, type: 'INCOME', deletedAt: null, savingsGoalId: null },
      _sum: { amount: true },
    }),
    // 당일 지출 합계 (저축 제외)
    tx.transaction.aggregate({
      where: { userId, date: { gte: startOfDay, lte: endOfDay }, type: 'EXPENSE', deletedAt: null, savingsGoalId: null },
      _sum: { amount: true },
    }),
    // 당일 저축 합계
    tx.transaction.aggregate({
      where: { userId, date: { gte: startOfDay, lte: endOfDay }, deletedAt: null, savingsGoalId: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const prevBalance = previousBalance?.balance || 0;
  const income = dayIncomeAgg._sum.amount || 0;
  const expense = dayExpenseAgg._sum.amount || 0;
  const savings = daySavingsAgg._sum.amount || 0;
  const balance = prevBalance + income - expense - savings;

  await tx.dailyBalance.upsert({
    where: {
      userId_date: { userId, date: dateForDB },
    },
    update: { balance, income, expense, savings },
    create: { userId, date: dateForDB, balance, income, expense, savings },
  });
}

/**
 * 일별 잔액 업데이트 (독립적 호출용)
 * balance = 이전 날짜 잔액 + 당일 수입 - 당일 지출 - 당일 저축
 */
export async function updateDailyBalance(userId: string, date: Date): Promise<void> {
  try {
    // KST 기준 날짜 범위 계산
    const { startOfDay, endOfDay, dateForDB } = getKSTDayRangeUTC(date);

    // 이전 날짜 계산 (KST 기준)
    const kstDate = toKST(date);
    const previousDateForDB = new Date(Date.UTC(
      kstDate.getFullYear(),
      kstDate.getMonth(),
      kstDate.getDate() - 1
    ));

    // 병렬로 이전 잔액과 당일 집계 쿼리 실행
    const [previousBalance, dayIncomeAgg, dayExpenseAgg, daySavingsAgg] = await Promise.all([
      // 이전 날짜의 잔액 조회
      prisma.dailyBalance.findUnique({
        where: { userId_date: { userId, date: previousDateForDB } },
        select: { balance: true },
      }),
      // 당일 수입 합계 (저축 제외)
      prisma.transaction.aggregate({
        where: { userId, date: { gte: startOfDay, lte: endOfDay }, type: 'INCOME', deletedAt: null, savingsGoalId: null },
        _sum: { amount: true },
      }),
      // 당일 지출 합계 (저축 제외)
      prisma.transaction.aggregate({
        where: { userId, date: { gte: startOfDay, lte: endOfDay }, type: 'EXPENSE', deletedAt: null, savingsGoalId: null },
        _sum: { amount: true },
      }),
      // 당일 저축 합계
      prisma.transaction.aggregate({
        where: { userId, date: { gte: startOfDay, lte: endOfDay }, deletedAt: null, savingsGoalId: { not: null } },
        _sum: { amount: true },
      }),
    ]);

    const prevBalance = previousBalance?.balance || 0;
    const income = dayIncomeAgg._sum.amount || 0;
    const expense = dayExpenseAgg._sum.amount || 0;
    const savings = daySavingsAgg._sum.amount || 0;
    const balance = prevBalance + income - expense - savings;

    await prisma.dailyBalance.upsert({
      where: {
        userId_date: { userId, date: dateForDB },
      },
      update: { balance, income, expense, savings },
      create: { userId, date: dateForDB, balance, income, expense, savings },
    });

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
    where: {
      userId_date: { userId, date },
    },
    update: { balance, income, expense, savings },
    create: { userId, date, balance, income, expense, savings },
  });
}

/**
 * 최근 N일 일별 잔액 조회 (KST 기준)
 * 1. KST 오늘 날짜 계산
 * 2. DailyBalance에서 오늘 포함 최근 N일 조회
 */
export async function getRecentDailyBalances(userId: string, days: number) {
  // 1. KST 오늘 날짜
  const kstNow = toKST(new Date());
  const kstYear = kstNow.getFullYear();
  const kstMonth = kstNow.getMonth();
  const kstDay = kstNow.getDate();

  // 2. 시작일과 종료일 (UTC 자정 기준 - @db.Date 타입용)
  const startDate = new Date(Date.UTC(kstYear, kstMonth, kstDay - days + 1));
  const endDate = new Date(Date.UTC(kstYear, kstMonth, kstDay));

  // 3. 조회
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
  const startDate = new Date(year, month - 1, 1);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(year, month, 0);
  endDate.setHours(23, 59, 59, 999);

  const daysInMonth = endDate.getDate();

  // 항상 거래 데이터로부터 계산 (타임존 정확성 보장)
  return calculateMonthlyDailyBalancesFromTransactions(userId, year, month);
}

/**
 * 거래 데이터로부터 특정 월의 일별 잔액 계산
 * balance = 이전 날짜 잔액 + 당일 수입 - 당일 지출 - 당일 저축
 */
async function calculateMonthlyDailyBalancesFromTransactions(userId: string, year: number, month: number) {
  const { startDate, endDate } = getMonthRangeKST(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  // 이전 달 마지막 날 (해당 월 이전 잔액 조회용)
  const previousMonthLastDay = new Date(year, month - 1, 0);
  previousMonthLastDay.setHours(0, 0, 0, 0);

  // DB에서 일별로 그룹화하여 집계 + 이전 잔액 조회
  const [previousBalance, previousIncomeAgg, previousExpenseAgg, previousSavingsAgg, incomeGrouped, expenseGrouped, savingsGrouped] = await Promise.all([
    // 이전 달 마지막 날의 DailyBalance 조회
    prisma.dailyBalance.findUnique({
      where: { userId_date: { userId, date: previousMonthLastDay } },
      select: { balance: true },
    }),
    // 해당 월 이전 수입 합계 (저축 제외)
    prisma.transaction.aggregate({
      where: { userId, date: { lt: startDate }, type: 'INCOME', savingsGoalId: null, deletedAt: null },
      _sum: { amount: true },
    }),
    // 해당 월 이전 지출 합계 (저축 제외)
    prisma.transaction.aggregate({
      where: { userId, date: { lt: startDate }, type: 'EXPENSE', savingsGoalId: null, deletedAt: null },
      _sum: { amount: true },
    }),
    // 해당 월 이전 저축 합계
    prisma.transaction.aggregate({
      where: { userId, date: { lt: startDate }, savingsGoalId: { not: null }, deletedAt: null },
      _sum: { amount: true },
    }),
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

  // 이전 잔액 계산 (DailyBalance가 있으면 사용, 없으면 거래에서 계산)
  const prevIncome = previousIncomeAgg._sum.amount || 0;
  const prevExpense = previousExpenseAgg._sum.amount || 0;
  const prevSavings = previousSavingsAgg._sum.amount || 0;
  const initialBalance = previousBalance?.balance ?? (prevIncome - prevExpense - prevSavings);

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

  // 결과 생성 (이전 잔액부터 시작)
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
 * 거래 데이터로부터 일별 잔액 계산 (KST 기준)
 */
export async function calculateDailyBalancesFromTransactions(userId: string, days: number) {
  const { startDate, endDate } = getLastNDaysRange(days);

  // 이전 날짜 계산 (기간 시작일 전날)
  const kstNow = toKST(new Date());
  const previousDay = new Date(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate() - days);
  previousDay.setHours(0, 0, 0, 0);

  // 기간 내 거래와 이전 잔액을 병렬로 조회
  const [transactions, previousDailyBalance] = await Promise.all([
    // 기간 내 거래
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      orderBy: { date: 'asc' },
    }),
    // 이전 날짜의 DailyBalance 조회
    prisma.dailyBalance.findUnique({
      where: { userId_date: { userId, date: previousDay } },
      select: { balance: true },
    }),
  ]);

  // 이전 잔액 (DailyBalance에서 가져옴)
  const previousBalance = previousDailyBalance?.balance || 0;

  // 일별 데이터 초기화 (KST 기준)
  const dailyData: { [key: string]: { income: number; expense: number; savings: number; balance: number } } = {};

  for (let i = days - 1; i >= 0; i--) {
    const kstDate = new Date(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate() - i);
    const dateKey = `${kstDate.getFullYear()}-${String(kstDate.getMonth() + 1).padStart(2, '0')}-${String(kstDate.getDate()).padStart(2, '0')}`;
    dailyData[dateKey] = { income: 0, expense: 0, savings: 0, balance: 0 };
  }

  // 거래 데이터로부터 일별 수입/지출/저축 계산 (KST 기준)
  transactions.forEach((transaction) => {
    const txDate = new Date(transaction.date);
    const kstDate = new Date(txDate.getTime() + KST_OFFSET_MS);
    const dateKey = `${kstDate.getFullYear()}-${String(kstDate.getMonth() + 1).padStart(2, '0')}-${String(kstDate.getDate()).padStart(2, '0')}`;
    if (dailyData[dateKey]) {
      if (transaction.savingsGoalId) {
        // 저축 거래
        dailyData[dateKey].savings += transaction.amount;
      } else if (transaction.type === 'INCOME') {
        dailyData[dateKey].income += transaction.amount;
      } else {
        dailyData[dateKey].expense += transaction.amount;
      }
    }
  });

  // 누적 잔액 계산 (이전 날짜 잔액부터 시작)
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
