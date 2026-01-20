import { NextRequest } from 'next/server';
import {
  successResponse,
  successResponseWithMessage,
  errorResponse,
  validateUserId,
} from '@/lib/api-utils';
import {
  saveDailyBalance,
  getRecentDailyBalances,
  calculateDailyBalancesFromTransactions,
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
    console.error('Daily balance save failed:', error);
    return errorResponse('일별 잔액 저장 중 오류가 발생했습니다', 500);
  }
}

// GET /api/daily-balance?userId=xxx&days=5 - 최근 N일 잔액 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const days = parseInt(searchParams.get('days') || '5', 10);

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    // 최근 N일 데이터 조회
    const dailyBalances = await getRecentDailyBalances(userId!, days);

    // 데이터가 없으면 거래 데이터로부터 계산
    if (dailyBalances.length === 0) {
      const calculatedBalances = await calculateDailyBalancesFromTransactions(userId!, days);
      return successResponseWithMessage(calculatedBalances, '거래 데이터로부터 계산된 잔액입니다');
    }

    return successResponse(dailyBalances);
  } catch (error) {
    console.error('Daily balance fetch failed:', error);
    return errorResponse('일별 잔액 조회 중 오류가 발생했습니다', 500);
  }
}
