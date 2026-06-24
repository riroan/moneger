export const CATEGORY_GROUP = {
  SPENDING: 'SPENDING',
  ASSET_FORMATION: 'ASSET_FORMATION',
} as const;

export type CategoryGroup = (typeof CATEGORY_GROUP)[keyof typeof CATEGORY_GROUP];

export function isAssetFormationCategory(category?: { categoryGroup?: string | null } | null): boolean {
  return category?.categoryGroup === CATEGORY_GROUP.ASSET_FORMATION;
}

export function isAssetFormationTransaction(tx: {
  savingsGoalId?: string | null;
  category?: { categoryGroup?: string | null } | null;
}): boolean {
  return Boolean(tx.savingsGoalId) || isAssetFormationCategory(tx.category);
}

export function isSpendingTransaction(tx: {
  type: string;
  savingsGoalId?: string | null;
  category?: { categoryGroup?: string | null } | null;
}): boolean {
  return tx.type === 'EXPENSE' && !isAssetFormationTransaction(tx);
}
