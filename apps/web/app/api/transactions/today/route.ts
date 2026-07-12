import { successResponse } from '@/lib/api-utils';
import { authenticatedHandler } from '@/lib/auth-handler';
import { getTodaySummary } from '@/lib/services/transaction.service';

// GET /api/transactions/today - 오늘의 지출 요약 조회
export const GET = authenticatedHandler('fetch today summary', async (request, { userId }) => {
  const data = await getTodaySummary(userId);
  return successResponse(data);
});
