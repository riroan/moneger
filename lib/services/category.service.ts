import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';

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
  const where: any = { userId, deletedAt: null };
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
  const where: any = { userId, name, type, deletedAt: null };
  if (excludeId) where.id = { not: excludeId };

  return prisma.category.findFirst({ where });
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
      color: input.color || '#6366F1',
      icon: input.icon || '💰',
      defaultBudget: input.type === 'EXPENSE' ? input.defaultBudget : null,
    },
  });
}

/**
 * 카테고리 수정
 */
export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const updateData: any = {};

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
