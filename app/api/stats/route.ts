import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/stats - 통계 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!year || !month) {
      return NextResponse.json(
        { error: 'year and month are required' },
        { status: 400 }
      );
    }

    // 날짜 범위 설정
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

    // 해당 월의 모든 거래 조회
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            color: true,
            icon: true,
          },
        },
      },
    });

    // 수입 합계
    const totalIncome = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    // 지출 합계
    const totalExpense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    // 잔액
    const balance = totalIncome - totalExpense;

    // 수입/지출 건수
    const incomeCount = transactions.filter((t) => t.type === 'INCOME').length;
    const expenseCount = transactions.filter((t) => t.type === 'EXPENSE').length;

    // 카테고리별 지출 통계
    const categoryStats: Record<
      string,
      {
        categoryId: string;
        categoryName: string;
        color: string | null;
        icon: string | null;
        count: number;
        total: number;
      }
    > = {};

    transactions
      .filter((t) => t.type === 'EXPENSE' && t.category)
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

    // 카테고리별 지출을 배열로 변환하고 금액 기준 내림차순 정렬
    const categoryBreakdown = Object.values(categoryStats).sort(
      (a, b) => b.total - a.total
    );

    // 예산 정보 조회
    const budget = await prisma.budget.findFirst({
      where: {
        userId,
        deletedAt: null,
        month: startDate,
      },
    });

    // 예산 관련 통계
    const budgetAmount = budget?.amount || 0;
    const budgetUsed = totalExpense;
    const budgetRemaining = Math.max(0, budgetAmount - budgetUsed);
    const budgetUsagePercent = budgetAmount > 0
      ? Math.min(100, Math.round((budgetUsed / budgetAmount) * 100))
      : 0;

    // 일별 지출 통계 (최근 7일)
    const last7Days: { date: string; amount: number }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const dayExpenses = transactions
        .filter(
          (t) =>
            t.type === 'EXPENSE' &&
            t.date >= date &&
            t.date < nextDate
        )
        .reduce((sum, t) => sum + t.amount, 0);

      last7Days.push({
        date: date.toISOString().split('T')[0],
        amount: dayExpenses,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalIncome,
          totalExpense,
          balance,
          incomeCount,
          expenseCount,
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
      },
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
