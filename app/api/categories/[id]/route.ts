import { NextRequest } from 'next/server';
import {
  successResponseWithMessage,
  errorResponse,
  validateUserId,
  validateTransactionType,
} from '@/lib/api-utils';
import {
  findCategory,
  findDuplicateCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/services/category.service';

// PATCH /api/categories/[id] - 카테고리 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, name, type, color, icon } = body;

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

    // 이름과 타입이 변경되는 경우 중복 확인
    if (name && type) {
      const duplicate = await findDuplicateCategory(userId, name, type, id);
      if (duplicate) {
        return errorResponse('이미 존재하는 카테고리입니다', 409);
      }
    }

    // 카테고리 업데이트
    const updatedCategory = await updateCategory(id, { name, type, color, icon });

    return successResponseWithMessage(updatedCategory, 'Category updated successfully');
  } catch (error) {
    console.error('Failed to update category:', error);
    return errorResponse('Failed to update category', 500);
  }
}

// DELETE /api/categories/[id] - 카테고리 삭제 (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
  } catch (error) {
    console.error('Failed to delete category:', error);
    return errorResponse('Failed to delete category', 500);
  }
}
