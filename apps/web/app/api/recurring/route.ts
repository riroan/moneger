import { NextRequest } from 'next/server';
import {
  successResponse,
  successResponseWithMessage,
  errorResponse,
  validateUserId,
  validateAmount,
  apiHandler,
} from '@/lib/api-utils';
import {
  createRecurringExpense,
  getRecurringExpenses,
} from '@/lib/services/recurring.service';

// GET /api/recurring - 정기 지출 목록 조회
export const GET = apiHandler('fetch recurring expenses', async (request: NextRequest) => {
  const userId = request.nextUrl.searchParams.get('userId');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const data = await getRecurringExpenses(userId!);
  return successResponse(data);
});

// POST /api/recurring - 정기 지출 등록
export const POST = apiHandler('create recurring expense', async (request: NextRequest) => {
  const body = await request.json();
  const { userId, amount, description, type, categoryId, dayOfMonth } = body;

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const amountError = validateAmount(amount);
  if (amountError) return amountError;

  if (!description || typeof description !== 'string') {
    return errorResponse('description is required', 400);
  }

  if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) {
    return errorResponse('dayOfMonth must be between 1 and 31', 400);
  }

  // 최대 10개 제한
  const existing = await getRecurringExpenses(userId);
  if (existing.length >= 10) {
    return errorResponse('정기 지출은 최대 10개까지 등록할 수 있습니다', 400);
  }

  const result = await createRecurringExpense({
    userId,
    amount: parseFloat(amount),
    description,
    type: type || 'EXPENSE',
    categoryId: categoryId || null,
    dayOfMonth: parseInt(dayOfMonth),
  });

  return successResponseWithMessage(result, '정기 지출이 등록되었습니다', 201);
});
