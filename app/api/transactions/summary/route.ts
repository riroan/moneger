import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/transactions/summary - 거래 요약 통계 조회
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
      .filter((tx) => tx.type === 'INCOME')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // 지출 합계
    const totalExpense = transactions
      .filter((tx) => tx.type === 'EXPENSE')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // 카테고리별 지출 통계
    const categoryStats = transactions
      .filter((tx) => tx.type === 'EXPENSE' && tx.category)
      .reduce((acc, tx) => {
        if (!tx.category) return acc;

        if (!acc[tx.category.id]) {
          acc[tx.category.id] = {
            id: tx.category.id,
            name: tx.category.name,
            icon: tx.category.icon,
            color: tx.category.color,
            count: 0,
            total: 0,
          };
        }

        acc[tx.category.id].count++;
        acc[tx.category.id].total += tx.amount;
        return acc;
      }, {} as Record<string, { id: string; name: string; icon: string | null; color: string | null; count: number; total: number }>);

    // 카테고리별 통계를 배열로 변환하고 금액순 정렬
    const categoryList = Object.values(categoryStats).sort((a, b) => b.total - a.total);

    // 예산 정보 조회 (해당 월의 예산)
    const budget = await prisma.budget.findFirst({
      where: {
        userId,
        month: {
          gte: startDate,
          lt: new Date(parseInt(year), parseInt(month), 1), // 다음 달 1일
        },
        deletedAt: null,
        categoryId: null, // 전체 예산만 조회
      },
    });

    const monthlyBudget = budget?.amount || 0;
    const budgetUsed = totalExpense;
    const budgetRemaining = Math.max(0, monthlyBudget - budgetUsed);
    const budgetUsagePercent = monthlyBudget > 0
      ? Math.min(100, Math.round((budgetUsed / monthlyBudget) * 100))
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        period: {
          year: parseInt(year),
          month: parseInt(month),
        },
        summary: {
          totalIncome,
          totalExpense,
          netAmount: totalIncome - totalExpense,
        },
        budget: {
          amount: monthlyBudget,
          used: budgetUsed,
          remaining: budgetRemaining,
          usagePercent: budgetUsagePercent,
        },
        categories: categoryList,
        transactionCount: {
          income: transactions.filter((tx) => tx.type === 'INCOME').length,
          expense: transactions.filter((tx) => tx.type === 'EXPENSE').length,
          total: transactions.length,
        },
      },
    });
  } catch (error) {
    console.error('Failed to fetch transaction summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction summary' },
      { status: 500 }
    );
  }
}
