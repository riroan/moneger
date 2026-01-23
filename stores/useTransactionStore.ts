import { create } from 'zustand';
import type { TransactionWithCategory, TransactionSummary, TodaySummary, DateRange, AmountRange } from '@/types';

export type FilterType = 'ALL' | 'INCOME' | 'EXPENSE' | 'SAVINGS';
export type SortOrder = 'recent' | 'oldest' | 'expensive' | 'cheapest';

interface TransactionState {
  // 데이터
  recentTransactions: TransactionWithCategory[];
  summary: TransactionSummary | null;
  todaySummary: TodaySummary | null;
  lastMonthBalance: number;
  oldestTransactionDate: { year: number; month: number } | null;

  // 필터 상태
  filterType: FilterType;
  filterCategories: string[];
  searchKeyword: string;
  sortOrder: SortOrder;
  dateRange: DateRange | null;
  amountRange: AmountRange | null;
  isFilterOpen: boolean;

  // 로딩 상태
  isLoadingTransactions: boolean;
  isLoadingSummary: boolean;
  isLoadingTodaySummary: boolean;
}

interface TransactionActions {
  // 데이터 설정
  setRecentTransactions: (transactions: TransactionWithCategory[]) => void;
  setSummary: (summary: TransactionSummary | null) => void;
  setTodaySummary: (summary: TodaySummary | null) => void;
  setLastMonthBalance: (balance: number) => void;
  setOldestTransactionDate: (date: { year: number; month: number } | null) => void;

  // 필터 설정
  setFilterType: (type: FilterType) => void;
  setFilterCategories: (categories: string[] | ((prev: string[]) => string[])) => void;
  setSearchKeyword: (keyword: string) => void;
  setSortOrder: (order: SortOrder) => void;
  setDateRange: (range: DateRange | null) => void;
  setAmountRange: (range: AmountRange | null) => void;
  setIsFilterOpen: (isOpen: boolean) => void;
  setFilters: (filters: Partial<Pick<TransactionState, 'filterType' | 'filterCategories' | 'searchKeyword' | 'sortOrder' | 'dateRange' | 'amountRange'>>) => void;
  resetFilters: () => void;

  // 로딩 상태 설정
  setIsLoadingTransactions: (isLoading: boolean) => void;
  setIsLoadingSummary: (isLoading: boolean) => void;
  setIsLoadingTodaySummary: (isLoading: boolean) => void;
}

type TransactionStore = TransactionState & TransactionActions;

const initialFilterState = {
  filterType: 'ALL' as FilterType,
  filterCategories: [] as string[],
  searchKeyword: '',
  sortOrder: 'recent' as SortOrder,
  dateRange: null,
  amountRange: null,
  isFilterOpen: false,
};

export const useTransactionStore = create<TransactionStore>((set) => ({
  // 초기 데이터 상태
  recentTransactions: [],
  summary: null,
  todaySummary: null,
  lastMonthBalance: 0,
  oldestTransactionDate: null,

  // 초기 필터 상태
  ...initialFilterState,

  // 초기 로딩 상태
  isLoadingTransactions: false,
  isLoadingSummary: false,
  isLoadingTodaySummary: false,

  // 데이터 설정 액션
  setRecentTransactions: (transactions) => set({ recentTransactions: transactions }),
  setSummary: (summary) => set({ summary }),
  setTodaySummary: (summary) => set({ todaySummary: summary }),
  setLastMonthBalance: (balance) => set({ lastMonthBalance: balance }),
  setOldestTransactionDate: (date) => set({ oldestTransactionDate: date }),

  // 필터 설정 액션
  setFilterType: (type) => set({ filterType: type }),
  setFilterCategories: (categories) => set((state) => ({
    filterCategories: typeof categories === 'function' ? categories(state.filterCategories) : categories,
  })),
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setDateRange: (range) => set({ dateRange: range }),
  setAmountRange: (range) => set({ amountRange: range }),
  setIsFilterOpen: (isOpen) => set({ isFilterOpen: isOpen }),

  setFilters: (filters) => set((state) => ({ ...state, ...filters })),

  resetFilters: () => set(initialFilterState),

  // 로딩 상태 설정 액션
  setIsLoadingTransactions: (isLoading) => set({ isLoadingTransactions: isLoading }),
  setIsLoadingSummary: (isLoading) => set({ isLoadingSummary: isLoading }),
  setIsLoadingTodaySummary: (isLoading) => set({ isLoadingTodaySummary: isLoading }),
}));
