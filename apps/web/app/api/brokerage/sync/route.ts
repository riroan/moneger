import { successResponse } from '@/lib/api-utils';
import { authenticatedHandler } from '@/lib/auth-handler';
import { requireFeature } from '@/lib/entitlements-server';
import { syncAllConnections } from '@/lib/services/brokerage-snapshot.service';

// POST /api/brokerage/sync — 사용자의 모든 활성 증권사 연결 동기화
export const POST = authenticatedHandler('sync all brokerage connections', async (request, { userId }) => {
  const featureError = await requireFeature(userId, 'BROKERAGE');
  if (featureError) return featureError;

  return successResponse(await syncAllConnections(userId));
});
