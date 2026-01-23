import { useTransactionStore } from '../useTransactionStore';
import type { TransactionWithCategory, TransactionSummary, TodaySummary } from '@/types';

describe('useTransactionStore', () => {
  beforeEach(() => {
    useTransactionStore.getState().resetFilters();
    useTransactionStore.setState({
      recentTransactions: [],
      summary: null,
      todaySummary: null,
      lastMonthBalance: 0,
      oldestTransactionDate: null,
      isLoadingTransactions: false,
      isLoadingSummary: false,
      isLoadingTodaySummary: false,
    });
  });

  describe('data setters', () => {
    it('should set recent transactions', () => {
      const transactions: TransactionWithCategory[] = [
        {
          id: '1',
          userId: 'user-1',
          type: 'EXPENSE',
          amount: 10000,
          description: '점심',
          date: new Date(),
          categoryId: 'cat-1',
          savingsGoalId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          category: { id: 'cat-1', name: '식비', icon: 'restaurant', color: '#EF4444', type: 'EXPENSE', userId: 'user-1', defaultBudget: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        },
      ];

      useTransactionStore.getState().setRecentTransactions(transactions);
      expect(useTransactionStore.getState().recentTransactions).toEqual(transactions);
    });

    it('should set summary', () => {
      const summary: TransactionSummary = {
        period: { year: 2024, month: 1 },
        summary: { totalIncome: 100000, totalExpense: 50000, totalSavings: 0, netAmount: 50000, balance: 50000 },
        budget: { amount: 200000, used: 50000, remaining: 150000, usagePercent: 25 },
        categories: [],
        transactionCount: { income: 1, expense: 2, total: 3 },
        savings: { totalAmount: 0, targetAmount: 0, count: 0, primaryGoal: null },
      };

      useTransactionStore.getState().setSummary(summary);
      expect(useTransactionStore.getState().summary).toEqual(summary);
    });

    it('should set today summary', () => {
      const todaySummary: TodaySummary = {
        date: '2024-01-15',
        year: 2024,
        month: 1,
        day: 15,
        dayOfWeek: 1,
        expense: { total: 30000, count: 2 },
        income: { total: 0, count: 0 },
        savings: { total: 0, count: 0 },
      };

      useTransactionStore.getState().setTodaySummary(todaySummary);
      expect(useTransactionStore.getState().todaySummary).toEqual(todaySummary);
    });

    it('should set last month balance', () => {
      useTransactionStore.getState().setLastMonthBalance(50000);
      expect(useTransactionStore.getState().lastMonthBalance).toBe(50000);
    });

    it('should set oldest transaction date', () => {
      const date = { year: 2023, month: 1 };
      useTransactionStore.getState().setOldestTransactionDate(date);
      expect(useTransactionStore.getState().oldestTransactionDate).toEqual(date);
    });
  });

  describe('filter setters', () => {
    it('should set filter type', () => {
      useTransactionStore.getState().setFilterType('EXPENSE');
      expect(useTransactionStore.getState().filterType).toBe('EXPENSE');
    });

    it('should set filter categories with array', () => {
      useTransactionStore.getState().setFilterCategories(['cat-1', 'cat-2']);
      expect(useTransactionStore.getState().filterCategories).toEqual(['cat-1', 'cat-2']);
    });

    it('should set filter categories with function', () => {
      useTransactionStore.setState({ filterCategories: ['cat-1'] });
      useTransactionStore.getState().setFilterCategories((prev) => [...prev, 'cat-2']);
      expect(useTransactionStore.getState().filterCategories).toEqual(['cat-1', 'cat-2']);
    });

    it('should set search keyword', () => {
      useTransactionStore.getState().setSearchKeyword('점심');
      expect(useTransactionStore.getState().searchKeyword).toBe('점심');
    });

    it('should set sort order', () => {
      useTransactionStore.getState().setSortOrder('expensive');
      expect(useTransactionStore.getState().sortOrder).toBe('expensive');
    });

    it('should set date range', () => {
      const dateRange = { startYear: 2024, startMonth: 0, endYear: 2024, endMonth: 5 };
      useTransactionStore.getState().setDateRange(dateRange);
      expect(useTransactionStore.getState().dateRange).toEqual(dateRange);
    });

    it('should set amount range', () => {
      const amountRange = { minAmount: 1000, maxAmount: 50000 };
      useTransactionStore.getState().setAmountRange(amountRange);
      expect(useTransactionStore.getState().amountRange).toEqual(amountRange);
    });

    it('should set isFilterOpen', () => {
      useTransactionStore.getState().setIsFilterOpen(true);
      expect(useTransactionStore.getState().isFilterOpen).toBe(true);
    });
  });

  describe('setFilters', () => {
    it('should set multiple filters at once', () => {
      useTransactionStore.getState().setFilters({
        filterType: 'INCOME',
        searchKeyword: '급여',
        sortOrder: 'oldest',
      });

      const state = useTransactionStore.getState();
      expect(state.filterType).toBe('INCOME');
      expect(state.searchKeyword).toBe('급여');
      expect(state.sortOrder).toBe('oldest');
    });
  });

  describe('resetFilters', () => {
    it('should reset all filters to initial state', () => {
      // Set some filters
      useTransactionStore.setState({
        filterType: 'EXPENSE',
        filterCategories: ['cat-1'],
        searchKeyword: '점심',
        sortOrder: 'expensive',
        dateRange: { startYear: 2024, startMonth: 0, endYear: 2024, endMonth: 5 },
        amountRange: { minAmount: 1000, maxAmount: 50000 },
        isFilterOpen: true,
      });

      useTransactionStore.getState().resetFilters();

      const state = useTransactionStore.getState();
      expect(state.filterType).toBe('ALL');
      expect(state.filterCategories).toEqual([]);
      expect(state.searchKeyword).toBe('');
      expect(state.sortOrder).toBe('recent');
      expect(state.dateRange).toBeNull();
      expect(state.amountRange).toBeNull();
      expect(state.isFilterOpen).toBe(false);
    });
  });

  describe('loading state setters', () => {
    it('should set isLoadingTransactions', () => {
      useTransactionStore.getState().setIsLoadingTransactions(true);
      expect(useTransactionStore.getState().isLoadingTransactions).toBe(true);
    });

    it('should set isLoadingSummary', () => {
      useTransactionStore.getState().setIsLoadingSummary(true);
      expect(useTransactionStore.getState().isLoadingSummary).toBe(true);
    });

    it('should set isLoadingTodaySummary', () => {
      useTransactionStore.getState().setIsLoadingTodaySummary(true);
      expect(useTransactionStore.getState().isLoadingTodaySummary).toBe(true);
    });
  });
});
