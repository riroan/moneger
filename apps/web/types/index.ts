import { TransactionType } from '@prisma/client';

// Category Types
export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string | null;
  icon: string | null;
  defaultBudget: number | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CategoryWithSelect {
  id: string;
  name: string;
  type: TransactionType;
  color: string | null;
  icon: string | null;
}

// Transaction Types
export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  date: Date;
  categoryId: string | null;
  category: CategoryWithSelect | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface TransactionWithCategory {
  id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  date: string;
  categoryId: string | null;
  category: CategoryWithSelect | null;
  savingsGoalId?: string | null;
}

// Budget Types
export interface Budget {
  id: string;
  amount: number;
  categoryId: string | null;
  month: Date;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface BudgetWithCategory extends Budget {
  category: CategoryWithSelect | null;
}

// Summary Types
export interface CategorySummary {
  id: string;
  name: string;
  icon: string | null;
  total: number;
  count: number;
  budget?: number;
  budgetUsagePercent?: number;
}

export interface TransactionSummary {
  summary: {
    totalIncome: number;
    totalExpense: number;
    totalSavings: number;
    netAmount: number;
    balance: number;
  };
  categories: CategorySummary[];
  transactionCount: {
    income: number;
    expense: number;
  };
  savings: {
    totalAmount: number;
    targetAmount: number;
    count: number;
    primaryGoal?: {
      id: string;
      name: string;
      icon: string;
      currentAmount: number;
      targetAmount: number;
      targetDate: string;
      progressPercent: number;
    } | null;
  };
}

export interface TodaySummary {
  date: string;
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  expense: {
    total: number;
    count: number;
  };
  income: {
    total: number;
    count: number;
  };
  savings: {
    total: number;
    count: number;
  };
}

// Daily Balance Types
export interface DailyBalance {
  id: string;
  userId: string;
  date: Date;
  balance: number;
  income: number;
  expense: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Filter Types
export interface DateRange {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

export interface AmountRange {
  minAmount: number | null;
  maxAmount: number | null;
}

// Category Chart Data
export interface CategoryChartData {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  amount: number;
  count: number;
  budget?: number;
  budgetUsagePercent?: number;
}
