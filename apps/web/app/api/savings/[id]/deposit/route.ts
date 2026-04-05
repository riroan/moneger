import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validateUserId, apiHandlerWithParams } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import { updateDailyBalanceInTransaction } from '@/lib/services/daily-balance.service';
import { findSavingsGoal, depositToSavingsGoal } from '@/lib/services/savings.service';

// POST /api/savings/[id]/deposit - 저축 목표에 입금 (거래 내역도 함께 생성)
export const POST = apiHandlerWithParams<{ id: string }>('deposit to savings goal', async (request: NextRequest, { id }) => {
  const body = await request.json();
  const { userId, amount } = body;

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

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
