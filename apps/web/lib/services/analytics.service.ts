import { prisma } from '@/lib/prisma';
import { getMonthRangeKST } from '@/lib/date-utils';

export interface MonthlyAnalytics {
  year: number;
  month: number;
  income: number;
  expense: number;
  savingsDeposit: number;
  net: number;
}

export interface CategoryTrend {
  id: string;
  name: string;
  color: string | null;
}

export interface AnalyticsResult {
  months: MonthlyAnalytics[];
  averages: {
    income: number;
    expense: number;
  };
  monthlyTarget: number | null;
  categoryTrends: {
    categories: CategoryTrend[];
    data: Record<string, number | string>[];
  };
  dowPattern: { day: string; amount: number }[];
}

/**
 * N개월치 수입/지출/저축 집계를 병렬로 조회
 */
export async function getAnalytics(userId: string, months: number): Promise<AnalyticsResult> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // 최근 N개월의 year/month 배열 생성 (오래된 순)
  const monthList: { year: number; month: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    monthList.push({ year: y, month: m });
  }

  const { startDate: periodStart } = getMonthRangeKST(monthList[0].year, monthList[0].month);
  const { endDate: periodEnd } = getMonthRangeKST(currentYear, currentMonth);

  const expenseWhereBase = {
    userId, deletedAt: null,
    type: 'EXPENSE' as const,
    savingsGoalId: null,
  };

  // 전체 병렬 조회
  const [
    monthlyResults,
    categoryRows,
    allExpenses,
    primaryGoal,
  ] = await Promise.all([
    // 1. 월별 수입/지출/저축
    Promise.all(
      monthList.map(async ({ year, month }) => {
        const { startDate, endDate } = getMonthRangeKST(year, month);
        const whereBase = { userId, deletedAt: null, date: { gte: startDate, lte: endDate } };

        const [incomeAgg, expenseAgg, savingsAgg] = await Promise.all([
          prisma.transaction.aggregate({ where: { ...whereBase, type: 'INCOME' }, _sum: { amount: true } }),
          prisma.transaction.aggregate({ where: { ...whereBase, type: 'EXPENSE', savingsGoalId: null }, _sum: { amount: true } }),
          prisma.transaction.aggregate({ where: { ...whereBase, savingsGoalId: { not: null } }, _sum: { amount: true } }),
        ]);

        return {
          year, month,
          income: incomeAgg._sum.amount ?? 0,
          expense: expenseAgg._sum.amount ?? 0,
          savingsDeposit: savingsAgg._sum.amount ?? 0,
          net: (incomeAgg._sum.amount ?? 0) - (expenseAgg._sum.amount ?? 0) - (savingsAgg._sum.amount ?? 0),
        };
      })
    ),

    // 2. 카테고리별 월간 지출
    Promise.all(
      monthList.map(({ year, month }) => {
        const { startDate, endDate } = getMonthRangeKST(year, month);
        return prisma.transaction.groupBy({
          by: ['categoryId'],
          where: { ...expenseWhereBase, date: { gte: startDate, lte: endDate }, categoryId: { not: null } },
          _sum: { amount: true },
        });
      })
    ),

    // 3. 전체 기간 지출 (요일 패턴 + 상위 건 + 고정/변동용)
    prisma.transaction.findMany({
      where: { ...expenseWhereBase, date: { gte: periodStart, lte: periodEnd } },
      select: {
        id: true, amount: true, description: true, date: true,

        category: { select: { name: true, color: true } },
      },
      orderBy: { amount: 'desc' },
    }),

    // 4. primary 저축 목표
    prisma.savingsGoal.findFirst({
      where: { userId, isPrimary: true, deletedAt: null },
      select: { targetAmount: true, currentAmount: true, targetYear: true, targetMonth: true },
    }),
  ]);

  // 평균 계산
  const nonEmptyMonths = monthlyResults.filter((r) => r.income > 0 || r.expense > 0);
  const count = nonEmptyMonths.length || 1;
  const avgIncome = Math.round(nonEmptyMonths.reduce((sum, r) => sum + r.income, 0) / count);
  const avgExpense = Math.round(nonEmptyMonths.reduce((sum, r) => sum + r.expense, 0) / count);

  // 월 필요 납입액
  let monthlyTarget: number | null = null;
  if (primaryGoal) {
    const targetDate = new Date(primaryGoal.targetYear, primaryGoal.targetMonth - 1, 1);
    const nowDate = new Date(currentYear, currentMonth - 1, 1);
    const remainingMonths = Math.max(
      1,
      (targetDate.getFullYear() - nowDate.getFullYear()) * 12 + (targetDate.getMonth() - nowDate.getMonth()) + 1
    );
    monthlyTarget = Math.ceil(Math.max(0, primaryGoal.targetAmount - primaryGoal.currentAmount) / remainingMonths);
  }

  // 카테고리 트렌드
  const totalByCategory = new Map<string, number>();
  categoryRows.forEach((monthRows) => {
    monthRows.forEach((row) => {
      const id = row.categoryId!;
      totalByCategory.set(id, (totalByCategory.get(id) ?? 0) + (row._sum.amount ?? 0));
    });
  });

  const top5Ids = [...totalByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const categoryMeta = top5Ids.length > 0
    ? await prisma.category.findMany({ where: { id: { in: top5Ids } }, select: { id: true, name: true, color: true } })
    : [];

  const orderedCategories = top5Ids
    .map((id) => categoryMeta.find((c) => c.id === id))
    .filter((c): c is CategoryTrend => c !== undefined);

  const categoryTrendData: Record<string, number | string>[] = monthList.map(({ year, month }, i) => {
    const label = `${year}년 ${month}월`;
    const rowMap = new Map(categoryRows[i].map((r) => [r.categoryId!, r._sum.amount ?? 0]));
    const entry: Record<string, number | string> = { label };
    top5Ids.forEach((id) => {
      const cat = orderedCategories.find((c) => c.id === id);
      if (cat) entry[cat.name] = rowMap.get(id) ?? 0;
    });
    const othersTotal = [...rowMap.entries()]
      .filter(([id]) => !top5Ids.includes(id))
      .reduce((sum, [, v]) => sum + v, 0);
    if (othersTotal > 0) entry['기타'] = othersTotal;
    return entry;
  });

  // 요일별 지출 패턴 (0=일, 1=월, ..., 6=토)
  const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
  const dowSums = new Array(7).fill(0);
  allExpenses.forEach((tx) => {
    const dow = new Date(tx.date).getDay();
    dowSums[dow] += tx.amount;
  });
  // 일~토 순으로 정렬
  const dowPattern = [0, 1, 2, 3, 4, 5, 6].map((i) => ({
    day: DOW_LABELS[i],
    amount: Math.round(dowSums[i]),
  }));

  return {
    months: monthlyResults,
    averages: { income: avgIncome, expense: avgExpense },
    monthlyTarget,
    categoryTrends: { categories: orderedCategories, data: categoryTrendData },
    dowPattern,
  };
}
