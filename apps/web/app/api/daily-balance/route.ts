import { NextRequest } from 'next/server';
import {
  successResponse,
  successResponseWithMessage,
  errorResponse,
  validateUserId,
} from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import {
  saveDailyBalance,
  getRecentDailyBalances,
  getMonthlyDailyBalances,
} from '@/lib/services/daily-balance.service';

// POST /api/daily-balance - 일별 잔액 스냅샷 저장
export async function POST(request: NextRequest) {
  try {
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
  } catch (error) {
    logger.error('Daily balance save failed', error);
    return errorResponse('일별 잔액 저장 중 오류가 발생했습니다', 500);
  }
}

// GET /api/daily-balance?userId=xxx&days=5 - 최근 N일 잔액 조회
// GET /api/daily-balance?userId=xxx&year=2024&month=1 - 특정 월의 일별 잔액 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const days = parseInt(searchParams.get('days') || '5', 10);

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    // 월별 조회 모드
    if (year && month) {
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10);

      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return errorResponse('유효하지 않은 year 또는 month 값입니다', 400);
      }

      const monthlyBalances = await getMonthlyDailyBalances(userId!, yearNum, monthNum);
      // 60초 캐시, 5분간 stale-while-revalidate
      return successResponse(monthlyBalances, 200, { maxAge: 60, staleWhileRevalidate: 300 });
    }

    // 최근 N일 데이터 조회 - DailyBalance 테이블에서 직접 조회
    const dailyBalances = await getRecentDailyBalances(userId!, days);
    return successResponse(dailyBalances);
  } catch (error) {
    logger.error('Daily balance fetch failed', error);
    return errorResponse('일별 잔액 조회 중 오류가 발생했습니다', 500);
  }
}
