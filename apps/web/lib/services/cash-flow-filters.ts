import type { Prisma } from '@prisma/client';
import { CATEGORY_GROUP } from '@/lib/cash-flow';

export function spendingExpenseWhere(base: Prisma.TransactionWhereInput = {}): Prisma.TransactionWhereInput {
  return {
    ...base,
    type: 'EXPENSE',
    savingsGoalId: null,
    OR: [
      { categoryId: null },
      { category: { categoryGroup: CATEGORY_GROUP.SPENDING } },
    ],
  };
}

export function assetFormationCategoryWhere(base: Prisma.TransactionWhereInput = {}): Prisma.TransactionWhereInput {
  return {
    ...base,
    type: 'EXPENSE',
    savingsGoalId: null,
    category: { categoryGroup: CATEGORY_GROUP.ASSET_FORMATION },
  };
}

export function assetFormationWhere(base: Prisma.TransactionWhereInput = {}): Prisma.TransactionWhereInput {
  return {
    ...base,
    OR: [
      { savingsGoalId: { not: null } },
      {
        type: 'EXPENSE',
        savingsGoalId: null,
        category: { categoryGroup: CATEGORY_GROUP.ASSET_FORMATION },
      },
    ],
  };
}
