import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, validateUserId } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { getKSTDayStartUTC, getKSTDayEndUTC, getKSTDateParts } from '@/lib/date-utils';

// GET /api/transactions/today - 오늘의 지출 요약 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    // KST 기준 오늘 날짜 범위 설정 (00:00:00 ~ 23:59:59 KST를 UTC로 변환)
    const now = new Date();
    const startOfDay = getKSTDayStartUTC(now);
    const endOfDay = getKSTDayEndUTC(now);
    const kstToday = getKSTDateParts(now);

    // 오늘의 지출/수입/저축 집계
    const [expenseAgg, incomeAgg, savingsAgg, expenseCount, incomeCount, savingsCount] = await Promise.all([
      // 지출 (저축 제외)
      prisma.transaction.aggregate({
        where: {
          userId: userId!,
          type: 'EXPENSE',
          savingsGoalId: null,
          deletedAt: null,
          date: { gte: startOfDay, lte: endOfDay },
        },
        _sum: { amount: true },
      }),
      // 수입
      prisma.transaction.aggregate({
        where: {
          userId: userId!,
          type: 'INCOME',
          deletedAt: null,
          date: { gte: startOfDay, lte: endOfDay },
        },
        _sum: { amount: true },
      }),
      // 저축
      prisma.transaction.aggregate({
        where: {
          userId: userId!,
          savingsGoalId: { not: null },
          deletedAt: null,
          date: { gte: startOfDay, lte: endOfDay },
        },
        _sum: { amount: true },
      }),
      // 지출 건수 (저축 제외)
      prisma.transaction.count({
        where: {
          userId: userId!,
          type: 'EXPENSE',
          savingsGoalId: null,
          deletedAt: null,
          date: { gte: startOfDay, lte: endOfDay },
        },
      }),
      // 수입 건수
      prisma.transaction.count({
        where: {
          userId: userId!,
          type: 'INCOME',
          deletedAt: null,
          date: { gte: startOfDay, lte: endOfDay },
        },
      }),
      // 저축 건수
      prisma.transaction.count({
        where: {
          userId: userId!,
          savingsGoalId: { not: null },
          deletedAt: null,
          date: { gte: startOfDay, lte: endOfDay },
        },
      }),
    ]);

    const totalExpense = expenseAgg._sum.amount || 0;
    const totalIncome = incomeAgg._sum.amount || 0;
    const totalSavings = savingsAgg._sum.amount || 0;

    return successResponse({
      date: now.toISOString(),
      year: kstToday.year,
      month: kstToday.month,
      day: kstToday.day,
      dayOfWeek: kstToday.dayOfWeek, // 0: 일요일, 1: 월요일, ...
      expense: {
        total: totalExpense,
        count: expenseCount,
      },
      income: {
        total: totalIncome,
        count: incomeCount,
      },
      savings: {
        total: totalSavings,
        count: savingsCount,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch today summary', error);
    return errorResponse('Failed to fetch today summary', 500);
  }
}
