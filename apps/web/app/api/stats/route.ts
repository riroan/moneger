import { NextRequest } from 'next/server';
import { successResponse, validateUserId, apiHandler, parseYearMonth, isErrorResponse } from '@/lib/api-utils';
import { getMonthlyStats } from '@/lib/services/stats.service';

// GET /api/stats - 통계 조회
export const GET = apiHandler('fetch stats', async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const parsed = parseYearMonth(searchParams);
  if (isErrorResponse(parsed)) return parsed;

  const stats = await getMonthlyStats(userId!, parsed.year, parsed.month);

  return successResponse(stats);
});
