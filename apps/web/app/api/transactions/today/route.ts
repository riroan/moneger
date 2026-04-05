import { NextRequest } from 'next/server';
import { successResponse, validateUserId, apiHandler } from '@/lib/api-utils';
import { getTodaySummary } from '@/lib/services/transaction.service';

// GET /api/transactions/today - 오늘의 지출 요약 조회
export const GET = apiHandler('fetch today summary', async (request: NextRequest) => {
  const userId = request.nextUrl.searchParams.get('userId');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const data = await getTodaySummary(userId!);
  return successResponse(data);
});
