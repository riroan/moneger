import { successResponse } from '@/lib/api-utils';
import { authenticatedHandler } from '@/lib/auth-handler';
import { requireFeature } from '@/lib/entitlements-server';
import { getInvestmentsOverview } from '@/lib/services/brokerage-snapshot.service';

// GET /api/brokerage/overview — /investments + 대시보드 카드용 집계
export const GET = authenticatedHandler('get investments overview', async (request, { userId }) => {
  const featureError = await requireFeature(userId, 'SAVINGS', 'BROKERAGE');
  if (featureError) return featureError;

  return successResponse(await getInvestmentsOverview(userId));
});
