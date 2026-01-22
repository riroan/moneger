import { prisma } from '@/lib/prisma';

interface CategorySummary {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  count: number;
  total: number;
  budget?: number;
  budgetUsagePercent?: number;
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
  const [incomeAgg, expenseAgg, categoryStats, transactionCounts, savingsData] = await Promise.all([
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
    // 저축 목표 데이터
    prisma.savingsGoal.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        icon: true,
        currentAmount: true,
        targetAmount: true,
        targetYear: true,
        targetMonth: true,
        isPrimary: true,
      },
    }),
  ]);

  const totalIncome = incomeAgg._sum.amount || 0;
  const totalExpense = expenseAgg._sum.amount || 0;

  // 목표일이 지나지 않은 저축 목표만 필터링
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const activeSavingsData = savingsData.filter((goal) => {
    if (goal.targetYear > currentYear) return true;
    if (goal.targetYear === currentYear && goal.targetMonth >= currentMonth) return true;
    return false;
  });

  const totalSavings = activeSavingsData.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalSavingsTarget = activeSavingsData.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const savingsCount = activeSavingsData.length;
  const primaryGoal = activeSavingsData.find((goal) => goal.isPrimary);

  // 카테고리 정보 조회 (필요한 것만, defaultBudget 포함)
  const categoryIds = categoryStats.map((s) => s.categoryId!);
  const categories = categoryIds.length > 0
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, icon: true, color: true, defaultBudget: true },
      })
    : [];

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // 카테고리별 예산 조회
  const categoryBudgets = await prisma.budget.findMany({
    where: {
      userId,
      month: startDate,
      categoryId: { in: categoryIds },
      deletedAt: null,
    },
  });
  const budgetMap = new Map(categoryBudgets.map((b) => [b.categoryId, b.amount]));

  // 카테고리별 통계 매핑 (예산 정보 포함)
  const categoryList: CategorySummary[] = categoryStats
    .map((stat): CategorySummary | null => {
      const category = categoryMap.get(stat.categoryId!);
      // 월별 예산 레코드가 있으면 해당 값 사용, 없으면 기본 예산 자동 적용
      const hasMonthlyBudget = budgetMap.has(stat.categoryId!);
      const monthlyBudget = budgetMap.get(stat.categoryId!);
      const effectiveBudget = hasMonthlyBudget ? monthlyBudget : (category?.defaultBudget ?? undefined);
      const spent = stat._sum.amount || 0;
      return category
        ? {
            id: category.id,
            name: category.name,
            icon: category.icon,
            color: category.color,
            count: stat._count,
            total: spent,
            budget: effectiveBudget,
            budgetUsagePercent: effectiveBudget && effectiveBudget > 0
              ? Math.round((spent / effectiveBudget) * 100)
              : undefined,
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
      totalSavings,
      netAmount: totalIncome - totalExpense,
      balance: totalIncome - totalExpense - totalSavings,
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
    savings: {
      totalAmount: totalSavings,
      targetAmount: totalSavingsTarget,
      count: savingsCount,
      primaryGoal: primaryGoal
        ? {
            id: primaryGoal.id,
            name: primaryGoal.name,
            icon: primaryGoal.icon,
            currentAmount: primaryGoal.currentAmount,
            targetAmount: primaryGoal.targetAmount,
            targetDate: `${primaryGoal.targetYear}년 ${primaryGoal.targetMonth}월 목표`,
            progressPercent: primaryGoal.targetAmount > 0
              ? Math.round((primaryGoal.currentAmount / primaryGoal.targetAmount) * 100)
              : 0,
          }
        : null,
    },
  };
}
