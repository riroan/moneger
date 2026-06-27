import { NextRequest } from 'next/server';
import { apiHandler, successResponse, validateUserId } from '@/lib/api-utils';
import { requireFeature } from '@/lib/entitlements-server';
import { getInvestmentsOverview } from '@/lib/services/brokerage-snapshot.service';

// GET /api/brokerage/overview — /investments + 대시보드 카드용 집계
export const GET = apiHandler('get investments overview', async (request: NextRequest) => {
  const userId = request.nextUrl.searchParams.get('userId');
  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;
  const featureError = await requireFeature(userId!, 'SAVINGS', 'BROKERAGE');
  if (featureError) return featureError;

  return successResponse(await getInvestmentsOverview(userId!));
});
