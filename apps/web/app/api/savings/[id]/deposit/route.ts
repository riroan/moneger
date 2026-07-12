import { successResponse, errorResponse } from '@/lib/api-utils';
import { authenticatedHandlerWithParams } from '@/lib/auth-handler';
import { requireFeature } from '@/lib/entitlements-server';
import { prisma } from '@/lib/prisma';
import { updateDailyBalanceInTransaction } from '@/lib/services/daily-balance.service';
import { findSavingsGoal, depositToSavingsGoal } from '@/lib/services/savings.service';

// POST /api/savings/[id]/deposit - 저축 목표에 입금 (거래 내역도 함께 생성)
export const POST = authenticatedHandlerWithParams<{ id: string }>('deposit to savings goal', async (request, { id }, { userId }) => {
  const body = await request.json();
  const { amount } = body;

  const featureError = await requireFeature(userId, 'SAVINGS');
  if (featureError) return featureError;

  if (!amount || amount <= 0) {
    return errorResponse('Amount must be greater than 0', 400);
  }

  const savingsGoal = await findSavingsGoal(id, userId);
  if (!savingsGoal) {
    return errorResponse('Savings goal not found', 404);
  }

  const transactionDate = new Date();
  const { updatedGoal, transaction } = await prisma.$transaction(async (tx) => {
    const result = await depositToSavingsGoal(
      tx, id, userId, amount, savingsGoal.name, savingsGoal.currentAmount, transactionDate
    );
    await updateDailyBalanceInTransaction(tx, userId, transactionDate);
    return result;
  });

  return successResponse({ savingsGoal: updatedGoal, transaction });
});
