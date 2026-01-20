import { NextResponse } from 'next/server';

/**
 * 성공 응답 생성
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
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
