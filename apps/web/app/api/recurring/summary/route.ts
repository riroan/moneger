import { NextRequest } from 'next/server';
import {
  successResponse,
  validateUserId,
  apiHandler,
} from '@/lib/api-utils';
import {
  getRecurringSummary,
  getUpcomingAlerts,
} from '@/lib/services/recurring.service';

// GET /api/recurring/summary - 정기 지출 요약 + 알림
export const GET = apiHandler('fetch recurring summary', async (request: NextRequest) => {
  const userId = request.nextUrl.searchParams.get('userId');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const [summary, alerts] = await Promise.all([
    getRecurringSummary(userId!),
    getUpcomingAlerts(userId!),
  ]);

  return successResponse({ ...summary, alerts });
});
