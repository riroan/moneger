import { successResponse, errorResponse } from '@/lib/api-utils';
import { authenticatedHandler } from '@/lib/auth-handler';
import { requireFeature } from '@/lib/entitlements-server';
import { getAnalytics } from '@/lib/services/analytics.service';

// GET /api/analytics?months=6
export const GET = authenticatedHandler('fetch analytics', async (request, { userId }) => {
  const searchParams = request.nextUrl.searchParams;

  const featureError = await requireFeature(userId, 'ANALYTICS');
  if (featureError) return featureError;

  const monthsStr = searchParams.get('months') ?? '6';
  const months = parseInt(monthsStr);
  if (isNaN(months) || months < 1 || months > 12) {
    return errorResponse('months must be between 1 and 12', 400);
  }

  const result = await getAnalytics(userId, months);
  return successResponse(result);
});
