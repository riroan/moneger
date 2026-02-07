import { prisma } from '@/lib/prisma';
import { TransactionType, Prisma } from '@prisma/client';
import { DEFAULT_CATEGORY } from '@/lib/constants';

interface CreateCategoryInput {
  userId: string;
  name: string;
  type: TransactionType;
  color?: string;
  icon?: string;
  defaultBudget?: number | null;
}

interface UpdateCategoryInput {
  name?: string;
  type?: TransactionType;
  color?: string;
  icon?: string;
  defaultBudget?: number | null;
}

/**
 * 카테고리 목록 조회
 */
export async function getCategories(userId: string, type?: TransactionType) {
  const where: Prisma.CategoryWhereInput = { userId, deletedAt: null };
  if (type) where.type = type;

  return prisma.category.findMany({
    where,
    orderBy: { name: 'asc' },
  });
}

/**
 * 카테고리 단일 조회
 */
export async function findCategory(id: string, userId: string) {
  return prisma.category.findFirst({
    where: { id, userId, deletedAt: null },
  });
}

/**
 * 중복 카테고리 확인
 */
export async function findDuplicateCategory(
  userId: string,
  name: string,
  type: TransactionType,
  excludeId?: string
) {
  const where: Prisma.CategoryWhereInput = { userId, name, type, deletedAt: null };
  if (excludeId) where.id = { not: excludeId };

  return prisma.category.findFirst({ where });
}

/**
 * 소프트 삭제된 카테고리 찾기
 */
export async function findSoftDeletedCategory(
  userId: string,
  name: string,
  type: TransactionType
) {
  return prisma.category.findFirst({
    where: { userId, name, type, deletedAt: { not: null } },
  });
}

/**
 * 소프트 삭제된 카테고리 복구
 */
export async function restoreCategory(id: string, updates?: { color?: string; icon?: string; defaultBudget?: number | null }) {
  return prisma.category.update({
    where: { id },
    data: {
      deletedAt: null,
      ...(updates?.color && { color: updates.color }),
      ...(updates?.icon && { icon: updates.icon }),
      ...(updates?.defaultBudget !== undefined && { defaultBudget: updates.defaultBudget }),
    },
  });
}

/**
 * 카테고리 생성
 */
export async function createCategory(input: CreateCategoryInput) {
  return prisma.category.create({
    data: {
      userId: input.userId,
      name: input.name,
      type: input.type,
      color: input.color || DEFAULT_CATEGORY.color,
      icon: input.icon || DEFAULT_CATEGORY.icon,
      defaultBudget: input.type === 'EXPENSE' ? input.defaultBudget : null,
    },
  });
}

/**
 * 카테고리 수정
 */
export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const updateData: Prisma.CategoryUpdateInput = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.icon !== undefined) updateData.icon = input.icon;
  if (input.defaultBudget !== undefined) updateData.defaultBudget = input.defaultBudget;

  return prisma.category.update({
    where: { id },
    data: updateData,
  });
}

/**
 * 카테고리 삭제 (Soft Delete)
 */
export async function deleteCategory(id: string) {
  return prisma.category.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
