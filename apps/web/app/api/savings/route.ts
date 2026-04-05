import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validateUserId, apiHandler } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import { getActiveSavingsGoalsWithProgress } from '@/lib/services/savings.service';

// GET /api/savings - 저축 목표 목록 조회
export const GET = apiHandler('fetch savings goals', async (request: NextRequest) => {
  const userId = request.nextUrl.searchParams.get('userId');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const goalsWithProgress = await getActiveSavingsGoalsWithProgress(userId!);
  return successResponse(goalsWithProgress);
});

// POST /api/savings - 저축 목표 생성
export const POST = apiHandler('create savings goal', async (request: NextRequest) => {
  const body = await request.json();
  const { userId, name, icon, targetAmount, currentAmount, startYear, startMonth, targetYear, targetMonth } = body;

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

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
