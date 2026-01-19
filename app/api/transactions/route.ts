import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';

// GET /api/transactions - 거래 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const type = searchParams.get('type') as TransactionType | null;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // 필터 조건 구성
    const where: any = {
      userId,
      deletedAt: null, // soft delete - 삭제되지 않은 거래만
    };

    // 날짜 필터링
    if (year && month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    // 타입 필터링
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
    });

    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length,
    });
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// POST /api/transactions - 거래 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, amount, description, categoryId, date } = body;

    // 유효성 검사
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!type || (type !== 'INCOME' && type !== 'EXPENSE')) {
      return NextResponse.json(
        { error: 'type must be INCOME or EXPENSE' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'amount must be greater than 0' },
        { status: 400 }
      );
    }

    // 카테고리가 제공된 경우 해당 카테고리가 존재하고 타입이 일치하는지 확인
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          userId,
          type,
          deletedAt: null,
        },
      });

      if (!category) {
        return NextResponse.json(
          { error: 'Invalid category or category type mismatch' },
          { status: 400 }
        );
      }
    }

    // 거래 생성
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type,
        amount: parseFloat(amount),
        description: description || null,
        categoryId: categoryId || null,
        date: date ? new Date(date) : new Date(),
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

    return NextResponse.json(
      {
        success: true,
        data: transaction,
        message: 'Transaction created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
