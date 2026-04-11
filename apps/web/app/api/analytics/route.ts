import { NextRequest } from 'next/server';
import { successResponse, validateUserId, apiHandler, errorResponse } from '@/lib/api-utils';
import { getAnalytics } from '@/lib/services/analytics.service';

// GET /api/analytics?userId=...&months=6
export const GET = apiHandler('fetch analytics', async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const monthsStr = searchParams.get('months') ?? '6';
  const months = parseInt(monthsStr);
  if (isNaN(months) || months < 1 || months > 12) {
    return errorResponse('months must be between 1 and 12', 400);
  }

  const result = await getAnalytics(userId!, months);
  return successResponse(result);
});
