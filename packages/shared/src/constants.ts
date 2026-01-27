/**
 * 애플리케이션 상수
 */

// 페이지네이션
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// 금액 제한
export const AMOUNT_LIMITS = {
  MIN: 0,
  MAX: 100_000_000_000_000, // 100조
  TRANSACTION_MAX: 100_000_000_000, // 1000억 (개별 거래)
} as const;

// 저축 목표
export const SAVINGS_GOAL = {
  MAX_COUNT: 10,
  YEARS_RANGE: 21, // 현재 연도 + 20년
} as const;

// 카테고리
export const CATEGORY_LIMITS = {
  MAX_PER_TYPE: 20,
} as const;

// 거래 유형
export const TRANSACTION_TYPES = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

// 테마 색상
export const THEME_COLORS = {
  income: '#10B981', // green
  expense: '#EF4444', // red
  savings: '#F59E0B', // amber
  balance: '#6366F1', // indigo
  primary: '#6366F1',
  secondary: '#3B82F6',
} as const;

// 카드 색상 (RGBA)
export const CARD_COLORS = {
  income: {
    bg: 'rgba(16, 185, 129, 0.15)',
    text: '#4ADE80',
    border: '#10B981',
  },
  expense: {
    bg: 'rgba(239, 68, 68, 0.15)',
    text: '#F87171',
    border: '#EF4444',
  },
  savings: {
    bg: 'rgba(245, 158, 11, 0.15)',
    text: '#FBBF24',
    border: '#F59E0B',
  },
  balance: {
    bg: 'rgba(99, 102, 241, 0.15)',
    text: '#818CF8',
    border: '#6366F1',
  },
} as const;

// 기본 카테고리 설정
export const DEFAULT_CATEGORY = {
  color: '#6366F1',
  icon: '💰',
} as const;

// API 응답 메시지
export const API_MESSAGES = {
  USER_ID_REQUIRED: 'userId is required',
  INVALID_REQUEST: 'Invalid request',
  NOT_FOUND: 'Not found',
  SERVER_ERROR: 'Internal server error',
} as const;

// 정렬 옵션
export const SORT_OPTIONS = {
  RECENT: 'recent',
  OLDEST: 'oldest',
  EXPENSIVE: 'expensive',
  CHEAPEST: 'cheapest',
} as const;

// API 엔드포인트
export const API_ENDPOINTS = {
  TRANSACTIONS: '/api/transactions',
  CATEGORIES: '/api/categories',
  BUDGETS: '/api/budgets',
  SAVINGS: '/api/savings',
  SUMMARY: '/api/summary',
  AUTH: '/api/auth',
} as const;
