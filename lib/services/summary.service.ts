import { prisma } from '@/lib/prisma';
import { getMonthRange } from '@/lib/date-utils';
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
 * 월별 거래 요약 조회 - DB 레벨 집계로 최적화
 */
export async function getTransactionSummary(userId: string, year: number, month: number) {
  // 날짜 범위 설정
  const { startDate, endDate } = getMonthRange(year, month);

  const whereClause = {
    userId,
    deletedAt: null,
    date: { gte: startDate, lte: endDate },
  };

  // 현재 날짜 정보 (저축 목표 필터링용)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // 병렬로 DB 집계 쿼리 실행
  const [incomeAgg, expenseAgg, categoryStats, transactionCounts, activeSavingsData, monthlySavingsAgg] = await Promise.all([
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
    // 저축 목표 데이터 - DB 레벨에서 활성 목표만 필터링
    prisma.savingsGoal.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { targetYear: { gt: currentYear } },
          {
            targetYear: currentYear,
            targetMonth: { gte: currentMonth },
          },
        ],
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
    // 이번 달 저축 거래 합계
    prisma.transaction.aggregate({
      where: { ...whereClause, savingsGoalId: { not: null } },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totalIncome = incomeAgg._sum.amount || 0;
  const totalExpense = expenseAgg._sum.amount || 0;

  // 이번 달 저축 금액 및 건수
  const monthlySavingsAmount = monthlySavingsAgg._sum.amount || 0;
  const monthlySavingsCount = monthlySavingsAgg._count || 0;

  // 저축 목표 합계 (이미 DB에서 활성 목표만 필터링됨)
  const totalSavingsTarget = activeSavingsData.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const primaryGoal = activeSavingsData.find((goal) => goal.isPrimary);

  // 카테고리 정보 조회 (필요한 것만, defaultBudget 포함)
  const categoryIds = categoryStats.map((s) => s.categoryId!);
  const categories = categoryIds.length > 0
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: CATEGORY_WITH_BUDGET_SELECT,
      })
    : [];

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // 예산 조회 - 카테고리별 + 전체 예산을 한 번에 조회
  const allBudgets = await prisma.budget.findMany({
    where: {
      userId,
      month: startDate,
      deletedAt: null,
      OR: [
        { categoryId: { in: categoryIds } },
        { categoryId: null },
      ],
    },
  });

  // 카테고리별 예산 맵 + 전체 예산 분리
  const budgetMap = new Map<string | null, number>();
  let overallBudget: number | null = null;
  allBudgets.forEach((b) => {
    if (b.categoryId === null) {
      overallBudget = b.amount;
    } else {
      budgetMap.set(b.categoryId, b.amount);
    }
  });

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

  const monthlyBudget = overallBudget || 0;
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
      totalSavings: monthlySavingsAmount,
      netAmount: totalIncome - totalExpense,
      balance: totalIncome - totalExpense - monthlySavingsAmount,
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
