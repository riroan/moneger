import { successResponse, parseYearMonth, isErrorResponse } from '@/lib/api-utils';
import { authenticatedHandler } from '@/lib/auth-handler';
import { getTransactionSummary } from '@/lib/services/summary.service';

// GET /api/transactions/summary - 거래 요약 통계 조회
export const GET = authenticatedHandler('fetch transaction summary', async (request, { userId }) => {
  const searchParams = request.nextUrl.searchParams;

  const parsed = parseYearMonth(searchParams);
  if (isErrorResponse(parsed)) return parsed;

  const summary = await getTransactionSummary(userId, parsed.year, parsed.month);
  return successResponse(summary);
});
