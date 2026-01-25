import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validateUserId } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

// GET /api/savings - 저축 목표 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // 목표일이 지나지 않은 목표만 DB 레벨에서 필터링
    const activeGoals = await prisma.savingsGoal.findMany({
      where: {
        userId: userId!,
        deletedAt: null,
        OR: [
          // 목표 연도가 현재 연도보다 큰 경우
          { targetYear: { gt: currentYear } },
          // 목표 연도가 현재 연도와 같고, 목표 월이 현재 월 이상인 경우
          {
            targetYear: currentYear,
            targetMonth: { gte: currentMonth },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    // 이번 달 시작/끝 날짜
    const thisMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const thisMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    // 각 목표별 이번 달 저축 금액 조회
    const goalIds = activeGoals.map((goal) => goal.id);
    const thisMonthTransactions = await prisma.transaction.groupBy({
      by: ['savingsGoalId'],
      where: {
        savingsGoalId: { in: goalIds },
        date: {
          gte: thisMonthStart,
          lte: thisMonthEnd,
        },
        deletedAt: null,
      },
      _sum: {
        amount: true,
      },
    });

    // 목표 ID → 이번 달 저축액 매핑
    const thisMonthSavingsMap = new Map<string, number>();
    thisMonthTransactions.forEach((t) => {
      if (t.savingsGoalId) {
        thisMonthSavingsMap.set(t.savingsGoalId, t._sum.amount || 0);
      }
    });

    // 진행률 및 월별 필요 금액 계산
    const goalsWithProgress = activeGoals.map((goal) => {
      // 총 개월 수 계산 (목표 생성일 ~ 목표일)
      const createdAt = new Date(goal.createdAt);
      const targetDate = new Date(goal.targetYear, goal.targetMonth - 1, 1);
      const totalMonths = Math.max(
        1,
        (targetDate.getFullYear() - createdAt.getFullYear()) * 12 + (targetDate.getMonth() - createdAt.getMonth())
      );

      // 월별 목표 저축액
      const monthlyTarget = Math.ceil(goal.targetAmount / totalMonths);

      // 이번 달 저축액
      const thisMonthSavings = thisMonthSavingsMap.get(goal.id) || 0;

      // 이번 달 남은 필요 금액 (음수 방지)
      const monthlyRequired = Math.max(0, monthlyTarget - thisMonthSavings);

      const progressPercent = goal.targetAmount > 0
        ? Math.round((goal.currentAmount / goal.targetAmount) * 100)
        : 0;

      return {
        id: goal.id,
        name: goal.name,
        icon: goal.icon,
        targetDate: `${goal.targetYear}년 ${goal.targetMonth}월 목표`,
        currentAmount: goal.currentAmount,
        targetAmount: goal.targetAmount,
        progressPercent,
        monthlyRequired,
        monthlyTarget,
        thisMonthSavings,
        targetYear: goal.targetYear,
        targetMonth: goal.targetMonth,
        isPrimary: goal.isPrimary,
      };
    });

    return successResponse(goalsWithProgress);
  } catch (error) {
    logger.error('Failed to fetch savings goals', error);
    return errorResponse('Failed to fetch savings goals', 500);
  }
}

// POST /api/savings - 저축 목표 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, icon, targetAmount, currentAmount, targetYear, targetMonth } = body;

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    if (!name || !icon || !targetAmount || !targetYear || !targetMonth) {
      return errorResponse('Missing required fields', 400);
    }

    const savingsGoal = await prisma.savingsGoal.create({
      data: {
        userId,
        name,
        icon,
        targetAmount,
        currentAmount: currentAmount || 0,
        targetYear,
        targetMonth,
      },
    });

    return successResponse(savingsGoal, 201);
  } catch (error) {
    logger.error('Failed to create savings goal', error);
    return errorResponse('Failed to create savings goal', 500);
  }
}
