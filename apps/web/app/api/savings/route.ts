import { successResponse, errorResponse } from '@/lib/api-utils';
import { authenticatedHandler } from '@/lib/auth-handler';
import { requireFeature } from '@/lib/entitlements-server';
import { prisma } from '@/lib/prisma';
import { getActiveSavingsGoalsWithProgress } from '@/lib/services/savings.service';

// GET /api/savings - 저축 목표 목록 조회
export const GET = authenticatedHandler('fetch savings goals', async (request, { userId }) => {
  const featureError = await requireFeature(userId, 'SAVINGS');
  if (featureError) return featureError;

  const goalsWithProgress = await getActiveSavingsGoalsWithProgress(userId);
  return successResponse(goalsWithProgress);
});

// POST /api/savings - 저축 목표 생성
export const POST = authenticatedHandler('create savings goal', async (request, { userId }) => {
  const body = await request.json();
  const { name, icon, targetAmount, currentAmount, startYear, startMonth, targetYear, targetMonth } = body;

  const featureError = await requireFeature(userId, 'SAVINGS');
  if (featureError) return featureError;

  if (!name || !icon || !targetAmount || !targetYear || !targetMonth) {
    return errorResponse('Missing required fields', 400);
  }

  const savingsGoal = await prisma.savingsGoal.create({
    data: {
      userId,
      name,
      icon,
      targetAmount,
      currentAmount: currentAmount || 0,
      startYear: startYear || null,
      startMonth: startMonth || null,
      targetYear,
      targetMonth,
    },
  });

  return successResponse(savingsGoal, 201);
});
