import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validateUserId, apiHandlerWithParams } from '@/lib/api-utils';
import {
  findSavingsGoal,
  updateSavingsGoalWithPrimary,
  togglePrimarySavingsGoal,
  deleteSavingsGoal,
} from '@/lib/services/savings.service';

// PUT /api/savings/[id] - 저축 목표 수정
export const PUT = apiHandlerWithParams<{ id: string }>('update savings goal', async (request: NextRequest, { id }) => {
  const body = await request.json();
  const { userId, name, icon, targetAmount, targetYear, targetMonth, isPrimary } = body;

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const existingGoal = await findSavingsGoal(id, userId);
  if (!existingGoal) {
    return errorResponse('Savings goal not found', 404);
  }

  const updatedGoal = await updateSavingsGoalWithPrimary(id, userId, {
    name, icon, targetAmount, targetYear, targetMonth, isPrimary,
  });

  return successResponse(updatedGoal);
});

// PATCH /api/savings/[id] - 대표 저축 목표 설정/해제
export const PATCH = apiHandlerWithParams<{ id: string }>('update primary savings goal', async (request: NextRequest, { id }) => {
  const body = await request.json();
  const { userId, isPrimary } = body;

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const existingGoal = await findSavingsGoal(id, userId);
  if (!existingGoal) {
    return errorResponse('Savings goal not found', 404);
  }

  const updatedGoal = await togglePrimarySavingsGoal(id, userId, isPrimary);

  return successResponse(updatedGoal);
});

// DELETE /api/savings/[id] - 저축 목표 삭제 (soft delete)
export const DELETE = apiHandlerWithParams<{ id: string }>('delete savings goal', async (request: NextRequest, { id }) => {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const existingGoal = await findSavingsGoal(id, userId!);
  if (!existingGoal) {
    return errorResponse('Savings goal not found', 404);
  }

  await deleteSavingsGoal(id);

  return successResponse({ message: 'Savings goal deleted successfully' });
});
