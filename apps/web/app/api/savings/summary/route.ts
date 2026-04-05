import { NextRequest } from 'next/server';
import { successResponse, validateUserId, apiHandler } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';

// GET /api/savings/summary - 저축 요약 조회
export const GET = apiHandler('fetch savings summary', async (request: NextRequest) => {
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
});
