import { NextRequest } from 'next/server';
import {
  apiHandler,
  errorResponse,
  successResponse,
  validateUserId,
} from '@/lib/api-utils';
import { upsertMonthlyAssetSnapshot } from '@/lib/services/monthly-asset.service';
import { kstMonthKey, parseMonthKey } from '@/lib/utils/asset-month';

export const POST = apiHandler('upsert monthly asset snapshot', async (request: NextRequest) => {
  const body = await request.json();
  const { userId, month } = body ?? {};

  const userIdError = validateUserId(typeof userId === 'string' ? userId : null);
  if (userIdError) return userIdError;

  if (month != null && (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month))) {
    return errorResponse('month must be YYYY-MM', 400);
  }

  const monthKey = typeof month === 'string' ? parseMonthKey(month) : kstMonthKey(new Date());
  if (Number.isNaN(monthKey.getTime())) {
    return errorResponse('invalid month', 400);
  }

  const snapshot = await upsertMonthlyAssetSnapshot(userId, monthKey, 'manual');
  return successResponse(snapshot);
});
