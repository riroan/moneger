import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  Platform,
  KeyboardAvoidingView,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getIconName } from '../../constants/Icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { transactionApi, categoryApi, Transaction, Category, TransactionWithCategory as ApiTransactionWithCategory, PaginatedTransactionsResponse } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { useRefreshStore } from '../../stores/refreshStore';
import { AMOUNT_LIMITS, formatNumber, formatAmountInput, formatDateWithDay, formatTime } from '@moneger/shared';
import { EditSavingsTransactionModal, type SavingsTransactionForEdit } from '../../components/savings';

// Pagination settings
const INITIAL_LOAD_LIMIT = 50; // 처음 로드할 개수
const LOAD_MORE_LIMIT = 20; // 추가 로드할 개수

// Mock data for testing
const USE_MOCK_DATA = false;

interface TransactionWithCategory extends Transaction {
  savingsGoalId?: string | null;
  category?: {
    name: string;
    icon: string | null;
    color: string | null;
    type?: 'INCOME' | 'EXPENSE';
  };
}

const MOCK_TRANSACTIONS: TransactionWithCategory[] = [
  {
    id: '1',
    type: 'EXPENSE',
    amount: 15000,
    description: '점심 식사',
    date: '2026-01-28',
    categoryId: 'cat1',
    category: { name: '식비', icon: 'restaurant', color: '#ff6b6b', type: 'EXPENSE' },
  },
  {
    id: '2',
    type: 'EXPENSE',
    amount: 3500,
    description: '지하철',
    date: '2026-01-28',
    categoryId: 'cat2',
    category: { name: '교통', icon: 'car', color: '#60a5fa', type: 'EXPENSE' },
  },
  {
    id: '3',
    type: 'INCOME',
    amount: 3500000,
    description: '1월 급여',
    date: '2026-01-25',
    categoryId: 'cat7',
    category: { name: '급여', icon: 'money', color: '#4ade80', type: 'INCOME' },
  },
  {
    id: '4',
    type: 'EXPENSE',
    amount: 45000,
    description: '마트 장보기',
    date: '2026-01-24',
    categoryId: 'cat3',
    category: { name: '생활용품', icon: 'cart', color: '#a78bfa', type: 'EXPENSE' },
  },
  {
    id: '5',
    type: 'EXPENSE',
    amount: 12000,
    description: '영화 관람',
    date: '2026-01-23',
    categoryId: 'cat5',
    category: { name: '문화/여가', icon: 'movie', color: '#fbbf24', type: 'EXPENSE' },
  },
  {
    id: '6',
    type: 'EXPENSE',
    amount: 8500,
    description: '저녁 식사',
    date: '2026-01-23',
    categoryId: 'cat1',
    category: { name: '식비', icon: 'restaurant', color: '#ff6b6b', type: 'EXPENSE' },
  },
  {
    id: '7',
    type: 'EXPENSE',
    amount: 25000,
    description: '약국',
    date: '2026-01-22',
    categoryId: 'cat4',
    category: { name: '의료/건강', icon: 'hospital', color: '#34d399', type: 'EXPENSE' },
  },
  {
    id: '8',
    type: 'INCOME',
    amount: 50000,
    description: '용돈',
    date: '2026-01-20',
    categoryId: 'cat9',
    category: { name: '용돈', icon: 'gift', color: '#f472b6', type: 'INCOME' },
  },
  {
    id: '9',
    type: 'EXPENSE',
    amount: 500000,
    description: '비상금 저축',
    date: '2026-01-25',
    categoryId: 'cat10',
    savingsGoalId: 'savings1',
    category: { name: '저축', icon: 'savings', color: '#60a5fa', type: 'EXPENSE' },
  },
];

// Mock categories
const MOCK_CATEGORIES = {
  EXPENSE: [
    { id: 'cat1', name: '식비', icon: 'restaurant', color: '#ff6b6b', type: 'EXPENSE' as const },
    { id: 'cat2', name: '교통', icon: 'car', color: '#60a5fa', type: 'EXPENSE' as const },
    { id: 'cat3', name: '생활용품', icon: 'cart', color: '#a78bfa', type: 'EXPENSE' as const },
    { id: 'cat4', name: '의료/건강', icon: 'hospital', color: '#34d399', type: 'EXPENSE' as const },
    { id: 'cat5', name: '문화/여가', icon: 'movie', color: '#fbbf24', type: 'EXPENSE' as const },
  ],
  INCOME: [
    { id: 'cat7', name: '급여', icon: 'money', color: '#4ade80', type: 'INCOME' as const },
    { id: 'cat8', name: '부수입', icon: 'star', color: '#fbbf24', type: 'INCOME' as const },
    { id: 'cat9', name: '용돈', icon: 'gift', color: '#f472b6', type: 'INCOME' as const },
  ],
};

// formatDate를 formatDateWithDay로 대체 (shared에서 import)
const formatDate = formatDateWithDay;

type FilterType = 'ALL' | 'INCOME' | 'EXPENSE' | 'SAVINGS';
type SortOrder = 'recent' | 'oldest' | 'expensive' | 'cheapest';

interface DateRange {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

interface AmountRange {
  minAmount: number | null;
  maxAmount: number | null;
}

export default function TransactionsScreen() {
  const { userId } = useAuthStore();
  const { theme } = useThemeStore();
  const { showToast } = useToast();
  const { triggerRefresh, lastTransactionUpdate } = useRefreshStore();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithCategory | null>(null);
  const [editType, setEditType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editAmountExceeded, setEditAmountExceeded] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [isEditCategoryDropdownOpen, setIsEditCategoryDropdownOpen] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Savings transaction edit modal states
  const [isSavingsEditModalOpen, setIsSavingsEditModalOpen] = useState(false);
  const [editingSavingsTransaction, setEditingSavingsTransaction] = useState<SavingsTransactionForEdit | null>(null);
  const [isSavingsEditSubmitting, setIsSavingsEditSubmitting] = useState(false);
  const isSavingsDeleteInProgress = useRef(false);

  // Filter categories (loaded from API)
  const [filterCategories, setFilterCategories] = useState<{ INCOME: Category[]; EXPENSE: Category[] }>({
    INCOME: [],
    EXPENSE: [],
  });

  // Edit modal drag-to-dismiss
  const screenHeight = Dimensions.get('window').height;
  const editModalTranslateY = useRef(new Animated.Value(0)).current;
  const DISMISS_THRESHOLD = 120;

  const editModalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 아래로 드래그할 때만 반응
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // 아래로만 드래그 가능
        if (gestureState.dy > 0) {
          editModalTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DISMISS_THRESHOLD) {
          // 임계값 이상이면 모달 닫기
          Animated.timing(editModalTranslateY, {
            toValue: screenHeight,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            handleCloseEditModal();
            editModalTranslateY.setValue(0);
          });
        } else {
          // 임계값 미만이면 원래 위치로
          Animated.spring(editModalTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  // Filter states (applied)
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDateFilterEnabled, setIsDateFilterEnabled] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [isAmountFilterEnabled, setIsAmountFilterEnabled] = useState(false);
  const [amountRange, setAmountRange] = useState<AmountRange | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Draft filter states (used in modal before applying)
  const [draftFilterType, setDraftFilterType] = useState<FilterType>('ALL');
  const [draftIsDateFilterEnabled, setDraftIsDateFilterEnabled] = useState(false);
  const [draftDateRange, setDraftDateRange] = useState<DateRange | null>(null);
  const [draftIsAmountFilterEnabled, setDraftIsAmountFilterEnabled] = useState(false);
  const [draftAmountRange, setDraftAmountRange] = useState<AmountRange | null>(null);
  const [draftMinAmountInput, setDraftMinAmountInput] = useState('');
  const [draftMaxAmountInput, setDraftMaxAmountInput] = useState('');
  const [draftSelectedCategories, setDraftSelectedCategories] = useState<string[]>([]);

  // Date picker dropdown states
  const [activeDropdown, setActiveDropdown] = useState<'startYear' | 'startMonth' | 'endYear' | 'endMonth' | null>(null);

  // Category accordion states
  const [isIncomeCategoryOpen, setIsIncomeCategoryOpen] = useState(true);
  const [isExpenseCategoryOpen, setIsExpenseCategoryOpen] = useState(true);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const fetchData = useCallback(async (isRefresh: boolean = false) => {
    if (USE_MOCK_DATA) {
      setTransactions(MOCK_TRANSACTIONS);
      setHasMore(false);
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    if (!userId) return;

    try {
      // Use paginated API - initial load of 50 items
      const res = await transactionApi.getRecentPaginated(userId, INITIAL_LOAD_LIMIT, 0);
      if (res.success && res.data) {
        // Map API response to local TransactionWithCategory format
        const mappedTransactions: TransactionWithCategory[] = res.data.transactions.map(tx => ({
          id: tx.id,
          amount: tx.amount,
          type: tx.type,
          description: tx.description || '',
          date: tx.date,
          categoryId: tx.categoryId,
          savingsGoalId: tx.savingsGoalId,
          category: tx.category ? {
            name: tx.category.name,
            icon: tx.category.icon,
            color: tx.category.color,
            type: tx.category.type,
          } : undefined,
        }));
        setTransactions(mappedTransactions);
        setHasMore(res.data.hasMore);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Load more transactions for infinite scroll
  const loadMoreData = useCallback(async () => {
    if (!userId || !hasMore || isLoadingMore || isLoading) return;

    setIsLoadingMore(true);

    try {
      const currentOffset = transactions.length;
      const res = await transactionApi.getRecentPaginated(userId, LOAD_MORE_LIMIT, currentOffset);

      if (res.success && res.data) {
        const mappedTransactions: TransactionWithCategory[] = res.data.transactions.map(tx => ({
          id: tx.id,
          amount: tx.amount,
          type: tx.type,
          description: tx.description || '',
          date: tx.date,
          categoryId: tx.categoryId,
          savingsGoalId: tx.savingsGoalId,
          category: tx.category ? {
            name: tx.category.name,
            icon: tx.category.icon,
            color: tx.category.color,
            type: tx.category.type,
          } : undefined,
        }));

        setTransactions(prev => [...prev, ...mappedTransactions]);
        setHasMore(res.data.hasMore);
      }
    } catch (error) {
      console.error('Failed to load more transactions:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [userId, hasMore, isLoadingMore, isLoading, transactions.length]);

  // Fetch categories for filter modal
  const fetchFilterCategories = useCallback(async () => {
    if (!userId) return;

    try {
      const res = await categoryApi.getAll(userId);
      if (res.success && res.data) {
        const income = res.data.filter(c => c.type === 'INCOME');
        const expense = res.data.filter(c => c.type === 'EXPENSE');
        setFilterCategories({ INCOME: income, EXPENSE: expense });
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, [userId]);

  // Track last seen update to avoid duplicate fetches
  const lastSeenUpdate = useRef(0);

  useEffect(() => {
    fetchData();
    fetchFilterCategories();
  }, [fetchData, fetchFilterCategories]);

  // Refetch when screen gains focus (handles tab switching)
  useFocusEffect(
    useCallback(() => {
      // Check if there was a new update since we last fetched
      if (lastTransactionUpdate > lastSeenUpdate.current) {
        lastSeenUpdate.current = lastTransactionUpdate;
        fetchData();
      }
    }, [lastTransactionUpdate, fetchData])
  );

  // Listen for transaction updates while on this screen
  useEffect(() => {
    if (lastTransactionUpdate > 0 && lastTransactionUpdate > lastSeenUpdate.current) {
      lastSeenUpdate.current = lastTransactionUpdate;
      fetchData();
    }
  }, [lastTransactionUpdate, fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  // Handle scroll to detect end of list for infinite scroll
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 100; // 하단에서 100px 전에 로드 시작
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    if (isCloseToBottom && hasMore && !isLoadingMore && !isLoading) {
      loadMoreData();
    }
  }, [hasMore, isLoadingMore, isLoading, loadMoreData]);

  // Open filter modal and copy current states to draft
  const openFilterModal = () => {
    setDraftFilterType(filterType);
    setDraftIsDateFilterEnabled(isDateFilterEnabled);
    setDraftDateRange(dateRange);
    setDraftIsAmountFilterEnabled(isAmountFilterEnabled);
    setDraftAmountRange(amountRange);
    setDraftMinAmountInput(amountRange?.minAmount?.toLocaleString('ko-KR') || '');
    setDraftMaxAmountInput(amountRange?.maxAmount?.toLocaleString('ko-KR') || '');
    setDraftSelectedCategories([...selectedCategories]);
    setActiveDropdown(null);
    setIsFilterModalOpen(true);
  };

  // Apply filters from draft states
  const applyFilters = () => {
    setFilterType(draftFilterType);
    setIsDateFilterEnabled(draftIsDateFilterEnabled);
    setDateRange(draftDateRange);
    setIsAmountFilterEnabled(draftIsAmountFilterEnabled);
    setAmountRange(draftAmountRange);
    setSelectedCategories(draftSelectedCategories);
    setActiveDropdown(null);
    setIsFilterModalOpen(false);
  };

  // Close filter modal without applying
  const closeFilterModal = () => {
    setActiveDropdown(null);
    setIsFilterModalOpen(false);
  };

  // Handle date filter toggle (draft)
  const handleDateFilterToggle = (enabled: boolean) => {
    setDraftIsDateFilterEnabled(enabled);
    if (enabled) {
      setDraftDateRange({
        startYear: currentYear,
        startMonth: currentMonth,
        endYear: currentYear,
        endMonth: currentMonth,
      });
    } else {
      setDraftDateRange(null);
    }
  };

  // Handle amount filter toggle (draft)
  const handleAmountFilterToggle = (enabled: boolean) => {
    setDraftIsAmountFilterEnabled(enabled);
    if (enabled) {
      setDraftAmountRange({ minAmount: null, maxAmount: null });
    } else {
      setDraftAmountRange(null);
      setDraftMinAmountInput('');
      setDraftMaxAmountInput('');
    }
  };

  // Handle amount input (draft, max 1000억)
  const handleAmountInputChange = (type: 'min' | 'max', value: string) => {
    const rawValue = value.replace(/,/g, '');
    if (rawValue === '') {
      if (type === 'min') {
        setDraftMinAmountInput('');
        setDraftAmountRange(prev => prev ? { ...prev, minAmount: null } : null);
      } else {
        setDraftMaxAmountInput('');
        setDraftAmountRange(prev => prev ? { ...prev, maxAmount: null } : null);
      }
      return;
    }
    if (!/^\d+$/.test(rawValue)) return;
    // Limit to max 1000억
    const numValue = Math.min(parseInt(rawValue), AMOUNT_LIMITS.TRANSACTION_MAX);
    const formatted = numValue.toLocaleString('ko-KR');
    if (type === 'min') {
      setDraftMinAmountInput(formatted);
      setDraftAmountRange(prev => prev ? { ...prev, minAmount: numValue } : null);
    } else {
      setDraftMaxAmountInput(formatted);
      setDraftAmountRange(prev => prev ? { ...prev, maxAmount: numValue } : null);
    }
  };

  // Toggle category selection (draft)
  const toggleCategory = (categoryId: string) => {
    setDraftSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Helper to check if transaction is savings
  const isSavingsTransaction = (tx: TransactionWithCategory): boolean => {
    return !!(tx.savingsGoalId || tx.category?.name === '저축');
  };

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let result = transactions.filter((tx) => {
      // Type filter
      let typeMatch = false;
      if (filterType === 'ALL') {
        typeMatch = true;
      } else if (filterType === 'SAVINGS') {
        typeMatch = isSavingsTransaction(tx);
      } else if (filterType === 'EXPENSE') {
        typeMatch = tx.type === 'EXPENSE' && !isSavingsTransaction(tx);
      } else if (filterType === 'INCOME') {
        typeMatch = tx.type === 'INCOME';
      }

      // Keyword filter
      const keywordMatch =
        !searchKeyword ||
        tx.description?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        tx.category?.name.toLowerCase().includes(searchKeyword.toLowerCase());

      // Date filter
      let dateMatch = true;
      if (isDateFilterEnabled && dateRange) {
        const txDate = new Date(tx.date);
        const txYear = txDate.getFullYear();
        const txMonth = txDate.getMonth();
        const startDate = new Date(dateRange.startYear, dateRange.startMonth, 1);
        const endDate = new Date(dateRange.endYear, dateRange.endMonth + 1, 0);
        dateMatch = txDate >= startDate && txDate <= endDate;
      }

      // Amount filter
      let amountMatch = true;
      if (isAmountFilterEnabled && amountRange) {
        if (amountRange.minAmount !== null && tx.amount < amountRange.minAmount) {
          amountMatch = false;
        }
        if (amountRange.maxAmount !== null && tx.amount > amountRange.maxAmount) {
          amountMatch = false;
        }
      }

      // Category filter
      const categoryMatch =
        selectedCategories.length === 0 ||
        (tx.categoryId && selectedCategories.includes(tx.categoryId));

      return typeMatch && keywordMatch && dateMatch && amountMatch && categoryMatch;
    });

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortOrder) {
        case 'recent':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'oldest':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'expensive':
          return b.amount - a.amount;
        case 'cheapest':
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    return result;
  }, [transactions, filterType, searchKeyword, sortOrder, isDateFilterEnabled, dateRange, isAmountFilterEnabled, amountRange, selectedCategories]);

  // Group transactions by date (normalize to YYYY-MM-DD to group same-day transactions)
  const groupedTransactions = useMemo(() => {
    const groups: { [date: string]: TransactionWithCategory[] } = {};
    filteredTransactions.forEach((tx) => {
      // Extract just the date portion (YYYY-MM-DD) to group same-day transactions
      const dateKey = tx.date.split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    });

    const entries = Object.entries(groups);
    if (sortOrder === 'oldest') {
      entries.sort(([a], [b]) => a.localeCompare(b));
    } else if (sortOrder === 'recent') {
      entries.sort(([a], [b]) => b.localeCompare(a));
    }

    return entries;
  }, [filteredTransactions, sortOrder]);

  // Summary calculation
  const summary = useMemo(() => {
    const income = filteredTransactions
      .filter((tx) => tx.type === 'INCOME')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const savings = filteredTransactions
      .filter((tx) => isSavingsTransaction(tx))
      .reduce((sum, tx) => sum + tx.amount, 0);
    const expense = filteredTransactions
      .filter((tx) => tx.type === 'EXPENSE' && !isSavingsTransaction(tx))
      .reduce((sum, tx) => sum + tx.amount, 0);
    return { income, expense, savings, balance: income - expense - savings };
  }, [filteredTransactions]);

  const hasActiveFilters =
    filterType !== 'ALL' ||
    searchKeyword !== '' ||
    isDateFilterEnabled ||
    isAmountFilterEnabled ||
    selectedCategories.length > 0;

  const activeFilterCount = [
    filterType !== 'ALL',
    isDateFilterEnabled,
    isAmountFilterEnabled,
    selectedCategories.length > 0,
  ].filter(Boolean).length;

  // Reset draft filters in modal
  const handleResetFilters = () => {
    setDraftFilterType('ALL');
    setDraftIsDateFilterEnabled(false);
    setDraftDateRange(null);
    setDraftIsAmountFilterEnabled(false);
    setDraftAmountRange(null);
    setDraftMinAmountInput('');
    setDraftMaxAmountInput('');
    setDraftSelectedCategories([]);
    setActiveDropdown(null);
  };

  // Fetch categories for edit modal
  const fetchCategories = useCallback(async () => {
    if (!userId) return;
    setIsCategoriesLoading(true);
    const result = await categoryApi.getAll(userId);
    if (result.success && result.data) {
      setAllCategories(result.data);
    }
    setIsCategoriesLoading(false);
  }, [userId]);

  // Open edit modal
  const handleOpenEditModal = (tx: TransactionWithCategory) => {
    // 저축 거래는 별도 모달로 표시
    if (tx.savingsGoalId) {
      setEditingSavingsTransaction({
        id: tx.id,
        amount: tx.amount,
        description: tx.description || '',
        date: tx.date,
        savingsGoalId: tx.savingsGoalId,
      });
      setIsSavingsEditModalOpen(true);
      return;
    }
    setEditingTransaction(tx);
    setEditType(tx.type);
    setEditDescription(tx.description || '');
    setEditAmount(tx.amount.toLocaleString('ko-KR'));
    setEditAmountExceeded(false);
    setEditCategoryId(tx.categoryId || null);
    setIsEditCategoryDropdownOpen(false);
    setShowDeleteConfirm(false);
    setIsEditModalOpen(true);
    fetchCategories();
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTransaction(null);
    setShowDeleteConfirm(false);
    setEditAmountExceeded(false);
    editModalTranslateY.setValue(0);
  };

  // Close savings transaction edit modal
  const handleCloseSavingsEditModal = () => {
    setIsSavingsEditModalOpen(false);
    setEditingSavingsTransaction(null);
  };

  // Delete savings transaction
  const handleDeleteSavingsTransaction = async () => {
    // ref로 즉시 중복 호출 방지
    if (isSavingsDeleteInProgress.current) return;
    if (!userId || !editingSavingsTransaction) return;

    isSavingsDeleteInProgress.current = true;
    const transactionId = editingSavingsTransaction.id;

    // 모달 먼저 닫기
    setIsSavingsEditModalOpen(false);
    setEditingSavingsTransaction(null);

    const res = await transactionApi.delete(transactionId, userId);
    if (res.success) {
      showToast('저축 내역이 삭제되었습니다.', 'success');
      triggerRefresh();
      fetchData(true);
    } else {
      showToast('삭제에 실패했습니다.', 'error');
    }

    // 3초 후에 ref 해제 (중복 호출 방지 유지)
    setTimeout(() => {
      isSavingsDeleteInProgress.current = false;
    }, 3000);
  };

  // Format amount for edit with max limit (returns { value, exceeded })
  const formatEditAmountWithCheck = (value: string): { value: string; exceeded: boolean } => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (!numericValue) return { value: '', exceeded: false };
    const num = Number(numericValue);
    if (num > AMOUNT_LIMITS.TRANSACTION_MAX) {
      return { value: AMOUNT_LIMITS.TRANSACTION_MAX.toLocaleString('ko-KR'), exceeded: true };
    }
    return { value: num.toLocaleString('ko-KR'), exceeded: false };
  };

  const handleEditAmountChange = (text: string) => {
    const result = formatEditAmountWithCheck(text);
    setEditAmount(result.value);
    setEditAmountExceeded(result.exceeded);
  };

  // Submit edit
  const handleEditSubmit = async () => {
    if (!userId || !editingTransaction) return;

    const numericAmount = parseInt(editAmount.replace(/,/g, ''), 10);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showToast('올바른 금액을 입력해주세요.', 'error');
      return;
    }

    setIsEditSubmitting(true);

    const result = await transactionApi.update(editingTransaction.id, {
      userId,
      type: editType,
      amount: numericAmount,
      description: editDescription.trim() || undefined,
      categoryId: editCategoryId || undefined,
    });

    setIsEditSubmitting(false);

    if (result.success) {
      handleCloseEditModal();
      showToast('내역이 수정되었습니다.', 'success');
      triggerRefresh();
      fetchData();
    } else {
      showToast(result.error || '내역 수정에 실패했습니다.', 'error');
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async () => {
    if (!userId || !editingTransaction) return;

    setIsEditSubmitting(true);

    const result = await transactionApi.delete(editingTransaction.id, userId);

    setIsEditSubmitting(false);

    if (result.success) {
      handleCloseEditModal();
      showToast('내역이 삭제되었습니다.', 'success');
      triggerRefresh();
      fetchData();
    } else {
      showToast(result.error || '내역 삭제에 실패했습니다.', 'error');
    }
  };

  // Get categories for edit modal
  const editCategories = useMemo(() => {
    const filtered = allCategories.filter(c => c.type === editType);
    if (filtered.length > 0) return filtered;
    // Fallback to filter categories
    return editType === 'EXPENSE' ? filterCategories.EXPENSE : filterCategories.INCOME;
  }, [allCategories, editType, filterCategories]);

  // Year/Month options
  const yearOptions = [];
  for (let y = 2020; y <= currentYear; y++) {
    yearOptions.push(y);
  }
  const monthOptions = Array.from({ length: 12 }, (_, i) => i);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    header: {
      padding: 20,
      paddingTop: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    // Search and filter row
    searchFilterRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      marginBottom: 16,
      gap: 8,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
      marginLeft: 8,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      gap: 6,
    },
    filterButtonActive: {
      backgroundColor: colors.accentMint,
      borderColor: colors.accentMint,
    },
    filterBadge: {
      backgroundColor: '#fff',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    filterBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.accentMint,
    },
    // Summary card (TodaySummaryCard style)
    summaryCard: {
      marginHorizontal: 20,
      marginBottom: 16,
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    summaryHeaderIcon: {
      marginRight: 8,
    },
    summaryTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    summaryContent: {
      padding: 16,
    },
    summaryItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    summaryValue: {
      fontSize: 15,
      fontWeight: '600',
    },
    summaryDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
    },
    summaryTotalLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    summaryTotalValue: {
      fontSize: 16,
      fontWeight: '700',
    },
    // Transaction list
    section: {
      paddingHorizontal: 20,
    },
    dateGroup: {
      marginBottom: 16,
    },
    dateHeader: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    transactionCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
    },
    transactionIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    transactionInfo: {
      flex: 1,
    },
    transactionDescription: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    transactionCategory: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    transactionRight: {
      alignItems: 'flex-end',
    },
    transactionTime: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    transactionAmount: {
      fontSize: 15,
      fontWeight: '600',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 66,
    },
    // Empty state
    emptyState: {
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 12,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingMore: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    loadingMoreText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    endOfList: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    endOfListText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    // Filter Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: '85%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    modalBody: {
      padding: 20,
    },
    filterSection: {
      marginBottom: 24,
    },
    filterSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    filterSectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    filterToggleLabel: {
      fontSize: 12,
      color: colors.textMuted,
    },
    filterGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    filterTypeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    filterTypeOption: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.bgSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterOption: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: colors.bgSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    filterOptionActive: {
      borderColor: colors.accentMint,
    },
    filterOptionText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    filterOptionTextActive: {
      color: '#fff',
    },
    // Date/Amount filter content
    filterContent: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 16,
    },
    filterRow: {
      marginBottom: 12,
    },
    filterRowLast: {
      marginBottom: 0,
    },
    filterLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 8,
    },
    filterInputRow: {
      flexDirection: 'row',
      gap: 8,
    },
    filterSelect: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.bgCard,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    filterSelectActive: {
      borderColor: colors.accentMint,
    },
    filterSelectText: {
      fontSize: 14,
      color: colors.textPrimary,
    },
    dropdownList: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: 4,
      backgroundColor: colors.bgCard,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      zIndex: 100,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    dropdownItem: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownItemActive: {
      backgroundColor: colors.accentMint + '20',
    },
    dropdownItemText: {
      fontSize: 14,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    dropdownItemTextActive: {
      color: colors.accentMint,
      fontWeight: '600',
    },
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
    },
    amountInputExceeded: {
      borderColor: '#F87171',
      borderWidth: 2,
    },
    amountPrefix: {
      fontSize: 14,
      color: colors.textMuted,
      marginRight: 4,
    },
    amountInput: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.textPrimary,
      textAlign: 'right',
    },
    // Category section
    categoryAccordion: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 8,
    },
    categoryAccordionLast: {
      marginBottom: 0,
    },
    categoryAccordionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
    },
    categoryAccordionTitle: {
      fontSize: 14,
      fontWeight: '500',
      flexDirection: 'row',
      alignItems: 'center',
    },
    categoryAccordionCount: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: 'normal',
    },
    categoryList: {
      paddingHorizontal: 8,
      paddingBottom: 8,
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: 8,
      padding: 10,
      marginBottom: 4,
    },
    categoryItemLast: {
      marginBottom: 0,
    },
    categoryCheckbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.border,
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryCheckboxActive: {
      backgroundColor: colors.accentMint,
      borderColor: colors.accentMint,
    },
    categoryItemName: {
      fontSize: 14,
      color: colors.textPrimary,
    },
    // Action buttons
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
      paddingTop: 0,
    },
    resetButton: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    resetButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    applyButton: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    applyButtonGradient: {
      paddingVertical: 14,
      alignItems: 'center',
    },
    applyButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    // Edit Modal Styles
    editModalContent: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: insets.bottom + 20,
      width: '100%',
    },
    editModalHandleContainer: {
      width: '100%',
      alignItems: 'center',
      paddingVertical: 12,
    },
    editModalHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
    },
    editModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    editModalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    editModalBody: {
      paddingHorizontal: 20,
    },
    editTypeIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      marginBottom: 20,
    },
    editTypeText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
      marginLeft: 8,
    },
    editFieldContainer: {
      marginBottom: 16,
    },
    editFieldLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    editTextInput: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    editAmountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    editAmountContainerExceeded: {
      borderColor: '#F87171',
      borderWidth: 2,
    },
    amountExceededText: {
      fontSize: 12,
      color: '#F87171',
      marginTop: 6,
    },
    editCurrencySymbol: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textMuted,
      marginRight: 8,
    },
    editAmountInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    editCategoryDropdown: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    editCategoryTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    editCategorySelected: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    editCategoryTriggerText: {
      fontSize: 15,
      color: colors.textMuted,
    },
    editCategorySelectedText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    editCategoryList: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      maxHeight: 200,
    },
    editCategoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    editCategoryItemSelected: {
      backgroundColor: 'rgba(52, 211, 153, 0.1)',
    },
    editCategoryItemText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    editCategoryItemTextSelected: {
      color: colors.accentMint,
      fontWeight: '500',
    },
    editActionButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    editCancelButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
    },
    editCancelButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    editSubmitButton: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    editSubmitButtonGradient: {
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editSubmitButtonDisabled: {
      opacity: 0.5,
    },
    editSubmitButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    deleteButton: {
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.accentCoral,
      alignItems: 'center',
      marginTop: 12,
    },
    deleteButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.accentCoral,
    },
    deleteConfirmContainer: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderRadius: 12,
      padding: 16,
      marginTop: 12,
    },
    deleteConfirmText: {
      fontSize: 14,
      color: colors.accentCoral,
      textAlign: 'center',
      marginBottom: 12,
    },
    deleteConfirmButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    deleteConfirmCancel: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
    },
    deleteConfirmCancelText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    deleteConfirmDelete: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.accentCoral,
      alignItems: 'center',
    },
    deleteConfirmDeleteText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentMint} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentMint}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        <View style={styles.header}>
          <Text style={styles.title}>내역</Text>
          <Text style={styles.subtitle}>
            전체 {filteredTransactions.length}건
          </Text>
        </View>

        {/* Search Bar and Filter Button */}
        <View style={styles.searchFilterRow}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="내역 검색..."
              placeholderTextColor={colors.textMuted}
              value={searchKeyword}
              onChangeText={setSearchKeyword}
            />
            {searchKeyword.length > 0 && (
              <TouchableOpacity onPress={() => setSearchKeyword('')}>
                <MaterialIcons name="cancel" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
            onPress={openFilterModal}
          >
            <MaterialIcons
              name="tune"
              size={20}
              color={hasActiveFilters ? '#fff' : colors.textMuted}
            />
            <Text style={{ fontSize: 14, fontWeight: '500', color: hasActiveFilters ? '#fff' : colors.textMuted }}>
              필터
            </Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialIcons
              name="account-balance-wallet"
              size={18}
              color={colors.accentMint}
              style={styles.summaryHeaderIcon}
            />
            <Text style={styles.summaryTitle}>요약</Text>
          </View>
          <View style={styles.summaryContent}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>수입</Text>
              <Text style={[styles.summaryValue, { color: summary.income > 0 ? colors.accentMint : colors.textMuted }]}>
                {summary.income > 0 ? `+₩${formatNumber(summary.income)}` : '-'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>지출</Text>
              <Text style={[styles.summaryValue, { color: summary.expense > 0 ? colors.accentCoral : colors.textMuted }]}>
                {summary.expense > 0 ? `-₩${formatNumber(summary.expense)}` : '-'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>저축</Text>
              <Text style={[styles.summaryValue, { color: summary.savings > 0 ? colors.accentCyan : colors.textMuted }]}>
                {summary.savings > 0 ? `₩${formatNumber(summary.savings)}` : '-'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryTotalLabel}>합계</Text>
              <Text
                style={[
                  styles.summaryTotalValue,
                  { color: summary.balance >= 0 ? colors.accentMint : colors.accentCoral },
                ]}
              >
                {summary.balance >= 0 ? '+' : '-'}₩{formatNumber(Math.abs(summary.balance))}
              </Text>
            </View>
          </View>
        </View>

        {/* Transaction List */}
        <View style={styles.section}>
          {groupedTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons
                name="receipt-long"
                size={48}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>
                {hasActiveFilters
                  ? '검색 결과가 없습니다'
                  : '거래 내역이 없습니다'}
              </Text>
            </View>
          ) : (
            groupedTransactions.map(([date, txs]) => (
              <View key={date} style={styles.dateGroup}>
                <Text style={styles.dateHeader}>{formatDate(date)}</Text>
                <View style={styles.transactionCard}>
                  {txs.map((tx, index) => {
                    const isSavings = isSavingsTransaction(tx);
                    const iconColor = isSavings
                      ? colors.accentCyan
                      : (tx.category?.color || '#6B7280');
                    const amountColor = isSavings
                      ? colors.accentCyan
                      : tx.type === 'INCOME'
                        ? colors.accentMint
                        : colors.accentCoral;
                    const categoryName = isSavings
                      ? '저축'
                      : (tx.category?.name || '미분류');
                    const iconName = isSavings
                      ? 'savings'
                      : getIconName(tx.category?.icon);

                    return (
                      <View key={tx.id}>
                        <TouchableOpacity
                          style={styles.transactionItem}
                          onPress={() => handleOpenEditModal(tx)}
                        >
                          <View
                            style={[
                              styles.transactionIcon,
                              { backgroundColor: iconColor + '20' },
                            ]}
                          >
                            <MaterialIcons
                              name={iconName}
                              size={20}
                              color={iconColor}
                            />
                          </View>
                          <View style={styles.transactionInfo}>
                            <Text style={styles.transactionDescription}>
                              {tx.description || '내역 없음'}
                            </Text>
                            <Text style={styles.transactionCategory}>
                              {categoryName}
                            </Text>
                          </View>
                          <View style={styles.transactionRight}>
                            <Text
                              style={[
                                styles.transactionAmount,
                                { color: amountColor },
                              ]}
                            >
                              {tx.type === 'INCOME' ? '+' : '-'}₩{formatNumber(tx.amount)}
                            </Text>
                            <Text style={styles.transactionTime}>
                              {formatTime(tx.date)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        {index < txs.length - 1 && <View style={styles.divider} />}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )}

          {/* Loading More Indicator */}
          {isLoadingMore && (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.accentMint} />
              <Text style={styles.loadingMoreText}>더 불러오는 중...</Text>
            </View>
          )}

          {/* End of List Indicator */}
          {!hasMore && transactions.length > 0 && !isLoading && (
            <View style={styles.endOfList}>
              <Text style={styles.endOfListText}>모든 내역을 불러왔습니다</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={isFilterModalOpen}
        animationType="slide"
        transparent
        onRequestClose={closeFilterModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>필터</Text>
              <TouchableOpacity onPress={closeFilterModal}>
                <MaterialIcons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
              onScrollBeginDrag={() => setActiveDropdown(null)}
            >
              {/* Transaction Type */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>거래 유형</Text>
                <View style={[styles.filterTypeRow, { marginTop: 12 }]}>
                  {[
                    { value: 'ALL', label: '전체', gradient: ['#34D399', '#60A5FA'] },
                    { value: 'INCOME', label: '수입', gradient: ['#34D399', '#4ade80'] },
                    { value: 'EXPENSE', label: '지출', gradient: ['#F87171', '#FBBF24'] },
                    { value: 'SAVINGS', label: '저축', gradient: ['#60A5FA', '#A78BFA'] },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterTypeOption,
                        draftFilterType === option.value && styles.filterOptionActive,
                      ]}
                      onPress={() => setDraftFilterType(option.value as FilterType)}
                    >
                      {draftFilterType === option.value && (
                        <LinearGradient
                          colors={option.gradient as [string, string]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                      )}
                      <Text
                        style={[
                          styles.filterOptionText,
                          draftFilterType === option.value && styles.filterOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date Filter */}
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Text style={styles.filterSectionTitle}>기간</Text>
                  <View style={styles.filterToggleRow}>
                    <Text style={styles.filterToggleLabel}>사용</Text>
                    <Switch
                      value={draftIsDateFilterEnabled}
                      onValueChange={handleDateFilterToggle}
                      trackColor={{ false: colors.border, true: colors.accentMint }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
                {draftIsDateFilterEnabled && draftDateRange && (
                  <View style={styles.filterContent}>
                    {/* 시작 날짜 */}
                    <View style={[styles.filterRow, { zIndex: 20 }]}>
                      <Text style={styles.filterLabel}>시작</Text>
                      <View style={styles.filterInputRow}>
                        {/* 시작 연도 드롭다운 */}
                        <View style={{ flex: 1, zIndex: activeDropdown === 'startYear' ? 10 : 1 }}>
                          <TouchableOpacity
                            style={[styles.filterSelect, activeDropdown === 'startYear' && styles.filterSelectActive]}
                            onPress={() => setActiveDropdown(activeDropdown === 'startYear' ? null : 'startYear')}
                          >
                            <Text style={styles.filterSelectText}>{draftDateRange.startYear}년</Text>
                            <MaterialIcons
                              name={activeDropdown === 'startYear' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                              size={18}
                              color={colors.textMuted}
                            />
                          </TouchableOpacity>
                          {activeDropdown === 'startYear' && (
                            <View style={styles.dropdownList}>
                              <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                                {yearOptions.map((year) => (
                                  <TouchableOpacity
                                    key={year}
                                    style={[styles.dropdownItem, draftDateRange.startYear === year && styles.dropdownItemActive]}
                                    onPress={() => {
                                      setDraftDateRange({ ...draftDateRange, startYear: year });
                                      setActiveDropdown(null);
                                    }}
                                  >
                                    <Text style={[styles.dropdownItemText, draftDateRange.startYear === year && styles.dropdownItemTextActive]}>
                                      {year}년
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          )}
                        </View>
                        {/* 시작 월 드롭다운 */}
                        <View style={{ flex: 1, zIndex: activeDropdown === 'startMonth' ? 10 : 1 }}>
                          <TouchableOpacity
                            style={[styles.filterSelect, activeDropdown === 'startMonth' && styles.filterSelectActive]}
                            onPress={() => setActiveDropdown(activeDropdown === 'startMonth' ? null : 'startMonth')}
                          >
                            <Text style={styles.filterSelectText}>{draftDateRange.startMonth + 1}월</Text>
                            <MaterialIcons
                              name={activeDropdown === 'startMonth' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                              size={18}
                              color={colors.textMuted}
                            />
                          </TouchableOpacity>
                          {activeDropdown === 'startMonth' && (
                            <View style={styles.dropdownList}>
                              <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                                {monthOptions.map((month) => (
                                  <TouchableOpacity
                                    key={month}
                                    style={[styles.dropdownItem, draftDateRange.startMonth === month && styles.dropdownItemActive]}
                                    onPress={() => {
                                      setDraftDateRange({ ...draftDateRange, startMonth: month });
                                      setActiveDropdown(null);
                                    }}
                                  >
                                    <Text style={[styles.dropdownItemText, draftDateRange.startMonth === month && styles.dropdownItemTextActive]}>
                                      {month + 1}월
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                    {/* 종료 날짜 */}
                    <View style={[styles.filterRow, styles.filterRowLast, { zIndex: 10 }]}>
                      <Text style={styles.filterLabel}>종료</Text>
                      <View style={styles.filterInputRow}>
                        {/* 종료 연도 드롭다운 */}
                        <View style={{ flex: 1, zIndex: activeDropdown === 'endYear' ? 10 : 1 }}>
                          <TouchableOpacity
                            style={[styles.filterSelect, activeDropdown === 'endYear' && styles.filterSelectActive]}
                            onPress={() => setActiveDropdown(activeDropdown === 'endYear' ? null : 'endYear')}
                          >
                            <Text style={styles.filterSelectText}>{draftDateRange.endYear}년</Text>
                            <MaterialIcons
                              name={activeDropdown === 'endYear' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                              size={18}
                              color={colors.textMuted}
                            />
                          </TouchableOpacity>
                          {activeDropdown === 'endYear' && (
                            <View style={styles.dropdownList}>
                              <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                                {yearOptions.map((year) => (
                                  <TouchableOpacity
                                    key={year}
                                    style={[styles.dropdownItem, draftDateRange.endYear === year && styles.dropdownItemActive]}
                                    onPress={() => {
                                      setDraftDateRange({ ...draftDateRange, endYear: year });
                                      setActiveDropdown(null);
                                    }}
                                  >
                                    <Text style={[styles.dropdownItemText, draftDateRange.endYear === year && styles.dropdownItemTextActive]}>
                                      {year}년
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          )}
                        </View>
                        {/* 종료 월 드롭다운 */}
                        <View style={{ flex: 1, zIndex: activeDropdown === 'endMonth' ? 10 : 1 }}>
                          <TouchableOpacity
                            style={[styles.filterSelect, activeDropdown === 'endMonth' && styles.filterSelectActive]}
                            onPress={() => setActiveDropdown(activeDropdown === 'endMonth' ? null : 'endMonth')}
                          >
                            <Text style={styles.filterSelectText}>{draftDateRange.endMonth + 1}월</Text>
                            <MaterialIcons
                              name={activeDropdown === 'endMonth' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                              size={18}
                              color={colors.textMuted}
                            />
                          </TouchableOpacity>
                          {activeDropdown === 'endMonth' && (
                            <View style={styles.dropdownList}>
                              <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                                {monthOptions.map((month) => (
                                  <TouchableOpacity
                                    key={month}
                                    style={[styles.dropdownItem, draftDateRange.endMonth === month && styles.dropdownItemActive]}
                                    onPress={() => {
                                      setDraftDateRange({ ...draftDateRange, endMonth: month });
                                      setActiveDropdown(null);
                                    }}
                                  >
                                    <Text style={[styles.dropdownItemText, draftDateRange.endMonth === month && styles.dropdownItemTextActive]}>
                                      {month + 1}월
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Amount Filter */}
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Text style={styles.filterSectionTitle}>금액 범위</Text>
                  <View style={styles.filterToggleRow}>
                    <Text style={styles.filterToggleLabel}>사용</Text>
                    <Switch
                      value={draftIsAmountFilterEnabled}
                      onValueChange={handleAmountFilterToggle}
                      trackColor={{ false: colors.border, true: colors.accentMint }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
                {draftIsAmountFilterEnabled && (
                  <View style={styles.filterContent}>
                    <View style={styles.filterRow}>
                      <Text style={styles.filterLabel}>최소 금액</Text>
                      <View style={styles.amountInputContainer}>
                        <Text style={styles.amountPrefix}>₩</Text>
                        <TextInput
                          style={styles.amountInput}
                          value={draftMinAmountInput}
                          onChangeText={(v) => handleAmountInputChange('min', v)}
                          placeholder="0"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                    <View style={[styles.filterRow, styles.filterRowLast]}>
                      <Text style={styles.filterLabel}>최대 금액</Text>
                      <View style={styles.amountInputContainer}>
                        <Text style={styles.amountPrefix}>₩</Text>
                        <TextInput
                          style={styles.amountInput}
                          value={draftMaxAmountInput}
                          onChangeText={(v) => handleAmountInputChange('max', v)}
                          placeholder="최대 1000억"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Category Filter */}
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Text style={styles.filterSectionTitle}>
                    카테고리 {draftSelectedCategories.length > 0 && (
                      <Text style={{ color: colors.accentMint }}>({draftSelectedCategories.length})</Text>
                    )}
                  </Text>
                </View>

                {/* Income Categories */}
                {(draftFilterType === 'ALL' || draftFilterType === 'INCOME') && filterCategories.INCOME.length > 0 && (
                  <View style={styles.categoryAccordion}>
                    <TouchableOpacity
                      style={styles.categoryAccordionHeader}
                      onPress={() => setIsIncomeCategoryOpen(!isIncomeCategoryOpen)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="trending-up" size={16} color={colors.accentMint} style={{ marginRight: 6 }} />
                        <Text style={[styles.categoryAccordionTitle, { color: colors.accentMint }]}>
                          수입{' '}
                          <Text style={styles.categoryAccordionCount}>
                            ({filterCategories.INCOME.length})
                          </Text>
                        </Text>
                      </View>
                      <MaterialIcons
                        name={isIncomeCategoryOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                        size={18}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                    {isIncomeCategoryOpen && (
                      <View style={styles.categoryList}>
                        {filterCategories.INCOME.map((cat, index) => (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.categoryItem,
                              index === filterCategories.INCOME.length - 1 && styles.categoryItemLast,
                            ]}
                            onPress={() => toggleCategory(cat.id)}
                          >
                            <View
                              style={[
                                styles.categoryCheckbox,
                                draftSelectedCategories.includes(cat.id) && styles.categoryCheckboxActive,
                              ]}
                            >
                              {draftSelectedCategories.includes(cat.id) && (
                                <MaterialIcons name="check" size={14} color="#fff" />
                              )}
                            </View>
                            <MaterialIcons name={getIconName(cat.icon)} size={16} color={cat.color} style={{ marginRight: 8 }} />
                            <Text style={styles.categoryItemName}>{cat.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Expense Categories */}
                {(draftFilterType === 'ALL' || draftFilterType === 'EXPENSE') && filterCategories.EXPENSE.length > 0 && (
                  <View style={[styles.categoryAccordion, styles.categoryAccordionLast]}>
                    <TouchableOpacity
                      style={styles.categoryAccordionHeader}
                      onPress={() => setIsExpenseCategoryOpen(!isExpenseCategoryOpen)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="trending-down" size={16} color={colors.accentCoral} style={{ marginRight: 6 }} />
                        <Text style={[styles.categoryAccordionTitle, { color: colors.accentCoral }]}>
                          지출{' '}
                          <Text style={styles.categoryAccordionCount}>
                            ({filterCategories.EXPENSE.length})
                          </Text>
                        </Text>
                      </View>
                      <MaterialIcons
                        name={isExpenseCategoryOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                        size={18}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                    {isExpenseCategoryOpen && (
                      <View style={styles.categoryList}>
                        {filterCategories.EXPENSE.map((cat, index) => (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.categoryItem,
                              index === filterCategories.EXPENSE.length - 1 && styles.categoryItemLast,
                            ]}
                            onPress={() => toggleCategory(cat.id)}
                          >
                            <View
                              style={[
                                styles.categoryCheckbox,
                                draftSelectedCategories.includes(cat.id) && styles.categoryCheckboxActive,
                              ]}
                            >
                              {draftSelectedCategories.includes(cat.id) && (
                                <MaterialIcons name="check" size={14} color="#fff" />
                              )}
                            </View>
                            <MaterialIcons name={getIconName(cat.icon)} size={16} color={cat.color} style={{ marginRight: 8 }} />
                            <Text style={styles.categoryItemName}>{cat.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetFilters}
              >
                <Text style={styles.resetButtonText}>초기화</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyFilters}
              >
                <LinearGradient
                  colors={['#34D399', '#60A5FA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.applyButtonGradient}
                >
                  <Text style={styles.applyButtonText}>적용</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent
        onRequestClose={handleCloseEditModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleCloseEditModal}
          >
            <Animated.View
              style={[
                styles.editModalContent,
                { transform: [{ translateY: editModalTranslateY }] },
              ]}
            >
              {/* 드래그 핸들 영역 */}
              <View
                {...editModalPanResponder.panHandlers}
                style={styles.editModalHandleContainer}
              >
                <View style={styles.editModalHandle} />
              </View>

                <View style={styles.editModalHeader}>
                  <Text style={styles.editModalTitle}>내역 수정</Text>
                  <TouchableOpacity onPress={handleCloseEditModal}>
                    <MaterialIcons name="close" size={24} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.editModalBody}>
                  {/* Type Indicator (Read-only) */}
                  <LinearGradient
                    colors={editType === 'EXPENSE' ? ['#F87171', '#FBBF24'] : ['#34D399', '#60A5FA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.editTypeIndicator}
                  >
                    <MaterialIcons
                      name={editType === 'EXPENSE' ? 'trending-down' : 'trending-up'}
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.editTypeText}>
                      {editType === 'EXPENSE' ? '지출' : '수입'}
                    </Text>
                  </LinearGradient>

                  {/* Description */}
                  <View style={styles.editFieldContainer}>
                    <Text style={styles.editFieldLabel}>내용</Text>
                    <TextInput
                      style={styles.editTextInput}
                      placeholder="예: 점심 식사, 월급 등"
                      placeholderTextColor={colors.textMuted}
                      value={editDescription}
                      onChangeText={setEditDescription}
                    />
                  </View>

                  {/* Amount */}
                  <View style={styles.editFieldContainer}>
                    <Text style={styles.editFieldLabel}>금액</Text>
                    <View style={[styles.editAmountContainer, editAmountExceeded && styles.editAmountContainerExceeded]}>
                      <Text style={styles.editCurrencySymbol}>₩</Text>
                      <TextInput
                        style={styles.editAmountInput}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        value={editAmount}
                        onChangeText={handleEditAmountChange}
                        keyboardType="numeric"
                      />
                    </View>
                    {editAmountExceeded && (
                      <Text style={styles.amountExceededText}>
                        1000억 원을 초과할 수 없습니다.
                      </Text>
                    )}
                  </View>

                  {/* Category Dropdown */}
                  <View style={styles.editFieldContainer}>
                    <Text style={styles.editFieldLabel}>카테고리</Text>
                    <View style={styles.editCategoryDropdown}>
                      <TouchableOpacity
                        style={styles.editCategoryTrigger}
                        onPress={() => setIsEditCategoryDropdownOpen(!isEditCategoryDropdownOpen)}
                        disabled={isCategoriesLoading}
                      >
                        {(() => {
                          if (isCategoriesLoading) {
                            return (
                              <View style={styles.editCategorySelected}>
                                <ActivityIndicator size="small" color={colors.textMuted} />
                                <Text style={[styles.editCategoryTriggerText, { marginLeft: 8 }]}>
                                  로딩 중...
                                </Text>
                              </View>
                            );
                          }

                          if (editCategoryId) {
                            // 먼저 editCategories에서 찾고, 없으면 editingTransaction의 카테고리 정보 사용
                            const foundCategory = editCategories.find(c => c.id === editCategoryId);
                            const categoryInfo = foundCategory || editingTransaction?.category;

                            if (categoryInfo) {
                              return (
                                <View style={styles.editCategorySelected}>
                                  <MaterialIcons
                                    name={getIconName(categoryInfo.icon)}
                                    size={18}
                                    color={categoryInfo.color || colors.textPrimary}
                                  />
                                  <Text style={styles.editCategorySelectedText}>
                                    {categoryInfo.name}
                                  </Text>
                                </View>
                              );
                            }
                          }

                          return (
                            <Text style={styles.editCategoryTriggerText}>
                              카테고리 선택
                            </Text>
                          );
                        })()}
                        <MaterialIcons
                          name={isEditCategoryDropdownOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                          size={20}
                          color={colors.textMuted}
                        />
                      </TouchableOpacity>
                      {isEditCategoryDropdownOpen && !isCategoriesLoading && (
                        <ScrollView style={styles.editCategoryList} nestedScrollEnabled>
                          {editCategories.map((cat, index) => (
                            <TouchableOpacity
                              key={cat.id}
                              style={[
                                styles.editCategoryItem,
                                editCategoryId === cat.id && styles.editCategoryItemSelected,
                                index === editCategories.length - 1 && { borderBottomWidth: 0 },
                              ]}
                              onPress={() => {
                                setEditCategoryId(cat.id);
                                setIsEditCategoryDropdownOpen(false);
                              }}
                            >
                              <MaterialIcons name={getIconName(cat.icon)} size={20} color={cat.color} />
                              <Text
                                style={[
                                  styles.editCategoryItemText,
                                  editCategoryId === cat.id && styles.editCategoryItemTextSelected,
                                ]}
                              >
                                {cat.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.editActionButtons}>
                    <TouchableOpacity
                      style={styles.editCancelButton}
                      onPress={handleCloseEditModal}
                      disabled={isEditSubmitting}
                    >
                      <Text style={styles.editCancelButtonText}>취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.editSubmitButton,
                        isEditSubmitting && styles.editSubmitButtonDisabled,
                      ]}
                      onPress={handleEditSubmit}
                      disabled={isEditSubmitting}
                    >
                      <LinearGradient
                        colors={editType === 'EXPENSE' ? ['#F87171', '#FBBF24'] : ['#34D399', '#60A5FA']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.editSubmitButtonGradient}
                      >
                        {isEditSubmitting ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.editSubmitButtonText}>수정</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  {/* Delete Button */}
                  {!showDeleteConfirm ? (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => setShowDeleteConfirm(true)}
                      disabled={isEditSubmitting}
                    >
                      <Text style={styles.deleteButtonText}>삭제</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.deleteConfirmContainer}>
                      <Text style={styles.deleteConfirmText}>
                        정말로 이 내역을 삭제하시겠습니까?
                      </Text>
                      <View style={styles.deleteConfirmButtons}>
                        <TouchableOpacity
                          style={styles.deleteConfirmCancel}
                          onPress={() => setShowDeleteConfirm(false)}
                          disabled={isEditSubmitting}
                        >
                          <Text style={styles.deleteConfirmCancelText}>취소</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteConfirmDelete}
                          onPress={handleDeleteTransaction}
                          disabled={isEditSubmitting}
                        >
                          {isEditSubmitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.deleteConfirmDeleteText}>삭제</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                </View>
            </Animated.View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Savings Transaction Edit Modal */}
      <EditSavingsTransactionModal
        visible={isSavingsEditModalOpen}
        transaction={editingSavingsTransaction}
        onClose={handleCloseSavingsEditModal}
        onDelete={handleDeleteSavingsTransaction}
        isSubmitting={isSavingsEditSubmitting}
      />
    </View>
  );
}
