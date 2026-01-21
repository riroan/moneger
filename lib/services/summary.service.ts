import { prisma } from '@/lib/prisma';

interface CategorySummary {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  count: number;
  total: number;
}

/**
 * 월별 거래 요약 조회 - DB 레벨 집계로 최적화
 */
export async function getTransactionSummary(userId: string, year: number, month: number) {
  // 날짜 범위 설정
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const whereClause = {
    userId,
    deletedAt: null,
    date: { gte: startDate, lte: endDate },
  };

  // 병렬로 DB 집계 쿼리 실행
  const [incomeAgg, expenseAgg, categoryStats, transactionCounts] = await Promise.all([
    // 수입 합계
    prisma.transaction.aggregate({
      where: { ...whereClause, type: 'INCOME' },
      _sum: { amount: true },
    }),
    // 지출 합계
    prisma.transaction.aggregate({
      where: { ...whereClause, type: 'EXPENSE' },
      _sum: { amount: true },
    }),
    // 카테고리별 지출 통계 (groupBy)
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { ...whereClause, type: 'EXPENSE', categoryId: { not: null } },
      _sum: { amount: true },
      _count: true,
    }),
    // 거래 건수
    prisma.transaction.groupBy({
      by: ['type'],
      where: whereClause,
      _count: true,
    }),
  ]);

  const totalIncome = incomeAgg._sum.amount || 0;
  const totalExpense = expenseAgg._sum.amount || 0;

  // 카테고리 정보 조회 (필요한 것만)
  const categoryIds = categoryStats.map((s) => s.categoryId!);
  const categories = categoryIds.length > 0
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, icon: true, color: true },
      })
    : [];

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // 카테고리별 통계 매핑
  const categoryList: CategorySummary[] = categoryStats
    .map((stat) => {
      const category = categoryMap.get(stat.categoryId!);
      return category
        ? {
            id: category.id,
            name: category.name,
            icon: category.icon,
            color: category.color,
            count: stat._count,
            total: stat._sum.amount || 0,
          }
        : null;
    })
    .filter((c): c is CategorySummary => c !== null)
    .sort((a, b) => b.total - a.total);

  // 거래 건수 계산
  const incomeCount = transactionCounts.find((t) => t.type === 'INCOME')?._count || 0;
  const expenseCount = transactionCounts.find((t) => t.type === 'EXPENSE')?._count || 0;

  // 예산 정보 조회
  const budget = await prisma.budget.findFirst({
    where: {
      userId,
      month: {
        gte: startDate,
        lt: new Date(year, month, 1),
      },
      deletedAt: null,
      categoryId: null,
    },
  });

  const monthlyBudget = budget?.amount || 0;
  const budgetUsed = totalExpense;
  const budgetRemaining = Math.max(0, monthlyBudget - budgetUsed);
  const budgetUsagePercent = monthlyBudget > 0
    ? Math.min(100, Math.round((budgetUsed / monthlyBudget) * 100))
    : 0;

  return {
    period: { year, month },
    summary: {
      totalIncome,
      totalExpense,
      netAmount: totalIncome - totalExpense,
      balance: totalIncome - totalExpense,
    },
    budget: {
      amount: monthlyBudget,
      used: budgetUsed,
      remaining: budgetRemaining,
      usagePercent: budgetUsagePercent,
    },
    categories: categoryList,
    transactionCount: {
      income: incomeCount,
      expense: expenseCount,
      total: incomeCount + expenseCount,
    },
  };
}
