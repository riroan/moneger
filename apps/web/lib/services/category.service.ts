import { prisma } from '@/lib/prisma';
import { TransactionType, CategoryGroup, Prisma } from '@prisma/client';
import { DEFAULT_CATEGORY } from '@/lib/constants';
import { CATEGORY_GROUP } from '@/lib/cash-flow';

interface CreateCategoryInput {
  userId: string;
  name: string;
  type: TransactionType;
  color?: string;
  icon?: string;
  defaultBudget?: number | null;
  categoryGroup?: CategoryGroup;
}

interface UpdateCategoryInput {
  name?: string;
  type?: TransactionType;
  color?: string;
  icon?: string;
  defaultBudget?: number | null;
  categoryGroup?: CategoryGroup;
}

function normalizeCategoryGroup(type: TransactionType, categoryGroup?: CategoryGroup): CategoryGroup {
  if (type === 'EXPENSE' && categoryGroup === CATEGORY_GROUP.ASSET_FORMATION) {
    return CATEGORY_GROUP.ASSET_FORMATION;
  }
  return CATEGORY_GROUP.SPENDING;
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
export async function restoreCategory(
  id: string,
  updates?: { color?: string; icon?: string; defaultBudget?: number | null; categoryGroup?: CategoryGroup; type?: TransactionType }
) {
  const categoryGroup = normalizeCategoryGroup(updates?.type ?? 'EXPENSE', updates?.categoryGroup);
  const updateData: Prisma.CategoryUpdateInput = {
    deletedAt: null,
    categoryGroup,
  };

  if (updates?.color) updateData.color = updates.color;
  if (updates?.icon) updateData.icon = updates.icon;
  if (categoryGroup === CATEGORY_GROUP.ASSET_FORMATION) {
    updateData.defaultBudget = null;
  } else if (updates?.defaultBudget !== undefined) {
    updateData.defaultBudget = updates.defaultBudget;
  }

  return prisma.category.update({
    where: { id },
    data: updateData,
  });
}

/**
 * 카테고리 생성
 */
export async function createCategory(input: CreateCategoryInput) {
  const categoryGroup = normalizeCategoryGroup(input.type, input.categoryGroup);
  return prisma.category.create({
    data: {
      userId: input.userId,
      name: input.name,
      type: input.type,
      color: input.color || DEFAULT_CATEGORY.color,
      icon: input.icon || DEFAULT_CATEGORY.icon,
      categoryGroup,
      defaultBudget: input.type === 'EXPENSE' && categoryGroup === CATEGORY_GROUP.SPENDING ? input.defaultBudget : null,
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
  if (input.categoryGroup !== undefined) {
    const categoryGroup = normalizeCategoryGroup(input.type ?? 'EXPENSE', input.categoryGroup);
    updateData.categoryGroup = categoryGroup;
    if (categoryGroup === CATEGORY_GROUP.ASSET_FORMATION) {
      updateData.defaultBudget = null;
    }
  }
  if (input.defaultBudget !== undefined && input.categoryGroup !== CATEGORY_GROUP.ASSET_FORMATION) {
    updateData.defaultBudget = input.defaultBudget;
  }

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
