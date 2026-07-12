import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { errorResponse } from '@/lib/api-utils';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';

export interface AuthContext {
  userId: string;
  sessionToken: string;
}

/**
 * 인증이 필요한 API 라우트 핸들러 래퍼 - 세션 검증 + userId 주입 + try-catch/에러 로깅 자동 처리
 */
export function authenticatedHandler(
  operationName: string,
  handler: (request: NextRequest, auth: AuthContext) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const token = getTokenFromRequest(request);
      const session = await verifySessionToken(token);
      if (!session || !token) {
        return errorResponse('Unauthorized', 401);
      }
      return await handler(request, { userId: session.userId, sessionToken: token });
    } catch (error) {
      logger.error(`Failed to ${operationName}`, error);
      return errorResponse(`Failed to ${operationName}`, 500);
    }
  };
}

/**
 * 인증이 필요한, 동적 경로 파라미터가 있는 API 라우트 핸들러 래퍼
 */
export function authenticatedHandlerWithParams<P extends Record<string, string>>(
  operationName: string,
  handler: (request: NextRequest, params: P, auth: AuthContext) => Promise<NextResponse>
) {
  return async (request: NextRequest, { params }: { params: Promise<P> }) => {
    try {
      const token = getTokenFromRequest(request);
      const session = await verifySessionToken(token);
      if (!session || !token) {
        return errorResponse('Unauthorized', 401);
      }
      const resolvedParams = await params;
      return await handler(request, resolvedParams, { userId: session.userId, sessionToken: token });
    } catch (error) {
      logger.error(`Failed to ${operationName}`, error);
      return errorResponse(`Failed to ${operationName}`, 500);
    }
  };
}
