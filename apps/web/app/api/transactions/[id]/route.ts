import { NextRequest } from 'next/server';
import {
  successResponseWithMessage,
  errorResponse,
  validateUserId,
  validateTransactionType,
  validateAmount,
} from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import {
  findTransaction,
  updateTransaction,
  deleteTransaction,
  validateCategory,
} from '@/lib/services/transaction.service';

// PATCH /api/transactions/[id] - 거래 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, type, amount, description, categoryId, date } = body;

    // 유효성 검사
    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    // 거래가 존재하는지 확인
    const existingTransaction = await findTransaction(id, userId);
    if (!existingTransaction) {
      return errorResponse('Transaction not found', 404);
    }

    // 타입 유효성 검사
    if (type !== undefined) {
      const typeError = validateTransactionType(type);
      if (typeError) return typeError;
    }

    // 금액 유효성 검사
    if (amount !== undefined) {
      const amountError = validateAmount(amount);
      if (amountError) return amountError;
    }

    // 카테고리 검증
    if (categoryId !== undefined && categoryId !== null) {
      const targetType = type || existingTransaction.type;
      const category = await validateCategory(categoryId, userId, targetType);
      if (!category) {
        return errorResponse('Invalid category or category type mismatch', 400);
      }
    }

    // 거래 수정
    const transaction = await updateTransaction(
      id,
      userId,
      {
        type,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        description,
        categoryId,
        date: date ? new Date(date) : undefined,
      },
      {
        date: existingTransaction.date,
        amount: existingTransaction.amount,
        savingsGoalId: existingTransaction.savingsGoalId,
      }
    );

    return successResponseWithMessage(transaction, 'Transaction updated successfully');
  } catch (error) {
    logger.error('Failed to update transaction', error);
    return errorResponse('Failed to update transaction', 500);
  }
}

// DELETE /api/transactions/[id] - 거래 삭제 (Soft Delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId } = body;

    // 유효성 검사
    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    // 거래가 존재하는지 확인
    const existingTransaction = await findTransaction(id, userId);
    if (!existingTransaction) {
      return errorResponse('Transaction not found', 404);
    }

    // 거래 삭제
    await deleteTransaction(id, userId, {
      date: existingTransaction.date,
      amount: existingTransaction.amount,
      savingsGoalId: existingTransaction.savingsGoalId,
    });

    return successResponseWithMessage(null, 'Transaction deleted successfully');
  } catch (error) {
    logger.error('Failed to delete transaction', error);
    return errorResponse('Failed to delete transaction', 500);
  }
}
