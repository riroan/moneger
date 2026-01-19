import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';

// GET /api/categories - 카테고리 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
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
      deletedAt: null,
    };

    // 타입 필터링 (선택사항)
    if (type && (type === 'INCOME' || type === 'EXPENSE')) {
      where.type = type;
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST /api/categories - 카테고리 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, type, color, icon } = body;

    // 유효성 검사
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    if (!type || (type !== 'INCOME' && type !== 'EXPENSE')) {
      return NextResponse.json(
        { error: 'type must be INCOME or EXPENSE' },
        { status: 400 }
      );
    }

    // 중복 카테고리 확인
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId,
        name,
        type,
        deletedAt: null,
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: '이미 존재하는 카테고리입니다' },
        { status: 409 }
      );
    }

    // 카테고리 생성
    const category = await prisma.category.create({
      data: {
        userId,
        name,
        type,
        color: color || '#6366F1',
        icon: icon || '💰',
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: category,
        message: 'Category created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
