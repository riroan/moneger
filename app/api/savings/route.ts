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

    const savingsGoals = await prisma.savingsGoal.findMany({
      where: {
        userId: userId!,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // 목표일이 지나지 않은 목표만 필터링 (목표 월까지는 표시)
    const activeGoals = savingsGoals.filter((goal) => {
      // 목표 연도가 현재 연도보다 크면 표시
      if (goal.targetYear > currentYear) return true;
      // 목표 연도가 현재 연도와 같고, 목표 월이 현재 월 이상이면 표시
      if (goal.targetYear === currentYear && goal.targetMonth >= currentMonth) return true;
      return false;
    });

    // 진행률 및 월별 필요 금액 계산
    const goalsWithProgress = activeGoals.map((goal) => {
      const targetDate = new Date(goal.targetYear, goal.targetMonth - 1, 1);
      const monthsRemaining = Math.max(
        1,
        (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth())
      );
      const amountRemaining = Math.max(0, goal.targetAmount - goal.currentAmount);
      const monthlyRequired = Math.ceil(amountRemaining / monthsRemaining);
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
