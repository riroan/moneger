import {
  errorResponse,
  successResponse,
} from '@/lib/api-utils';
import { authenticatedHandler } from '@/lib/auth-handler';
import { requireFeature } from '@/lib/entitlements-server';
import {
  getMonthlyAssetReport,
  normalizeRange,
} from '@/lib/services/monthly-asset.service';
import { kstMonthKey, parseMonthKey } from '@/lib/utils/asset-month';

export const GET = authenticatedHandler('fetch monthly asset report', async (request, { userId }) => {
  const monthStr = request.nextUrl.searchParams.get('month');
  const rangeStr = request.nextUrl.searchParams.get('range');

  const featureError = await requireFeature(userId, 'ASSETS');
  if (featureError) return featureError;

  if (monthStr && !/^\d{4}-\d{2}$/.test(monthStr)) {
    return errorResponse('month must be YYYY-MM', 400);
  }

  const endMonthKey = monthStr ? parseMonthKey(monthStr) : kstMonthKey(new Date());
  if (Number.isNaN(endMonthKey.getTime())) {
    return errorResponse('invalid month', 400);
  }

  const report = await getMonthlyAssetReport(userId, endMonthKey, normalizeRange(rangeStr));
  return successResponse(report);
});
