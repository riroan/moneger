import {
  successResponse,
} from '@/lib/api-utils';
import { authenticatedHandler } from '@/lib/auth-handler';
import { requireFeature } from '@/lib/entitlements-server';
import {
  getRecurringSummary,
  getUpcomingAlerts,
} from '@/lib/services/recurring.service';

// GET /api/recurring/summary - 정기 지출 요약 + 알림
export const GET = authenticatedHandler('fetch recurring summary', async (request, { userId }) => {
  const featureError = await requireFeature(userId, 'RECURRING');
  if (featureError) return featureError;

  const [summary, alerts] = await Promise.all([
    getRecurringSummary(userId),
    getUpcomingAlerts(userId),
  ]);

  return successResponse({ ...summary, alerts });
});
