import { NextRequest } from 'next/server';
import {
  successResponseWithMessage,
  errorResponse,
  validateUserId,
  validateTransactionType,
  apiHandlerWithParams,
} from '@/lib/api-utils';
import {
  findCategory,
  findDuplicateCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/services/category.service';

// PATCH /api/categories/[id] - 카테고리 수정
export const PATCH = apiHandlerWithParams<{ id: string }>('update category', async (request: NextRequest, { id }) => {
  const body = await request.json();
  const { userId, name, type, color, icon, defaultBudget } = body;

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  // 카테고리 존재 여부 확인
  const existingCategory = await findCategory(id, userId);
  if (!existingCategory) {
    return errorResponse('Category not found', 404);
  }

  // 타입 유효성 검사
  if (type !== undefined) {
    const typeError = validateTransactionType(type);
    if (typeError) return typeError;
  }

  // 이름 또는 타입이 변경되는 경우 중복 확인
  if (name || type) {
    const checkName = name || existingCategory.name;
    const checkType = type || existingCategory.type;
    const duplicate = await findDuplicateCategory(userId, checkName, checkType, id);
    if (duplicate) {
      return errorResponse('이미 존재하는 카테고리입니다', 409);
    }
  }

  // 카테고리 업데이트
  const updatedCategory = await updateCategory(id, { name, type, color, icon, defaultBudget });

  return successResponseWithMessage(updatedCategory, 'Category updated successfully');
});

// DELETE /api/categories/[id] - 카테고리 삭제 (soft delete)
export const DELETE = apiHandlerWithParams<{ id: string }>('delete category', async (request: NextRequest, { id }) => {
  const body = await request.json();
  const { userId } = body;

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  // 카테고리 존재 여부 확인
  const existingCategory = await findCategory(id, userId!);
  if (!existingCategory) {
    return errorResponse('Category not found', 404);
  }

  // Soft delete
  await deleteCategory(id);

  return successResponseWithMessage(null, 'Category deleted successfully');
});
