import { NextResponse } from 'next/server';
import { authenticatedHandler } from '@/lib/auth-handler';
import { getCategories, seedDefaultCategories } from '@/lib/services/category.service';

// POST /api/categories/seed - 기본 카테고리 생성
export const POST = authenticatedHandler('seed categories', async (request, { userId }) => {
  // 기존 카테고리가 있는지 확인
  const existingCategories = await getCategories(userId);

  if (existingCategories.length > 0) {
    return NextResponse.json(
      { error: '이미 카테고리가 존재합니다' },
      { status: 409 }
    );
  }

  const createdCategories = await seedDefaultCategories(userId);

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
