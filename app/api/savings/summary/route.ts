import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validateUserId } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

// GET /api/savings/summary - 저축 요약 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    const savingsGoals = await prisma.savingsGoal.findMany({
      where: {
        userId: userId!,
        deletedAt: null,
      },
    });

    const totalCurrentAmount = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const totalTargetAmount = savingsGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const goalsCount = savingsGoals.length;

    return successResponse({
      totalCurrentAmount,
      totalTargetAmount,
      goalsCount,
      progressPercent: totalTargetAmount > 0
        ? Math.round((totalCurrentAmount / totalTargetAmount) * 100)
        : 0,
    });
  } catch (error) {
    logger.error('Failed to fetch savings summary', error);
    return errorResponse('Failed to fetch savings summary', 500);
  }
}
