import { NextRequest } from 'next/server';
import {
  successResponse,
  successResponseWithMessage,
  errorResponse,
  validateUserId,
  apiHandler,
  parseYearMonth,
  isErrorResponse,
} from '@/lib/api-utils';
import {
  saveDailyBalance,
  getRecentDailyBalances,
  getMonthlyDailyBalances,
} from '@/lib/services/daily-balance.service';

// POST /api/daily-balance - 일별 잔액 스냅샷 저장
export const POST = apiHandler('save daily balance', async (request: NextRequest) => {
  const body = await request.json();
  const { userId, date, balance, income, expense } = body;

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  if (!date) {
    return errorResponse('date is required', 400);
  }

  const dailyBalance = await saveDailyBalance(
    userId,
    new Date(date),
    balance ?? 0,
    income ?? 0,
    expense ?? 0
  );

  return successResponseWithMessage(dailyBalance, '일별 잔액이 저장되었습니다');
});

// GET /api/daily-balance?userId=xxx&days=5 - 최근 N일 잔액 조회
// GET /api/daily-balance?userId=xxx&year=2024&month=1 - 특정 월의 일별 잔액 조회
export const GET = apiHandler('fetch daily balance', async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  const days = parseInt(searchParams.get('days') || '5', 10);

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  // 월별 조회 모드
  if (year && month) {
    const parsed = parseYearMonth(searchParams);
    if (isErrorResponse(parsed)) return parsed;

    const monthlyBalances = await getMonthlyDailyBalances(userId!, parsed.year, parsed.month);
    return successResponse(monthlyBalances);
  }

  // 최근 N일 데이터 조회 - DailyBalance 테이블에서 직접 조회
  const dailyBalances = await getRecentDailyBalances(userId!, days);
  return successResponse(dailyBalances);
});
