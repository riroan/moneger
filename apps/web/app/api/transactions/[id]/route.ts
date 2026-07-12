import {
  successResponseWithMessage,
  errorResponse,
  validateTransactionType,
  validateAmount,
} from '@/lib/api-utils';
import { authenticatedHandlerWithParams } from '@/lib/auth-handler';
import {
  findTransaction,
  updateTransaction,
  deleteTransaction,
  validateCategory,
} from '@/lib/services/transaction.service';

// PATCH /api/transactions/[id] - 거래 수정
export const PATCH = authenticatedHandlerWithParams<{ id: string }>('update transaction', async (request, { id }, { userId }) => {
  const body = await request.json();
  const { type, amount, description, categoryId, groupId, date } = body;

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
      groupId,
      date: date ? new Date(date) : undefined,
    },
    {
      date: existingTransaction.date,
      amount: existingTransaction.amount,
      savingsGoalId: existingTransaction.savingsGoalId,
    }
  );

  return successResponseWithMessage(transaction, 'Transaction updated successfully');
});

// DELETE /api/transactions/[id] - 거래 삭제 (Soft Delete)
export const DELETE = authenticatedHandlerWithParams<{ id: string }>('delete transaction', async (request, { id }, { userId }) => {
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
});
