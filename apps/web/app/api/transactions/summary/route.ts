import { NextRequest } from 'next/server';
import { successResponse, validateUserId, apiHandler, parseYearMonth, isErrorResponse } from '@/lib/api-utils';
import { getTransactionSummary } from '@/lib/services/summary.service';

// GET /api/transactions/summary - 거래 요약 통계 조회
export const GET = apiHandler('fetch transaction summary', async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const parsed = parseYearMonth(searchParams);
  if (isErrorResponse(parsed)) return parsed;

  const summary = await getTransactionSummary(userId!, parsed.year, parsed.month);
  return successResponse(summary);
});
