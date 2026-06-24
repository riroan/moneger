import { NextRequest } from 'next/server';
import { apiHandler, successResponse, validateUserId } from '@/lib/api-utils';
import { syncAllConnections } from '@/lib/services/brokerage-snapshot.service';

// POST /api/brokerage/sync — 사용자의 모든 활성 증권사 연결 동기화
export const POST = apiHandler('sync all brokerage connections', async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));
  const userId = body?.userId ?? request.nextUrl.searchParams.get('userId');
  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  return successResponse(await syncAllConnections(userId));
});
