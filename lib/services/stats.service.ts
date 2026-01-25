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
 * 월별 통계 조회 - DB 집계로 최적화
 */
export async function getMonthlyStats(userId: string, year: number, month: number) {
  // 날짜 범위 설정
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // 병렬로 DB 집계 쿼리 실행
  const [
    incomeAgg,
    expenseAgg,
    incomeCount,
    expenseCount,
    categoryGrouped,
    categories,
  ] = await Promise.all([
    // 총 수입
    prisma.transaction.aggregate({
      where: { userId, deletedAt: null, date: { gte: startDate, lte: endDate }, type: 'INCOME' },
      _sum: { amount: true },
    }),
    // 총 지출
    prisma.transaction.aggregate({
      where: { userId, deletedAt: null, date: { gte: startDate, lte: endDate }, type: 'EXPENSE' },
      _sum: { amount: true },
    }),
    // 수입 건수
    prisma.transaction.count({
      where: { userId, deletedAt: null, date: { gte: startDate, lte: endDate }, type: 'INCOME' },
    }),
    // 지출 건수
    prisma.transaction.count({
      where: { userId, deletedAt: null, date: { gte: startDate, lte: endDate }, type: 'EXPENSE' },
    }),
    // 카테고리별 지출 집계
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, deletedAt: null, date: { gte: startDate, lte: endDate }, type: 'EXPENSE', categoryId: { not: null } },
      _sum: { amount: true },
      _count: true,
    }),
    // 카테고리 정보 (한 번만 조회)
    prisma.category.findMany({
      where: { userId, deletedAt: null },
      select: CATEGORY_SELECT,
    }),
  ]);

  const totalIncome = incomeAgg._sum.amount || 0;
  const totalExpense = expenseAgg._sum.amount || 0;
  const balance = totalIncome - totalExpense;

  // 카테고리 맵 생성
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // 카테고리별 지출 통계 생성
  const categoryBreakdown: CategoryStat[] = categoryGrouped
    .map((group) => {
      const cat = categoryMap.get(group.categoryId!);
      if (!cat) return null;
      return {
        categoryId: group.categoryId!,
        categoryName: cat.name,
        color: cat.color,
        icon: cat.icon,
        count: group._count,
        total: group._sum.amount || 0,
      };
    })
    .filter((item): item is CategoryStat => item !== null)
    .sort((a, b) => b.total - a.total);

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

  // 일별 지출 통계 (최근 7일) - DB 집계 사용
  const last7Days = await getLast7DaysExpensesFromDB(userId);

  return {
    summary: {
      totalIncome,
      totalExpense,
      balance,
      incomeCount,
      expenseCount,
      transactionCount: incomeCount + expenseCount,
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
 * 최근 7일 일별 지출 계산 - DB 집계 사용
 */
async function getLast7DaysExpensesFromDB(userId: string) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);

  // DB에서 일별 지출 집계
  const dailyExpenses = await prisma.transaction.groupBy({
    by: ['date'],
    where: {
      userId,
      deletedAt: null,
      type: 'EXPENSE',
      date: { gte: startDate, lte: today },
    },
    _sum: { amount: true },
  });

  // 날짜별 맵 생성
  const expenseMap = new Map<string, number>();
  dailyExpenses.forEach((item) => {
    const dateKey = new Date(item.date).toISOString().split('T')[0];
    expenseMap.set(dateKey, (expenseMap.get(dateKey) || 0) + (item._sum.amount || 0));
  });

  // 최근 7일 결과 생성
  const last7Days: { date: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    last7Days.push({
      date: dateKey,
      amount: expenseMap.get(dateKey) || 0,
    });
  }

  return last7Days;
}
