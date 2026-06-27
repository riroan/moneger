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

  // 목표별 최근 입금 5개 (아코디언 첫 페이지 embed). 입금 = EXPENSE + savingsGoalId.
  // 편집/삭제 모달(EditSavingsTransactionModal)이 받는 TransactionWithCategory 형태로 shape.
  // 결정적 정렬(date desc, id desc)로 동일 날짜 입금도 안정적.
  const recentLists = await Promise.all(
    goalIds.map((goalId) =>
      prisma.transaction.findMany({
        where: { savingsGoalId: goalId, type: 'EXPENSE', deletedAt: null },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        take: 5,
        select: { id: true, amount: true, type: true, description: true, date: true, savingsGoalId: true },
      })
    )
  );
  const recentByGoal = new Map(
    goalIds.map((goalId, i) => [
      goalId,
      recentLists[i].map((t) => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        description: t.description,
        date: t.date.toISOString(),
        categoryId: null,
        category: null,
        savingsGoalId: t.savingsGoalId,
      })),
    ])
  );

  // 목표별 전체 입금 건수 (회차 번호 계산용). 입금 목록은 date desc 정렬이므로
  // 표시 인덱스 i의 회차 = depositCount - i (가장 오래된 입금이 1회차).
  const depositCounts = await prisma.transaction.groupBy({
    by: ['savingsGoalId'],
    where: { savingsGoalId: { in: goalIds }, type: 'EXPENSE', deletedAt: null },
    _count: { _all: true },
  });
  const depositCountByGoal = new Map(
    depositCounts.map((d) => [d.savingsGoalId, d._count._all])
  );

  // 진행률 및 월별 필요 금액 계산
  return activeGoals.map((goal) => {
    const startYear = goal.startYear ?? new Date(goal.createdAt).getFullYear();
    const startMonth = goal.startMonth ?? (new Date(goal.createdAt).getMonth() + 1);
    const targetDate = new Date(goal.targetYear, goal.targetMonth - 1, 1);

    // 남은 개월 수: 이번 달부터 목표 월까지
    const nowDate = new Date(currentYear, currentMonth - 1, 1);
    const remainingMonths = Math.max(
      1,
      (targetDate.getFullYear() - nowDate.getFullYear()) * 12 + (targetDate.getMonth() - nowDate.getMonth()) + 1
    );

    const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
    const monthlyTarget = Math.ceil(remainingAmount / remainingMonths);
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
      recentDeposits: recentByGoal.get(goal.id) ?? [],
      depositCount: depositCountByGoal.get(goal.id) ?? 0,
    };
  });
}

/**
 * 저축 목표에 증권 계좌 연결 설정 (1목표 ↔ N계좌).
 *
 *   accountIds(새 목록) ──> 이 목표에 연결 (다른 목표에 있었어도 이동)
 *   기존에 이 목표였지만 목록에 없는 계좌 ──> 연결 해제(savingsGoalId=null)
 *
 * 모든 계좌는 해당 유저 소유(connection.userId)여야 한다. 하나라도 아니면 거부.
 * 연결되면 monthly-asset.service가 그 목표의 원금을 savingsKrw에서 제외(평가액이 대신
 * 카운트)해 이중계상을 막는다.
 */
export async function setSavingsGoalLinkedAccounts(
  goalId: string,
  userId: string,
  accountIds: string[]
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const unique = [...new Set(accountIds)];

  if (unique.length > 0) {
    // 소유권 검증: 모든 계좌가 이 유저의 (삭제 안 된) connection 소속이어야 한다.
    const owned = await prisma.brokerageAccount.count({
      where: { id: { in: unique }, connection: { userId, deletedAt: null } },
    });
    if (owned !== unique.length) {
      return { ok: false, reason: 'One or more brokerage accounts do not belong to the user' };
    }
  }

  const clearWhere =
    unique.length > 0
      ? { savingsGoalId: goalId, id: { notIn: unique } }
      : { savingsGoalId: goalId };

  await prisma.$transaction([
    // 이 목표에서 빠진 계좌 연결 해제
    prisma.brokerageAccount.updateMany({ where: clearWhere, data: { savingsGoalId: null } }),
    // 새 목록의 계좌를 이 목표에 연결
    ...(unique.length > 0
      ? [prisma.brokerageAccount.updateMany({ where: { id: { in: unique } }, data: { savingsGoalId: goalId } })]
      : []),
  ]);

  return { ok: true };
}
