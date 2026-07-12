import { NextRequest } from 'next/server';
import { successResponseWithMessage, apiHandler } from '@/lib/api-utils';
import { getTokenFromRequest, deleteSessionByToken, buildClearedSessionCookie } from '@/lib/session';

// POST /api/auth/logout - 로그아웃
export const POST = apiHandler('logout', async (request: NextRequest) => {
  const token = getTokenFromRequest(request);
  if (token) {
    await deleteSessionByToken(token);
  }

  const response = successResponseWithMessage(null, '로그아웃되었습니다');
  response.cookies.set(buildClearedSessionCookie());
  return response;
});
