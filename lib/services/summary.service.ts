import { prisma } from '@/lib/prisma';

const CATEGORY_SELECT = {
  id: true,
  name: true,
  type: true,
  color: true,
  icon: true,
} as const;

interface CategorySummary {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  count: number;
  total: number;
}

/**
 * 월별 거래 요약 조회
 */
export async function getTransactionSummary(userId: string, year: number, month: number) {
  // 날짜 범위 설정
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // 해당 월의 모든 거래 조회
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      date: { gte: startDate, lte: endDate },
    },
    include: { category: { select: CATEGORY_SELECT } },
  });

  // 수입/지출 계산
  const incomeTransactions = transactions.filter((t) => t.type === 'INCOME');
  const expenseTransactions = transactions.filter((t) => t.type === 'EXPENSE');

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

  // 카테고리별 지출 통계
  const categoryStats: Record<string, CategorySummary> = {};

  expenseTransactions
    .filter((t) => t.category)
    .forEach((t) => {
      const catId = t.categoryId!;
      if (!categoryStats[catId]) {
        categoryStats[catId] = {
          id: t.category!.id,
          name: t.category!.name,
          icon: t.category!.icon,
          color: t.category!.color,
          count: 0,
          total: 0,
        };
      }
      categoryStats[catId].count++;
      categoryStats[catId].total += t.amount;
    });

  const categoryList = Object.values(categoryStats).sort((a, b) => b.total - a.total);

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
      income: incomeTransactions.length,
      expense: expenseTransactions.length,
      total: transactions.length,
    },
  };
}
