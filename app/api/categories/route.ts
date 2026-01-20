import { NextRequest } from 'next/server';
import { TransactionType } from '@prisma/client';
import {
  listResponse,
  successResponseWithMessage,
  errorResponse,
  validateUserId,
  validateTransactionType,
} from '@/lib/api-utils';
import {
  getCategories,
  findDuplicateCategory,
  createCategory,
} from '@/lib/services/category.service';

// GET /api/categories - 카테고리 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') as TransactionType | null;

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    const categories = await getCategories(
      userId!,
      type && (type === 'INCOME' || type === 'EXPENSE') ? type : undefined
    );

    return listResponse(categories, categories.length);
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return errorResponse('Failed to fetch categories', 500);
  }
}

// POST /api/categories - 카테고리 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, type, color, icon } = body;

    // 유효성 검사
    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    if (!name) {
      return errorResponse('name is required', 400);
    }

    const typeError = validateTransactionType(type);
    if (typeError) return typeError;

    // 중복 카테고리 확인
    const existingCategory = await findDuplicateCategory(userId, name, type);
    if (existingCategory) {
      return errorResponse('이미 존재하는 카테고리입니다', 409);
    }

    // 카테고리 생성
    const category = await createCategory({ userId, name, type, color, icon });

    return successResponseWithMessage(category, 'Category created successfully', 201);
  } catch (error) {
    console.error('Failed to create category:', error);
    return errorResponse('Failed to create category', 500);
  }
}
