import { API_BASE_URL, API_ENDPOINTS } from '../constants/Api';
import type { ApiResponse, TransactionType } from '@moneger/shared';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'An error occurred',
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    request<{ user: { id: string; name: string; email: string } }>(
      API_ENDPOINTS.LOGIN,
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    ),

  signup: (email: string, password: string, name: string) =>
    request<{ user: { id: string; name: string; email: string } }>(
      API_ENDPOINTS.SIGNUP,
      {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }
    ),
};

// Transaction API
export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  description: string;
  date: string;
  categoryId: string | null;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
}

export const transactionApi = {
  getAll: (userId: string, year: number, month: number) =>
    request<Transaction[]>(
      `${API_ENDPOINTS.TRANSACTIONS}?userId=${userId}&year=${year}&month=${month}`
    ),

  create: (data: {
    userId: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    description?: string;
    date: string;
    categoryId?: string;
  }) =>
    request<Transaction>(API_ENDPOINTS.TRANSACTIONS, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string, userId: string) =>
    request(`${API_ENDPOINTS.TRANSACTIONS}/${id}?userId=${userId}`, {
      method: 'DELETE',
    }),
};

// Category API
export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
}

export const categoryApi = {
  getAll: (userId: string) =>
    request<Category[]>(`${API_ENDPOINTS.CATEGORIES}?userId=${userId}`),

  create: (data: {
    userId: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    color: string;
    icon: string;
  }) =>
    request<Category>(API_ENDPOINTS.CATEGORIES, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Budget API
export interface Budget {
  id: string;
  amount: number;
  spent: number;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
}

export const budgetApi = {
  getAll: (userId: string, year: number, month: number) =>
    request<{ budgets: Budget[]; totalBudget: number; totalSpent: number }>(
      `${API_ENDPOINTS.BUDGETS}?userId=${userId}&year=${year}&month=${month}`
    ),

  set: (data: {
    userId: string;
    categoryId: string;
    amount: number;
    year: number;
    month: number;
  }) =>
    request(API_ENDPOINTS.BUDGETS, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Savings API
export interface SavingsGoal {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  currentAmount: number;
  progressPercent: number;
  monthlyRequired: number;
  monthlyTarget: number;
  thisMonthSavings: number;
  targetDate: string;
  startYear: number;
  startMonth: number;
  targetYear: number;
  targetMonth: number;
  isPrimary: boolean;
}

export const savingsApi = {
  getAll: (userId: string) =>
    request<SavingsGoal[]>(`${API_ENDPOINTS.SAVINGS}?userId=${userId}`),

  create: (data: {
    userId: string;
    name: string;
    icon: string;
    targetAmount: number;
    currentAmount?: number;
    startYear: number;
    startMonth: number;
    targetYear: number;
    targetMonth: number;
  }) =>
    request<SavingsGoal>(API_ENDPOINTS.SAVINGS, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deposit: (id: string, userId: string, amount: number) =>
    request(`${API_ENDPOINTS.SAVINGS}/${id}/deposit`, {
      method: 'POST',
      body: JSON.stringify({ userId, amount }),
    }),

  delete: (id: string, userId: string) =>
    request(`${API_ENDPOINTS.SAVINGS}/${id}?userId=${userId}`, {
      method: 'DELETE',
    }),
};

// Balance API
export const balanceApi = {
  get: (userId: string) =>
    request<{ balance: number; totalIncome: number; totalExpense: number }>(
      `${API_ENDPOINTS.BALANCE}?userId=${userId}`
    ),
};

// Summary API
export interface MonthlySummary {
  income: number;
  expense: number;
  balance: number;
  categories: Array<{
    name: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
}

export const summaryApi = {
  get: (userId: string, year: number, month: number) =>
    request<MonthlySummary>(
      `${API_ENDPOINTS.SUMMARY}?userId=${userId}&year=${year}&month=${month}`
    ),
};
