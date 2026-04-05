import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

type TransactionClient = Prisma.TransactionClient;

/**
 * 저축 목표 조회 (soft delete 제외)
 */
export async function findSavingsGoal(id: string, userId: string) {
  return prisma.savingsGoal.findFirst({
    where: { id, userId, deletedAt: null },
  });
}

/**
 * 대표 목표 설정을 포함한 저축 목표 업데이트 (트랜잭션)
 */
export async function updateSavingsGoalWithPrimary(
  id: string,
  userId: string,
  data: {
    name?: string;
    icon?: string;
    targetAmount?: number;
    targetYear?: number;
    targetMonth?: number;
    isPrimary?: boolean;
  }
) {
  return prisma.$transaction(async (tx) => {
    if (data.isPrimary === true) {
      await tx.savingsGoal.updateMany({
        where: { userId, deletedAt: null, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    return tx.savingsGoal.update({
      where: { id },
      data: {
        ...data,
        ...(data.isPrimary !== undefined ? { isPrimary: data.isPrimary } : {}),
      },
    });
  });
}

/**
 * 대표 목표 토글 (트랜잭션)
 */
export async function togglePrimarySavingsGoal(id: string, userId: string, isPrimary: boolean) {
  return prisma.$transaction(async (tx) => {
    if (isPrimary === true) {
      await tx.savingsGoal.updateMany({
        where: { userId, deletedAt: null, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    return tx.savingsGoal.update({
      where: { id },
      data: { isPrimary },
    });
  });
}

/**
 * 저축 목표 소프트 삭제
 */
export async function deleteSavingsGoal(id: string) {
  return prisma.savingsGoal.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/**
 * 저축 입금 (목표 금액 업데이트 + 거래 생성 + DailyBalance 업데이트)
 */
export async function depositToSavingsGoal(
  tx: TransactionClient,
  goalId: string,
  userId: string,
  amount: number,
  goalName: string,
  currentAmount: number,
  date: Date
) {
  const updatedGoal = await tx.savingsGoal.update({
    where: { id: goalId },
    data: { currentAmount: currentAmount + amount },
  });

  const transaction = await tx.transaction.create({
    data: {
      userId,
      amount,
      type: 'EXPENSE',
      description: `${goalName} 저축`,
      categoryId: null,
      savingsGoalId: goalId,
      date,
    },
  });

  return { updatedGoal, transaction };
}

/**
 * 활성 저축 목표 목록 + 진행률 조회
 */
export async function getActiveSavingsGoalsWithProgress(userId: string) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // 목표일이 지나지 않은 목표만 조회
  const activeGoals = await prisma.savingsGoal.findMany({
    where: {
      userId,
      deletedAt: null,
      OR: [
        { targetYear: { gt: currentYear } },
        { targetYear: currentYear, targetMonth: { gte: currentMonth } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  // 이번 달 저축 금액 조회
  const thisMonthStart = new Date(currentYear, currentMonth - 1, 1);
  const thisMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  const goalIds = activeGoals.map((goal) => goal.id);
  const thisMonthTransactions = await prisma.transaction.groupBy({
    by: ['savingsGoalId'],
    where: {
      savingsGoalId: { in: goalIds },
      date: { gte: thisMonthStart, lte: thisMonthEnd },
      deletedAt: null,
    },
    _sum: { amount: true },
  });

  const thisMonthSavingsMap = new Map<string, number>();
  thisMonthTransactions.forEach((t) => {
    if (t.savingsGoalId) {
      thisMonthSavingsMap.set(t.savingsGoalId, t._sum.amount || 0);
    }
  });

  // 진행률 및 월별 필요 금액 계산
  return activeGoals.map((goal) => {
    const startYear = goal.startYear ?? new Date(goal.createdAt).getFullYear();
    const startMonth = goal.startMonth ?? (new Date(goal.createdAt).getMonth() + 1);
    const targetDate = new Date(goal.targetYear, goal.targetMonth - 1, 1);
    const startDate = new Date(startYear, startMonth - 1, 1);
    const totalMonths = Math.max(
      1,
      (targetDate.getFullYear() - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth()) + 1
    );

    const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
    const monthlyTarget = Math.ceil(remainingAmount / totalMonths);
    const thisMonthSavings = thisMonthSavingsMap.get(goal.id) || 0;
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
      startYear,
      startMonth,
      targetYear: goal.targetYear,
      targetMonth: goal.targetMonth,
      isPrimary: goal.isPrimary,
    };
  });
}
