import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';

// GET /api/transactions/recent - 최근 거래 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limitParam = searchParams.get('limit');
    const type = searchParams.get('type') as TransactionType | null;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // 기본값 10개, 최대 100개
    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 10;

    // 필터 조건 구성
    const where: any = {
      userId,
      deletedAt: null,
    };

    // 타입 필터링 (선택사항)
    if (type && (type === 'INCOME' || type === 'EXPENSE')) {
      where.type = type;
    }

    const transactions = await prisma.transaction.findMany({
      where,
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
      orderBy: {
        date: 'desc',
      },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length,
      limit,
    });
  } catch (error) {
    console.error('Failed to fetch recent transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent transactions' },
      { status: 500 }
    );
  }
}
