import { NextRequest } from 'next/server';
import {
  apiHandler,
  errorResponse,
  successResponse,
  validateUserId,
} from '@/lib/api-utils';
import { requireFeature } from '@/lib/entitlements-server';
import {
  deleteAssetSnapshot,
  upsertAssetSnapshot,
} from '@/lib/services/asset.service';
import { parseMonthKey } from '@/lib/utils/asset-month';

export const PUT = apiHandler('upsert asset snapshot', async (request: NextRequest) => {
  const body = await request.json();
  const { userId, assetItemId, month, amount, note } = body ?? {};

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;
  const featureError = await requireFeature(userId!, 'ASSETS');
  if (featureError) return featureError;

  if (typeof assetItemId !== 'string' || !assetItemId) {
    return errorResponse('assetItemId is required', 400);
  }
  if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
    return errorResponse('month must be YYYY-MM', 400);
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return errorResponse('amount must be a number', 400);
  }

  const monthKey = parseMonthKey(month);

  try {
    const snap = await upsertAssetSnapshot(
      userId,
      assetItemId,
      monthKey,
      amount,
      typeof note === 'string' ? note : null
    );
    return successResponse(snap);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to upsert';
    const status = message === 'asset item not found' ? 404 : 400;
    return errorResponse(message, status);
  }
});

export const DELETE = apiHandler('delete asset snapshot', async (request: NextRequest) => {
  const userId = request.nextUrl.searchParams.get('userId');
  const assetItemId = request.nextUrl.searchParams.get('assetItemId');
  const month = request.nextUrl.searchParams.get('month');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;
  const featureError = await requireFeature(userId!, 'ASSETS');
  if (featureError) return featureError;
  if (!assetItemId) return errorResponse('assetItemId is required', 400);
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return errorResponse('month must be YYYY-MM', 400);
  }

  const monthKey = parseMonthKey(month);
  const removed = await deleteAssetSnapshot(userId!, assetItemId, monthKey);
  return successResponse({ deleted: removed !== null });
});
