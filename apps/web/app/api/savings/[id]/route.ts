import { successResponse, errorResponse } from '@/lib/api-utils';
import { authenticatedHandlerWithParams } from '@/lib/auth-handler';
import { requireFeature } from '@/lib/entitlements-server';
import {
  findSavingsGoal,
  updateSavingsGoalWithPrimary,
  togglePrimarySavingsGoal,
  deleteSavingsGoal,
  setSavingsGoalLinkedAccounts,
} from '@/lib/services/savings.service';

// PUT /api/savings/[id] - 저축 목표 수정 (+ 증권 계좌 연결)
export const PUT = authenticatedHandlerWithParams<{ id: string }>('update savings goal', async (request, { id }, { userId }) => {
  const body = await request.json();
  const { name, icon, targetAmount, targetYear, targetMonth, isPrimary, brokerageAccountIds } = body;

  const featureError = await requireFeature(userId, 'SAVINGS');
  if (featureError) return featureError;

  const existingGoal = await findSavingsGoal(id, userId);
  if (!existingGoal) {
    return errorResponse('Savings goal not found', 404);
  }

  // 증권 계좌 연결 변경이 포함된 경우: 소유권 검증 후 적용. 실패 시 목표 수정도 막는다.
  if (Array.isArray(brokerageAccountIds)) {
    const linkResult = await setSavingsGoalLinkedAccounts(id, userId, brokerageAccountIds);
    if (!linkResult.ok) {
      return errorResponse(linkResult.reason, 400);
    }
  }

  const updatedGoal = await updateSavingsGoalWithPrimary(id, userId, {
    name, icon, targetAmount, targetYear, targetMonth, isPrimary,
  });

  return successResponse(updatedGoal);
});

// PATCH /api/savings/[id] - 대표 저축 목표 설정/해제
export const PATCH = authenticatedHandlerWithParams<{ id: string }>('update primary savings goal', async (request, { id }, { userId }) => {
  const body = await request.json();
  const { isPrimary } = body;

  const featureError = await requireFeature(userId, 'SAVINGS');
  if (featureError) return featureError;

  const existingGoal = await findSavingsGoal(id, userId);
  if (!existingGoal) {
    return errorResponse('Savings goal not found', 404);
  }

  const updatedGoal = await togglePrimarySavingsGoal(id, userId, isPrimary);

  return successResponse(updatedGoal);
});

// DELETE /api/savings/[id] - 저축 목표 삭제 (soft delete)
export const DELETE = authenticatedHandlerWithParams<{ id: string }>('delete savings goal', async (request, { id }, { userId }) => {
  const featureError = await requireFeature(userId, 'SAVINGS');
  if (featureError) return featureError;

  const existingGoal = await findSavingsGoal(id, userId);
  if (!existingGoal) {
    return errorResponse('Savings goal not found', 404);
  }

  await deleteSavingsGoal(id);

  return successResponse({ message: 'Savings goal deleted successfully' });
});
