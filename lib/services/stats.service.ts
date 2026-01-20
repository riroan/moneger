import { prisma } from '@/lib/prisma';

const CATEGORY_SELECT = {
  id: true,
  name: true,
  type: true,
  color: true,
  icon: true,
} as const;

interface CategoryStat {
  categoryId: string;
  categoryName: string;
  color: string | null;
  icon: string | null;
  count: number;
  total: number;
}

/**
 * 월별 통계 조회
 */
export async function getMonthlyStats(userId: string, year: number, month: number) {
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
  const balance = totalIncome - totalExpense;

  // 카테고리별 지출 통계
  const categoryStats: Record<string, CategoryStat> = {};

  expenseTransactions
    .filter((t) => t.category)
    .forEach((t) => {
      const catId = t.categoryId!;
      if (!categoryStats[catId]) {
        categoryStats[catId] = {
          categoryId: catId,
          categoryName: t.category!.name,
          color: t.category!.color,
          icon: t.category!.icon,
          count: 0,
          total: 0,
        };
      }
      categoryStats[catId].count++;
      categoryStats[catId].total += t.amount;
    });

  const categoryBreakdown = Object.values(categoryStats).sort((a, b) => b.total - a.total);

  // 예산 정보 조회
  const budget = await prisma.budget.findFirst({
    where: { userId, deletedAt: null, month: startDate },
  });

  const budgetAmount = budget?.amount || 0;
  const budgetUsed = totalExpense;
  const budgetRemaining = Math.max(0, budgetAmount - budgetUsed);
  const budgetUsagePercent = budgetAmount > 0
    ? Math.min(100, Math.round((budgetUsed / budgetAmount) * 100))
    : 0;

  // 일별 지출 통계 (최근 7일)
  const last7Days = getLast7DaysExpenses(transactions);

  return {
    summary: {
      totalIncome,
      totalExpense,
      balance,
      incomeCount: incomeTransactions.length,
      expenseCount: expenseTransactions.length,
      transactionCount: transactions.length,
    },
    budget: {
      amount: budgetAmount,
      used: budgetUsed,
      remaining: budgetRemaining,
      usagePercent: budgetUsagePercent,
    },
    categoryBreakdown,
    last7Days,
  };
}

/**
 * 최근 7일 일별 지출 계산
 */
function getLast7DaysExpenses(transactions: any[]) {
  const last7Days: { date: string; amount: number }[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);

    const dayExpenses = transactions
      .filter((t) => t.type === 'EXPENSE' && t.date >= date && t.date < nextDate)
      .reduce((sum, t) => sum + t.amount, 0);

    last7Days.push({
      date: date.toISOString().split('T')[0],
      amount: dayExpenses,
    });
  }

  return last7Days;
}
