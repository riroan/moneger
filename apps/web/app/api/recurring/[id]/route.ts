import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  validateUserId,
  apiHandlerWithParams,
} from '@/lib/api-utils';
import {
  updateRecurringExpense,
  deleteRecurringExpense,
} from '@/lib/services/recurring.service';

// PUT /api/recurring/[id] - 정기 지출 수정
export const PUT = apiHandlerWithParams<{ id: string }>(
  'update recurring expense',
  async (request: NextRequest, { id }) => {
    const body = await request.json();
    const { userId, amount, description, categoryId, dayOfMonth, isActive } = body;

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    if (amount !== undefined && (isNaN(amount) || amount <= 0)) {
      return errorResponse('amount must be greater than 0', 400);
    }

    if (dayOfMonth !== undefined && (dayOfMonth < 1 || dayOfMonth > 31)) {
      return errorResponse('dayOfMonth must be between 1 and 31', 400);
    }

    const result = await updateRecurringExpense(id, userId, {
      amount: amount !== undefined ? parseFloat(amount) : undefined,
      description,
      categoryId,
      dayOfMonth: dayOfMonth !== undefined ? parseInt(dayOfMonth) : undefined,
      isActive,
    });

    if (!result) {
      return errorResponse('Recurring expense not found', 404);
    }

    return successResponse(result);
  }
);

// DELETE /api/recurring/[id] - 정기 지출 삭제
export const DELETE = apiHandlerWithParams<{ id: string }>(
  'delete recurring expense',
  async (request: NextRequest, { id }) => {
    const userId = request.nextUrl.searchParams.get('userId');

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    const result = await deleteRecurringExpense(id, userId!);

    if (!result) {
      return errorResponse('Recurring expense not found', 404);
    }

    return successResponse({ message: '정기 지출이 삭제되었습니다' });
  }
);
