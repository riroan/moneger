// API Base URL - 환경변수 EXPO_PUBLIC_API_BASE_URL 사용
// 설정되지 않은 경우 기본값 사용
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  SIGNUP: '/api/auth/signup',
  PASSWORD: '/api/auth/password',
  DELETE_ACCOUNT: '/api/auth/delete',

  // Transactions
  TRANSACTIONS: '/api/transactions',
  TRANSACTIONS_SUMMARY: '/api/transactions/summary',
  TRANSACTIONS_TODAY: '/api/transactions/today',
  TRANSACTIONS_RECENT: '/api/transactions/recent',
  TRANSACTIONS_OLDEST_DATE: '/api/transactions/oldest-date',

  // Categories
  CATEGORIES: '/api/categories',

  // Budgets
  BUDGETS: '/api/budgets',

  // Savings
  SAVINGS: '/api/savings',

  // Balance
  BALANCE: '/api/balance',
  DAILY_BALANCE: '/api/daily-balance',

  // Stats
  STATS: '/api/stats',

  // Summary (legacy)
  SUMMARY: '/api/summary',
};
