import { prisma } from '@/lib/prisma';

/**
 * 그룹 단일 조회 (soft delete 제외)
 */
export async function findGroup(id: string, userId: string) {
  return prisma.transactionGroup.findFirst({
    where: { id, userId, deletedAt: null },
  });
}

/**
 * 그룹 중복 확인
 */
export async function findDuplicateGroup(userId: string, name: string, excludeId?: string) {
  return prisma.transactionGroup.findFirst({
    where: {
      userId,
      name,
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

/**
 * 그룹 생성
 */
export async function createGroup(
  userId: string,
  data: { name: string; description?: string; icon?: string; color?: string }
) {
  return prisma.transactionGroup.create({
    data: {
      userId,
      name: data.name,
      description: data.description || null,
      icon: data.icon || null,
      color: data.color || null,
    },
  });
}

/**
 * 그룹 수정
 */
export async function updateGroup(
  id: string,
  data: { name?: string; description?: string; icon?: string; color?: string }
) {
  return prisma.transactionGroup.update({
    where: { id },
    data,
  });
}

/**
 * 그룹 삭제 (soft delete + 거래 연결 해제)
 */
export async function deleteGroup(id: string) {
  return prisma.$transaction(async (tx) => {
    await tx.transaction.updateMany({
      where: { groupId: id },
      data: { groupId: null },
    });

    return tx.transactionGroup.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  });
}

/**
 * 사용자의 모든 그룹 + 요약 정보 조회
 */
export async function getGroupsWithSummary(userId: string) {
  const groups = await prisma.transactionGroup.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (groups.length === 0) return [];

  const groupIds = groups.map((g) => g.id);

  // 그룹별 수입/지출 집계
  const aggregations = await prisma.transaction.groupBy({
    by: ['groupId', 'type'],
    where: {
      groupId: { in: groupIds },
      deletedAt: null,
    },
    _sum: { amount: true },
    _count: true,
  });

  // 그룹별 집계 매핑
  const summaryMap = new Map<string, { totalIncome: number; totalExpense: number; incomeCount: number; expenseCount: number; transactionCount: number }>();
  aggregations.forEach((agg) => {
    if (!agg.groupId) return;
    const existing = summaryMap.get(agg.groupId) || { totalIncome: 0, totalExpense: 0, incomeCount: 0, expenseCount: 0, transactionCount: 0 };
    if (agg.type === 'INCOME') {
      existing.totalIncome += agg._sum.amount || 0;
      existing.incomeCount += agg._count;
    } else {
      existing.totalExpense += agg._sum.amount || 0;
      existing.expenseCount += agg._count;
    }
    existing.transactionCount += agg._count;
    summaryMap.set(agg.groupId, existing);
  });

  return groups.map((group) => {
    const summary = summaryMap.get(group.id) || { totalIncome: 0, totalExpense: 0, incomeCount: 0, expenseCount: 0, transactionCount: 0 };
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      icon: group.icon,
      color: group.color,
      totalIncome: summary.totalIncome,
      totalExpense: summary.totalExpense,
      netAmount: summary.totalIncome - summary.totalExpense,
      incomeCount: summary.incomeCount,
      expenseCount: summary.expenseCount,
      transactionCount: summary.transactionCount,
    };
  });
}

/**
 * 그룹 상세 + 요약 조회
 */
export async function getGroupDetail(id: string, userId: string) {
  const group = await prisma.transactionGroup.findFirst({
    where: { id, userId, deletedAt: null },
  });

  if (!group) return null;

  const [incomeAgg, expenseAgg, transactionCount] = await Promise.all([
    prisma.transaction.aggregate({
      where: { groupId: id, type: 'INCOME', deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { groupId: id, type: 'EXPENSE', deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.transaction.count({
      where: { groupId: id, deletedAt: null },
    }),
  ]);

  const totalIncome = incomeAgg._sum.amount || 0;
  const totalExpense = expenseAgg._sum.amount || 0;

  return {
    ...group,
    totalIncome,
    totalExpense,
    netAmount: totalIncome - totalExpense,
    transactionCount,
  };
}
