import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// 캐시 헤더 옵션
interface CacheOptions {
  maxAge?: number; // 초 단위
  staleWhileRevalidate?: number; // 초 단위
}

/**
 * 캐시 헤더가 포함된 응답 생성
 */
function createResponseWithCache<T>(
  body: T,
  status: number,
  cacheOptions?: CacheOptions
) {
  const headers: Record<string, string> = {};

  if (cacheOptions) {
    const { maxAge = 0, staleWhileRevalidate = 0 } = cacheOptions;
    headers['Cache-Control'] = `private, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`;
  }

  return NextResponse.json(body, { status, headers });
}

/**
 * 성공 응답 생성
 */
export function successResponse<T>(data: T, status = 200, cacheOptions?: CacheOptions) {
  return createResponseWithCache({ success: true, data }, status, cacheOptions);
}

/**
 * 성공 응답 with 메시지
 */
export function successResponseWithMessage<T>(data: T, message: string, status = 200) {
  return NextResponse.json({ success: true, data, message }, { status });
}

/**
 * 에러 응답 생성
 */
export function errorResponse(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/**
 * 목록 응답 생성 (with count)
 */
export function listResponse<T>(data: T[], count: number, status = 200, cacheOptions?: CacheOptions) {
  return createResponseWithCache({ success: true, data, count }, status, cacheOptions);
}

/**
 * 페이지네이션 응답 생성
 */
export function paginatedResponse<T>(
  data: T[],
  count: number,
  nextCursor: string | null,
  hasMore: boolean
) {
  return NextResponse.json({
    success: true,
    data,
    count,
    nextCursor,
    hasMore,
  });
}

/**
 * userId 필수 검증
 */
export function validateUserId(userId: string | null): NextResponse | null {
  if (!userId) {
    return errorResponse('userId is required', 400);
  }
  return null;
}

/**
 * 거래 타입 검증
 */
export function validateTransactionType(type: string | null): NextResponse | null {
  if (!type || (type !== 'INCOME' && type !== 'EXPENSE')) {
    return errorResponse('type must be INCOME or EXPENSE', 400);
  }
  return null;
}

/**
 * 금액 검증
 */
export function validateAmount(amount: number | null | undefined): NextResponse | null {
  if (!amount || amount <= 0) {
    return errorResponse('amount must be greater than 0', 400);
  }
  return null;
}

/**
 * year, month 쿼리 파라미터 파싱 및 검증
 */
export function parseYearMonth(searchParams: URLSearchParams): { year: number; month: number } | NextResponse {
  const yearStr = searchParams.get('year');
  const monthStr = searchParams.get('month');

  if (!yearStr || !monthStr) {
    return errorResponse('year and month are required', 400);
  }

  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return errorResponse('유효하지 않은 year 또는 month 값입니다', 400);
  }

  return { year, month };
}

/**
 * NextResponse 타입 가드
 */
export function isErrorResponse(result: unknown): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * API 라우트 핸들러 래퍼 - try-catch, 에러 로깅을 자동 처리
 */
export function apiHandler(operationName: string, handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    try {
      return await handler(request);
    } catch (error) {
      logger.error(`Failed to ${operationName}`, error);
      return errorResponse(`Failed to ${operationName}`, 500);
    }
  };
}

/**
 * 동적 경로 파라미터가 있는 API 라우트 핸들러 래퍼
 */
export function apiHandlerWithParams<P extends Record<string, string>>(
  operationName: string,
  handler: (request: NextRequest, params: P) => Promise<NextResponse>
) {
  return async (request: NextRequest, { params }: { params: Promise<P> }) => {
    try {
      const resolvedParams = await params;
      return await handler(request, resolvedParams);
    } catch (error) {
      logger.error(`Failed to ${operationName}`, error);
      return errorResponse(`Failed to ${operationName}`, 500);
    }
  };
}
