/**
 * Prisma 쿼리에서 사용하는 공통 Select 객체
 */

/**
 * 카테고리 기본 정보 Select
 */
export const CATEGORY_SELECT = {
  id: true,
  name: true,
  type: true,
  color: true,
  icon: true,
} as const;

/**
 * 카테고리 전체 정보 Select (기본 예산 포함)
 */
export const CATEGORY_WITH_BUDGET_SELECT = {
  id: true,
  name: true,
  type: true,
  color: true,
  icon: true,
  defaultBudget: true,
} as const;

/**
 * 사용자 기본 정보 Select (비밀번호 제외)
 */
export const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * 저축 목표 기본 정보 Select
 */
export const SAVINGS_GOAL_SELECT = {
  id: true,
  name: true,
  icon: true,
  currentAmount: true,
  targetAmount: true,
  targetYear: true,
  targetMonth: true,
  isPrimary: true,
} as const;

/**
 * 거래 기본 정보 Select
 */
export const TRANSACTION_SELECT = {
  id: true,
  amount: true,
  type: true,
  description: true,
  date: true,
  categoryId: true,
  savingsGoalId: true,
  userId: true,
} as const;
