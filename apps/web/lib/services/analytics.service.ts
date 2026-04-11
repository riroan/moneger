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

export interface AnalyticsResult {
  months: MonthlyAnalytics[];
  averages: {
    income: number;
    expense: number;
  };
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

  // N개월치 집계 병렬 실행
  const results = await Promise.all(
    monthList.map(async ({ year, month }) => {
      const { startDate, endDate } = getMonthRangeKST(year, month);
      const whereBase = { userId, deletedAt: null, date: { gte: startDate, lte: endDate } };

      const [incomeAgg, expenseAgg, savingsAgg] = await Promise.all([
        prisma.transaction.aggregate({
          where: { ...whereBase, type: 'INCOME' },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { ...whereBase, type: 'EXPENSE', savingsGoalId: null },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { ...whereBase, savingsGoalId: { not: null } },
          _sum: { amount: true },
        }),
      ]);

      const income = incomeAgg._sum.amount ?? 0;
      const expense = expenseAgg._sum.amount ?? 0;
      const savingsDeposit = savingsAgg._sum.amount ?? 0;

      return {
        year,
        month,
        income,
        expense,
        savingsDeposit,
        net: income - expense - savingsDeposit,
      };
    })
  );

  // 평균 계산 (데이터가 있는 달만)
  const nonEmptyMonths = results.filter((r) => r.income > 0 || r.expense > 0);
  const count = nonEmptyMonths.length || 1;
  const avgIncome = Math.round(nonEmptyMonths.reduce((sum, r) => sum + r.income, 0) / count);
  const avgExpense = Math.round(nonEmptyMonths.reduce((sum, r) => sum + r.expense, 0) / count);

  return {
    months: results,
    averages: {
      income: avgIncome,
      expense: avgExpense,
    },
  };
}
