import { successResponse } from '@/lib/api-utils';
import { authenticatedHandler } from '@/lib/auth-handler';
import { requireFeature } from '@/lib/entitlements-server';
import { prisma } from '@/lib/prisma';

// GET /api/savings/summary - 저축 요약 조회
export const GET = authenticatedHandler('fetch savings summary', async (request, { userId }) => {
  const featureError = await requireFeature(userId, 'SAVINGS');
  if (featureError) return featureError;

  const savingsGoals = await prisma.savingsGoal.findMany({
    where: {
      userId,
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
