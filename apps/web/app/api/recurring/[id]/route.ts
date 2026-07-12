import {
  successResponse,
  errorResponse,
} from '@/lib/api-utils';
import { authenticatedHandlerWithParams } from '@/lib/auth-handler';
import { requireFeature } from '@/lib/entitlements-server';
import {
  updateRecurringExpense,
  deleteRecurringExpense,
} from '@/lib/services/recurring.service';

// PUT /api/recurring/[id] - 정기 지출 수정
export const PUT = authenticatedHandlerWithParams<{ id: string }>(
  'update recurring expense',
  async (request, { id }, { userId }) => {
    const body = await request.json();
    const { amount, description, categoryId, dayOfMonth, isActive } = body;

    const featureError = await requireFeature(userId, 'RECURRING');
    if (featureError) return featureError;

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
export const DELETE = authenticatedHandlerWithParams<{ id: string }>(
  'delete recurring expense',
  async (request, { id }, { userId }) => {
    const featureError = await requireFeature(userId, 'RECURRING');
    if (featureError) return featureError;

    const result = await deleteRecurringExpense(id, userId);

    if (!result) {
      return errorResponse('Recurring expense not found', 404);
    }

    return successResponse({ message: '정기 지출이 삭제되었습니다' });
  }
);
