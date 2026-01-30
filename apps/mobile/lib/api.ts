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

  changePassword: (userId: string, currentPassword: string, newPassword: string) =>
    request(API_ENDPOINTS.PASSWORD, {
      method: 'PATCH',
      body: JSON.stringify({ userId, currentPassword, newPassword }),
    }),

  deleteAccount: (userId: string, password: string) =>
    request(API_ENDPOINTS.DELETE_ACCOUNT, {
      method: 'POST',
      body: JSON.stringify({ userId, password }),
    }),
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

// Transaction with category (for recent transactions)
export interface TransactionWithCategory {
  id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  date: string;
  categoryId: string | null;
  savingsGoalId?: string | null;
  category?: {
    id: string;
    name: string;
    type: TransactionType;
    color: string | null;
    icon: string | null;
  } | null;
}

// Transaction Summary Types
export interface CategorySummary {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  count: number;
  total: number;
  budget?: number;
  budgetUsagePercent?: number;
}

export interface PrimaryGoal {
  id: string;
  name: string;
  icon: string;
  currentAmount: number;
  targetAmount: number;
  targetDate: string;
  progressPercent: number;
}

export interface TransactionSummary {
  period: { year: number; month: number };
  summary: {
    totalIncome: number;
    totalExpense: number;
    totalSavings: number;
    netAmount: number;
    balance: number;
  };
  budget: {
    amount: number;
    used: number;
    remaining: number;
    usagePercent: number;
  };
  categories: CategorySummary[];
  transactionCount: {
    income: number;
    expense: number;
    total: number;
  };
  savings: {
    totalAmount: number;
    targetAmount: number;
    count: number;
    primaryGoal: PrimaryGoal | null;
  };
}

// Today Summary Types
export interface TodaySummary {
  date: string;
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  expense: { total: number; count: number };
  income: { total: number; count: number };
  savings: { total: number; count: number };
}

// Stats Types
export interface MonthlyStats {
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    incomeCount: number;
    expenseCount: number;
    transactionCount: number;
  };
  budget: {
    amount: number;
    used: number;
    remaining: number;
    usagePercent: number;
  };
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    color: string | null;
    icon: string | null;
    count: number;
    total: number;
  }>;
  last7Days: Array<{ date: string; amount: number }>;
}

// Response type for paginated transactions
export interface PaginatedTransactionsResponse {
  transactions: TransactionWithCategory[];
  totalCount: number;
  hasMore: boolean;
}

export const transactionApi = {
  getAll: (userId: string, year: number, month: number) =>
    request<Transaction[]>(
      `${API_ENDPOINTS.TRANSACTIONS}?userId=${userId}&year=${year}&month=${month}`
    ),

  getRecent: (userId: string, limit: number = 10, offset: number = 0) =>
    request<TransactionWithCategory[]>(
      `${API_ENDPOINTS.TRANSACTIONS_RECENT}?userId=${userId}&limit=${limit}&offset=${offset}`
    ),

  getRecentPaginated: async (userId: string, limit: number = 10, offset: number = 0): Promise<ApiResponse<PaginatedTransactionsResponse>> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.TRANSACTIONS_RECENT}?userId=${userId}&limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'An error occurred',
        };
      }

      return {
        success: true,
        data: {
          transactions: data.data || [],
          totalCount: data.totalCount || 0,
          hasMore: data.hasMore ?? false,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  },

  getSummary: (userId: string, year: number, month: number) =>
    request<TransactionSummary>(
      `${API_ENDPOINTS.TRANSACTIONS_SUMMARY}?userId=${userId}&year=${year}&month=${month}`
    ),

  getToday: (userId: string) =>
    request<TodaySummary>(
      `${API_ENDPOINTS.TRANSACTIONS_TODAY}?userId=${userId}`
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

  update: (
    id: string,
    data: {
      userId: string;
      amount: number;
      type: 'INCOME' | 'EXPENSE';
      description?: string;
      categoryId?: string;
    }
  ) =>
    request<Transaction>(`${API_ENDPOINTS.TRANSACTIONS}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string, userId: string) =>
    request(`${API_ENDPOINTS.TRANSACTIONS}/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    }),

  getOldestDate: (userId: string) =>
    request<{ year: number; month: number } | null>(
      `${API_ENDPOINTS.TRANSACTIONS_OLDEST_DATE}?userId=${userId}`
    ),
};

// Category API
export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
}

export interface CategoryWithBudget extends Category {
  defaultBudget?: number | null;
}

export const categoryApi = {
  getAll: (userId: string) =>
    request<CategoryWithBudget[]>(`${API_ENDPOINTS.CATEGORIES}?userId=${userId}`),

  create: (data: {
    userId: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    color: string;
    icon: string;
    defaultBudget?: number | null;
  }) =>
    request<Category>(API_ENDPOINTS.CATEGORIES, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: {
      userId: string;
      name: string;
      icon: string;
      color: string;
      defaultBudget?: number | null;
    }
  ) =>
    request<Category>(`${API_ENDPOINTS.CATEGORIES}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string, userId: string) =>
    request(`${API_ENDPOINTS.CATEGORIES}/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    }),
};

// Budget API
export interface BudgetResponse {
  id: string;
  amount: number;
  categoryId: string;
  month: string;
  category: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  };
}

export interface BudgetItem {
  id: string;
  amount: number;
  categoryId: string;
  year: number;
  month: number;
}

export const budgetApi = {
  getAll: (userId: string, year: number, month: number) =>
    request<BudgetResponse[]>(
      `${API_ENDPOINTS.BUDGETS}?userId=${userId}&year=${year}&month=${month}`
    ),

  set: (data: {
    userId: string;
    categoryId: string;
    amount: number;
    year: number;
    month: number;
  }) =>
    request<BudgetItem>(API_ENDPOINTS.BUDGETS, {
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

  togglePrimary: (id: string, userId: string, isPrimary: boolean) =>
    request(`${API_ENDPOINTS.SAVINGS}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ userId, isPrimary }),
    }),

  update: (
    id: string,
    data: {
      userId: string;
      name: string;
      icon: string;
      targetAmount: number;
      targetYear: number;
      targetMonth: number;
    }
  ) =>
    request<SavingsGoal>(`${API_ENDPOINTS.SAVINGS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
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

// Stats API
export const statsApi = {
  get: (userId: string, year: number, month: number) =>
    request<MonthlyStats>(
      `${API_ENDPOINTS.STATS}?userId=${userId}&year=${year}&month=${month}`
    ),
};

// Daily Balance API
export interface DailyBalance {
  date: string;
  balance: number;
  income: number;
  expense: number;
  savings: number;
}

export const dailyBalanceApi = {
  getRecent: (userId: string, days: number = 7) =>
    request<DailyBalance[]>(
      `${API_ENDPOINTS.DAILY_BALANCE}?userId=${userId}&days=${days}`
    ),

  getMonthly: (userId: string, year: number, month: number) =>
    request<DailyBalance[]>(
      `${API_ENDPOINTS.DAILY_BALANCE}?userId=${userId}&year=${year}&month=${month}`
    ),
};
