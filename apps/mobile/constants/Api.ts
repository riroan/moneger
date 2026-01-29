// API Base URL - 개발 시 로컬 서버 사용
// 실기기에서는 컴퓨터 IP 주소 사용 (예: http://192.168.0.9:3000)
export const API_BASE_URL = 'http://192.168.0.9:3000';

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
