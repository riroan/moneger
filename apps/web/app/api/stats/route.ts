import { successResponse, parseYearMonth, isErrorResponse } from '@/lib/api-utils';
import { authenticatedHandler } from '@/lib/auth-handler';
import { getMonthlyStats } from '@/lib/services/stats.service';

// GET /api/stats - 통계 조회
export const GET = authenticatedHandler('fetch stats', async (request, { userId }) => {
  const searchParams = request.nextUrl.searchParams;

  const parsed = parseYearMonth(searchParams);
  if (isErrorResponse(parsed)) return parsed;

  const stats = await getMonthlyStats(userId, parsed.year, parsed.month);

  return successResponse(stats);
});
