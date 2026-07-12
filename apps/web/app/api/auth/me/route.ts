import { NextRequest } from 'next/server';
import { successResponse, errorResponse, apiHandler } from '@/lib/api-utils';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';
import { findUserById, excludePassword } from '@/lib/services/auth.service';

// GET /api/auth/me - 현재 세션의 사용자 조회 (웹 클라이언트 세션 부트스트랩용)
export const GET = apiHandler('get current user', async (request: NextRequest) => {
  const session = await verifySessionToken(getTokenFromRequest(request));
  if (!session) {
    return errorResponse('Unauthorized', 401);
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return errorResponse('User not found', 404);
  }

  return successResponse({ user: excludePassword(user) });
});
