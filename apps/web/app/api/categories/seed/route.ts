import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler } from '@/lib/api-utils';

// POST /api/categories/seed - 기본 카테고리 생성
export const POST = apiHandler('seed categories', async (request: NextRequest) => {
  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    );
  }

  // 기존 카테고리가 있는지 확인
  const existingCategories = await prisma.category.findMany({
    where: {
      userId,
      deletedAt: null,
    },
  });

  if (existingCategories.length > 0) {
    return NextResponse.json(
      { error: '이미 카테고리가 존재합니다' },
      { status: 409 }
    );
  }

  // 기본 지출 카테고리
  const expenseCategories = [
    { name: '식비', icon: '🍽️', color: '#EF4444' },
    { name: '교통비', icon: '🚗', color: '#F59E0B' },
    { name: '쇼핑', icon: '🛍️', color: '#EC4899' },
    { name: '문화생활', icon: '🎬', color: '#8B5CF6' },
    { name: '의료', icon: '🏥', color: '#14B8A6' },
    { name: '주거비', icon: '🏠', color: '#6366F1' },
    { name: '통신비', icon: '📱', color: '#3B82F6' },
    { name: '대출이자', icon: '💳', color: '#DC2626' },
    { name: '저축', icon: '🏦', color: '#FBBF24' },
    { name: '기타지출', icon: '💸', color: '#64748B' },
  ];

  // 기본 수입 카테고리
  const incomeCategories = [
    { name: '급여', icon: '💰', color: '#10B981' },
    { name: '부수입', icon: '💵', color: '#059669' },
    { name: '용돈', icon: '🎁', color: '#34D399' },
    { name: '기타수입', icon: '💎', color: '#6EE7B7' },
  ];

  // 카테고리 생성
  const createdCategories = await prisma.$transaction([
    ...expenseCategories.map((cat) =>
      prisma.category.create({
        data: {
          userId,
          name: cat.name,
          type: 'EXPENSE',
          icon: cat.icon,
          color: cat.color,
        },
      })
    ),
    ...incomeCategories.map((cat) =>
      prisma.category.create({
        data: {
          userId,
          name: cat.name,
          type: 'INCOME',
          icon: cat.icon,
          color: cat.color,
        },
      })
    ),
  ]);

  return NextResponse.json(
    {
      success: true,
      data: createdCategories,
      message: 'Default categories created successfully',
      count: createdCategories.length,
    },
    { status: 201 }
  );
});
