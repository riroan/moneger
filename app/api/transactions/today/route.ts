import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, validateUserId } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// GET /api/transactions/today - 오늘의 지출 요약 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    // 오늘 날짜 범위 설정 (00:00:00 ~ 23:59:59)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // 오늘의 지출 집계
    const [expenseAgg, incomeAgg, expenseCount, incomeCount] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId: userId!,
          type: 'EXPENSE',
          deletedAt: null,
          date: { gte: startOfDay, lte: endOfDay },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId: userId!,
          type: 'INCOME',
          deletedAt: null,
          date: { gte: startOfDay, lte: endOfDay },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.count({
        where: {
          userId: userId!,
          type: 'EXPENSE',
          deletedAt: null,
          date: { gte: startOfDay, lte: endOfDay },
        },
      }),
      prisma.transaction.count({
        where: {
          userId: userId!,
          type: 'INCOME',
          deletedAt: null,
          date: { gte: startOfDay, lte: endOfDay },
        },
      }),
    ]);

    const totalExpense = expenseAgg._sum.amount || 0;
    const totalIncome = incomeAgg._sum.amount || 0;

    return successResponse({
      date: today.toISOString(),
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
      dayOfWeek: today.getDay(), // 0: 일요일, 1: 월요일, ...
      expense: {
        total: totalExpense,
        count: expenseCount,
      },
      income: {
        total: totalIncome,
        count: incomeCount,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch today summary', error);
    return errorResponse('Failed to fetch today summary', 500);
  }
}
