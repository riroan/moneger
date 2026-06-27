import { NextRequest } from 'next/server';
import { TransactionType } from '@prisma/client';
import {
  listResponse,
  successResponseWithMessage,
  errorResponse,
  validateUserId,
  validateTransactionType,
  apiHandler,
} from '@/lib/api-utils';
import {
  getCategories,
  findDuplicateCategory,
  findSoftDeletedCategory,
  restoreCategory,
  createCategory,
  countActiveCategoriesByType,
} from '@/lib/services/category.service';
import { CATEGORY_LIMITS } from '@/lib/constants';

// GET /api/categories - 카테고리 목록 조회
export const GET = apiHandler('fetch categories', async (request: NextRequest) => {
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
});

// POST /api/categories - 카테고리 생성
export const POST = apiHandler('create category', async (request: NextRequest) => {
  const body = await request.json();
  const { userId, name, type, color, icon, defaultBudget } = body;

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

  const activeCount = await countActiveCategoriesByType(userId, type);
  if (activeCount >= CATEGORY_LIMITS.MAX_PER_TYPE) {
    return errorResponse(`${type === 'INCOME' ? '수입' : '지출'} 카테고리는 최대 ${CATEGORY_LIMITS.MAX_PER_TYPE}개까지만 추가할 수 있습니다`, 400);
  }

  // 소프트 삭제된 카테고리가 있으면 복구
  const softDeletedCategory = await findSoftDeletedCategory(userId, name, type);
  if (softDeletedCategory) {
    const restoredCategory = await restoreCategory(softDeletedCategory.id, { color, icon, defaultBudget });
    return successResponseWithMessage(restoredCategory, 'Category restored successfully', 201);
  }

  // 카테고리 생성
  const category = await createCategory({ userId, name, type, color, icon, defaultBudget });

  return successResponseWithMessage(category, 'Category created successfully', 201);
});
