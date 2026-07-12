import {
  errorResponse,
  successResponse,
} from '@/lib/api-utils';
import { authenticatedHandler } from '@/lib/auth-handler';
import { requireFeature } from '@/lib/entitlements-server';
import { upsertMonthlyAssetSnapshot } from '@/lib/services/monthly-asset.service';
import { kstMonthKey, parseMonthKey } from '@/lib/utils/asset-month';

export const POST = authenticatedHandler('upsert monthly asset snapshot', async (request, { userId }) => {
  const body = await request.json();
  const { month } = body ?? {};

  const featureError = await requireFeature(userId, 'ASSETS');
  if (featureError) return featureError;

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
