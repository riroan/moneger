import type {
  ApiResponse,
  Transaction,
  TransactionWithCategory,
  Category,
  SavingsGoal,
  TransactionSummary,
} from '@moneger/shared';
import { API_CONFIG } from './config';

// API 기본 URL (모바일용 - 항상 프로덕션 URL 사용)
const BASE_URL = API_CONFIG.BASE_URL;

// 공통 fetch 함수
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    return response.json();
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, error: 'Network error' };
  }
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) =>
    fetchApi<{ userId: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: async (email: string, password: string, name: string) =>
    fetchApi<{ userId: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
};

// Transaction API
export const transactionApi = {
  getAll: async (
    userId: string,
    year: number,
    month: number,
    limit = 50
  ) =>
    fetchApi<{ transactions: TransactionWithCategory[]; total: number }>(
      `/api/transactions?userId=${userId}&year=${year}&month=${month}&limit=${limit}`
    ),

  create: async (data: {
    userId: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    description?: string;
    date: string;
    categoryId?: string;
  }) =>
    fetchApi<Transaction>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: async (
    id: string,
    data: Partial<{
      amount: number;
      description: string;
      date: string;
      categoryId: string;
    }>
  ) =>
    fetchApi<Transaction>(`/api/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: async (id: string) =>
    fetchApi<void>(`/api/transactions/${id}`, {
      method: 'DELETE',
    }),
};

// Category API
export const categoryApi = {
  getAll: async (userId: string) =>
    fetchApi<Category[]>(`/api/categories?userId=${userId}`),

  create: async (data: {
    userId: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    color?: string;
    icon?: string;
  }) =>
    fetchApi<Category>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Budget API
export const budgetApi = {
  getAll: async (userId: string, year: number, month: number) =>
    fetchApi<{
      budgets: Array<{
        id: string;
        amount: number;
        spent: number;
        categoryId: string;
        categoryName: string;
        categoryIcon: string;
        categoryColor: string;
      }>;
      totalBudget: number;
      totalSpent: number;
    }>(`/api/budgets?userId=${userId}&year=${year}&month=${month}`),

  upsert: async (data: {
    userId: string;
    categoryId: string;
    amount: number;
    year: number;
    month: number;
  }) =>
    fetchApi('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Savings API
export const savingsApi = {
  getAll: async (userId: string) =>
    fetchApi<SavingsGoal[]>(`/api/savings?userId=${userId}`),

  create: async (data: {
    userId: string;
    name: string;
    icon: string;
    targetAmount: number;
    targetDate: string;
    startDate: string;
  }) =>
    fetchApi<SavingsGoal>('/api/savings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deposit: async (goalId: string, amount: number) =>
    fetchApi(`/api/savings/${goalId}/deposit`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  delete: async (goalId: string) =>
    fetchApi(`/api/savings/${goalId}`, {
      method: 'DELETE',
    }),
};

// Summary API
export const summaryApi = {
  getMonthly: async (userId: string, year: number, month: number) =>
    fetchApi<TransactionSummary>(
      `/api/summary?userId=${userId}&year=${year}&month=${month}`
    ),

  getToday: async (userId: string) =>
    fetchApi<{
      date: string;
      expense: { total: number; count: number };
      income: { total: number; count: number };
    }>(`/api/summary/today?userId=${userId}`),
};
