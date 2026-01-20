import { prisma } from '@/lib/prisma';
import { PrismaClient, Prisma } from '@prisma/client';

type TransactionClient = Prisma.TransactionClient;

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
 * 일별 잔액 업데이트 (Prisma 트랜잭션 내에서 사용)
 */
export async function updateDailyBalanceInTransaction(
  tx: TransactionClient,
  userId: string,
  date: Date
): Promise<void> {
  const { startOfDay, endOfDay } = getDayBoundaries(date);

  // 해당 날짜까지의 모든 거래 조회 (누적 잔액용)
  const allTransactions = await tx.transaction.findMany({
    where: {
      userId,
      date: { lte: startOfDay },
      deletedAt: null,
    },
    select: { type: true, amount: true },
  });

  // 해당 날짜의 거래만 조회 (일별 수입/지출용)
  const dayTransactions = await tx.transaction.findMany({
    where: {
      userId,
      date: { gte: startOfDay, lte: endOfDay },
      deletedAt: null,
    },
    select: { type: true, amount: true },
  });

  const balance = calculateBalance(allTransactions as Transaction[]);
  const { income, expense } = calculateDailyStats(dayTransactions as Transaction[]);

  await tx.dailyBalance.upsert({
    where: {
      userId_date: { userId, date: startOfDay },
    },
    update: { balance, income, expense },
    create: { userId, date: startOfDay, balance, income, expense },
  });
}

/**
 * 일별 잔액 업데이트 (독립적 호출용)
 */
export async function updateDailyBalance(userId: string, date: Date): Promise<void> {
  try {
    const { startOfDay, endOfDay } = getDayBoundaries(date);

    const allTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { lte: startOfDay },
        deletedAt: null,
      },
      select: { type: true, amount: true },
    });

    const dayTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startOfDay, lte: endOfDay },
        deletedAt: null,
      },
      select: { type: true, amount: true },
    });

    const balance = calculateBalance(allTransactions as Transaction[]);
    const { income, expense } = calculateDailyStats(dayTransactions as Transaction[]);

    await prisma.dailyBalance.upsert({
      where: {
        userId_date: { userId, date: startOfDay },
      },
      update: { balance, income, expense },
      create: { userId, date: startOfDay, balance, income, expense },
    });

    console.log(`Daily balance updated for ${startOfDay.toISOString().split('T')[0]}: balance=${balance}`);
  } catch (error) {
    console.error('Failed to update daily balance:', error);
    throw error;
  }
}
