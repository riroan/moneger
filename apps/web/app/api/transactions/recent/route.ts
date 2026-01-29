import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TransactionType, Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

// GET /api/transactions/recent - 최근 거래 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const type = searchParams.get('type') as TransactionType | null;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // 기본값 10개, 최대 100개
    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 10;
    const offset = offsetParam ? parseInt(offsetParam) : 0;

    // 필터 조건 구성
    const where: Prisma.TransactionWhereInput = {
      userId,
      deletedAt: null,
    };

    // 타입 필터링 (선택사항)
    if (type && (type === 'INCOME' || type === 'EXPENSE')) {
      where.type = type;
    }

    // 전체 개수 조회 (무한스크롤에서 더 불러올 데이터가 있는지 확인용)
    const totalCount = await prisma.transaction.count({ where });

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
      skip: offset,
    });

    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length,
      totalCount,
      limit,
      offset,
      hasMore: offset + transactions.length < totalCount,
    });
  } catch (error) {
    logger.error('Failed to fetch recent transactions', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent transactions' },
      { status: 500 }
    );
  }
}
