import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler } from '@/lib/api-utils';
import { CATEGORY_GROUP } from '@/lib/cash-flow';

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
    { name: '식비', icon: 'restaurant', color: '#EF4444', categoryGroup: CATEGORY_GROUP.SPENDING },
    { name: '교통비', icon: 'car', color: '#F59E0B', categoryGroup: CATEGORY_GROUP.SPENDING },
    { name: '쇼핑', icon: 'cart', color: '#EC4899', categoryGroup: CATEGORY_GROUP.SPENDING },
    { name: '문화생활', icon: 'movie', color: '#8B5CF6', categoryGroup: CATEGORY_GROUP.SPENDING },
    { name: '의료', icon: 'hospital', color: '#14B8A6', categoryGroup: CATEGORY_GROUP.SPENDING },
    { name: '주거비', icon: 'home', color: '#6366F1', categoryGroup: CATEGORY_GROUP.SPENDING },
    { name: '통신비', icon: 'payment', color: '#3B82F6', categoryGroup: CATEGORY_GROUP.SPENDING },
    { name: '대출이자', icon: 'card', color: '#DC2626', categoryGroup: CATEGORY_GROUP.SPENDING },
    { name: '저축 납입', icon: 'money', color: '#06B6D4', categoryGroup: CATEGORY_GROUP.ASSET_FORMATION },
    { name: '투자 납입', icon: 'chart', color: '#8B5CF6', categoryGroup: CATEGORY_GROUP.ASSET_FORMATION },
    { name: '기타지출', icon: 'payment', color: '#64748B', categoryGroup: CATEGORY_GROUP.SPENDING },
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
          categoryGroup: cat.categoryGroup,
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
