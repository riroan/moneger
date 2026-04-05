import { prisma } from '@/lib/prisma';
import { getMonthRangeKST } from '@/lib/date-utils';
import { CATEGORY_WITH_BUDGET_SELECT } from '@/lib/prisma-selects';

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
 * 월별 DB 집계 데이터 조회
 */
async function fetchMonthlyAggregations(
  userId: string,
  startDate: Date,
  endDate: Date,
  currentYear: number,
  currentMonth: number
) {
  const whereClause = { userId, deletedAt: null, date: { gte: startDate, lte: endDate } };

  const [
    incomeAgg, expenseAgg, categoryStats, transactionCounts,
    activeSavingsData, monthlySavingsAgg,
    previousIncomeAgg, previousExpenseAgg, previousSavingsAgg,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: { ...whereClause, type: 'INCOME' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...whereClause, type: 'EXPENSE', savingsGoalId: null },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { ...whereClause, type: 'EXPENSE', categoryId: { not: null } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.groupBy({
      by: ['type'],
      where: whereClause,
      _count: true,
    }),
    prisma.savingsGoal.findMany({
      where: {
        userId, deletedAt: null,
        OR: [
          { targetYear: { gt: currentYear } },
          { targetYear: currentYear, targetMonth: { gte: currentMonth } },
        ],
      },
      select: {
        id: true, name: true, icon: true,
        currentAmount: true, targetAmount: true,
        targetYear: true, targetMonth: true, isPrimary: true,
      },
    }),
    prisma.transaction.aggregate({
      where: { ...whereClause, savingsGoalId: { not: null } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { userId, date: { lt: startDate }, type: 'INCOME', savingsGoalId: null, deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, date: { lt: startDate }, type: 'EXPENSE', savingsGoalId: null, deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, date: { lt: startDate }, savingsGoalId: { not: null }, deletedAt: null },
      _sum: { amount: true },
    }),
  ]);

  return {
    incomeAgg, expenseAgg, categoryStats, transactionCounts,
    activeSavingsData, monthlySavingsAgg,
    previousIncomeAgg, previousExpenseAgg, previousSavingsAgg,
  };
}

/**
 * 카테고리별 지출 통계 + 예산 정보 조합
 */
async function buildCategoryStats(
  userId: string,
  startDate: Date,
  categoryStats: { categoryId: string | null; _sum: { amount: number | null }; _count: number }[],
): Promise<CategorySummary[]> {
  const categoryIds = categoryStats.map((s) => s.categoryId!);

  const [categories, allBudgets] = await Promise.all([
    categoryIds.length > 0
      ? prisma.category.findMany({ where: { id: { in: categoryIds } }, select: CATEGORY_WITH_BUDGET_SELECT })
      : [],
    prisma.budget.findMany({
      where: {
        userId, month: startDate, deletedAt: null,
        OR: [{ categoryId: { in: categoryIds } }, { categoryId: null }],
      },
    }),
  ]);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const budgetMap = new Map<string | null, number>();
  allBudgets.forEach((b) => {
    budgetMap.set(b.categoryId, b.amount);
  });

  return categoryStats
    .map((stat): CategorySummary | null => {
      const category = categoryMap.get(stat.categoryId!);
      if (!category) return null;

      const hasMonthlyBudget = budgetMap.has(stat.categoryId!);
      const monthlyBudget = budgetMap.get(stat.categoryId!);
      const effectiveBudget = hasMonthlyBudget ? monthlyBudget : (category.defaultBudget ?? undefined);
      const spent = stat._sum.amount || 0;

      return {
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
      };
    })
    .filter((c): c is CategorySummary => c !== null)
    .sort((a, b) => b.total - a.total);
}

/**
 * 월별 거래 요약 조회 - DB 레벨 집계로 최적화
 */
export async function getTransactionSummary(userId: string, year: number, month: number) {
  const { startDate, endDate } = getMonthRangeKST(year, month);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // 1. DB 집계 데이터 조회
  const agg = await fetchMonthlyAggregations(userId, startDate, endDate, currentYear, currentMonth);

  // 2. 기본 금액 계산
  const carryOverBalance =
    (agg.previousIncomeAgg._sum.amount || 0) -
    (agg.previousExpenseAgg._sum.amount || 0) -
    (agg.previousSavingsAgg._sum.amount || 0);

  const totalIncome = agg.incomeAgg._sum.amount || 0;
  const totalExpense = agg.expenseAgg._sum.amount || 0;
  const monthlySavingsAmount = agg.monthlySavingsAgg._sum.amount || 0;
  const monthlySavingsCount = agg.monthlySavingsAgg._count || 0;

  // 3. 카테고리 통계 + 예산 조합
  const categoryList = await buildCategoryStats(userId, startDate, agg.categoryStats);

  // 4. 예산 계산
  const budgets = await prisma.budget.findMany({
    where: { userId, month: startDate, deletedAt: null, categoryId: null },
  });
  const monthlyBudget = budgets[0]?.amount || 0;
  const budgetUsed = totalExpense;
  const budgetRemaining = Math.max(0, monthlyBudget - budgetUsed);
  const budgetUsagePercent = monthlyBudget > 0
    ? Math.min(100, Math.round((budgetUsed / monthlyBudget) * 100))
    : 0;

  // 5. 거래 건수
  const incomeCount = agg.transactionCounts.find((t) => t.type === 'INCOME')?._count || 0;
  const expenseCount = agg.transactionCounts.find((t) => t.type === 'EXPENSE')?._count || 0;

  // 6. 저축 목표 요약
  const totalSavingsTarget = agg.activeSavingsData.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const primaryGoal = agg.activeSavingsData.find((goal) => goal.isPrimary);

  return {
    period: { year, month },
    summary: {
      totalIncome,
      totalExpense,
      totalSavings: monthlySavingsAmount,
      netAmount: totalIncome - totalExpense,
      balance: carryOverBalance + totalIncome - totalExpense - monthlySavingsAmount,
      carryOverBalance,
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
      totalAmount: monthlySavingsAmount,
      targetAmount: totalSavingsTarget,
      count: monthlySavingsCount,
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
