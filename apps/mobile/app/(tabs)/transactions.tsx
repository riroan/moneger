import { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { getIconName } from '../../constants/Icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { transactionApi, Transaction } from '../../lib/api';

// Mock data for testing
const USE_MOCK_DATA = true;

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
    { id: 'cat1', name: '식비', icon: 'restaurant', color: '#ff6b6b' },
    { id: 'cat2', name: '교통', icon: 'car', color: '#60a5fa' },
    { id: 'cat3', name: '생활용품', icon: 'cart', color: '#a78bfa' },
    { id: 'cat4', name: '의료/건강', icon: 'hospital', color: '#34d399' },
    { id: 'cat5', name: '문화/여가', icon: 'movie', color: '#fbbf24' },
  ],
  INCOME: [
    { id: 'cat7', name: '급여', icon: 'money', color: '#4ade80' },
    { id: 'cat8', name: '부수입', icon: 'star', color: '#fbbf24' },
    { id: 'cat9', name: '용돈', icon: 'gift', color: '#f472b6' },
  ],
};

const formatNumber = (num: number) => {
  return num.toLocaleString('ko-KR');
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[date.getDay()];
  return `${month}월 ${day}일 (${dayName})`;
};

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
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Date filter
  const [isDateFilterEnabled, setIsDateFilterEnabled] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  // Amount filter
  const [isAmountFilterEnabled, setIsAmountFilterEnabled] = useState(false);
  const [amountRange, setAmountRange] = useState<AmountRange | null>(null);
  const [minAmountInput, setMinAmountInput] = useState('');
  const [maxAmountInput, setMaxAmountInput] = useState('');

  // Category filter
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isIncomeCategoryOpen, setIsIncomeCategoryOpen] = useState(true);
  const [isExpenseCategoryOpen, setIsExpenseCategoryOpen] = useState(true);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const fetchData = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setTransactions(MOCK_TRANSACTIONS);
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    if (!userId) return;

    try {
      const res = await transactionApi.getAll(userId, currentYear, currentMonth + 1);
      if (res.success && res.data) {
        setTransactions(res.data as TransactionWithCategory[]);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId, currentYear, currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Handle date filter toggle
  const handleDateFilterToggle = (enabled: boolean) => {
    setIsDateFilterEnabled(enabled);
    if (enabled) {
      setDateRange({
        startYear: currentYear,
        startMonth: currentMonth,
        endYear: currentYear,
        endMonth: currentMonth,
      });
    } else {
      setDateRange(null);
    }
  };

  // Handle amount filter toggle
  const handleAmountFilterToggle = (enabled: boolean) => {
    setIsAmountFilterEnabled(enabled);
    if (enabled) {
      setAmountRange({ minAmount: null, maxAmount: null });
    } else {
      setAmountRange(null);
      setMinAmountInput('');
      setMaxAmountInput('');
    }
  };

  // Handle amount input
  const handleAmountInputChange = (type: 'min' | 'max', value: string) => {
    const rawValue = value.replace(/,/g, '');
    if (rawValue === '') {
      if (type === 'min') {
        setMinAmountInput('');
        setAmountRange(prev => prev ? { ...prev, minAmount: null } : null);
      } else {
        setMaxAmountInput('');
        setAmountRange(prev => prev ? { ...prev, maxAmount: null } : null);
      }
      return;
    }
    if (!/^\d+$/.test(rawValue)) return;
    const numValue = parseInt(rawValue);
    const formatted = numValue.toLocaleString('ko-KR');
    if (type === 'min') {
      setMinAmountInput(formatted);
      setAmountRange(prev => prev ? { ...prev, minAmount: numValue } : null);
    } else {
      setMaxAmountInput(formatted);
      setAmountRange(prev => prev ? { ...prev, maxAmount: numValue } : null);
    }
  };

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
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

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: { [date: string]: TransactionWithCategory[] } = {};
    filteredTransactions.forEach((tx) => {
      if (!groups[tx.date]) {
        groups[tx.date] = [];
      }
      groups[tx.date].push(tx);
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

  const handleResetFilters = () => {
    setFilterType('ALL');
    setSearchKeyword('');
    setIsDateFilterEnabled(false);
    setDateRange(null);
    setIsAmountFilterEnabled(false);
    setAmountRange(null);
    setMinAmountInput('');
    setMaxAmountInput('');
    setSelectedCategories([]);
  };

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
    // Summary cards
    summaryContainer: {
      paddingHorizontal: 20,
      marginBottom: 16,
      gap: 8,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 8,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryLabel: {
      fontSize: 11,
      color: colors.textMuted,
      marginBottom: 4,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: 'bold',
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
      maxHeight: '85%',
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
      flex: 1,
      backgroundColor: colors.bgCard,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    filterSelectText: {
      fontSize: 14,
      color: colors.textPrimary,
      textAlign: 'center',
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
            onPress={() => setIsFilterModalOpen(true)}
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

        {/* Summary Cards - 2x2 Grid */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>수입</Text>
              <Text style={[styles.summaryValue, { color: colors.accentMint }]}>
                +{formatNumber(summary.income)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>지출</Text>
              <Text style={[styles.summaryValue, { color: colors.accentCoral }]}>
                -{formatNumber(summary.expense)}
              </Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>저축</Text>
              <Text style={[styles.summaryValue, { color: colors.accentBlue }]}>
                {formatNumber(summary.savings)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>합계</Text>
              <Text
                style={[
                  styles.summaryValue,
                  { color: summary.balance >= 0 ? colors.accentMint : colors.accentCoral },
                ]}
              >
                {summary.balance >= 0 ? '+' : ''}{formatNumber(summary.balance)}
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
                  {txs.map((tx, index) => (
                    <View key={tx.id}>
                      <TouchableOpacity style={styles.transactionItem}>
                        <View
                          style={[
                            styles.transactionIcon,
                            { backgroundColor: (tx.category?.color || '#6B7280') + '20' },
                          ]}
                        >
                          <MaterialIcons
                            name={getIconName(tx.category?.icon)}
                            size={20}
                            color={tx.category?.color || '#6B7280'}
                          />
                        </View>
                        <View style={styles.transactionInfo}>
                          <Text style={styles.transactionDescription}>
                            {tx.description || '내역 없음'}
                          </Text>
                          <Text style={styles.transactionCategory}>
                            {tx.category?.name || '미분류'}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.transactionAmount,
                            {
                              color:
                                tx.type === 'INCOME'
                                  ? colors.accentMint
                                  : colors.accentCoral,
                            },
                          ]}
                        >
                          {tx.type === 'INCOME' ? '+' : '-'}
                          {formatNumber(tx.amount)}
                        </Text>
                      </TouchableOpacity>
                      {index < txs.length - 1 && <View style={styles.divider} />}
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={isFilterModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>필터</Text>
              <TouchableOpacity onPress={() => setIsFilterModalOpen(false)}>
                <MaterialIcons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Transaction Type */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>거래 유형</Text>
                <View style={[styles.filterGrid, { marginTop: 12 }]}>
                  {[
                    { value: 'ALL', label: '전체', gradient: ['#34D399', '#60A5FA'] },
                    { value: 'INCOME', label: '수입', gradient: ['#34D399', '#4ade80'] },
                    { value: 'EXPENSE', label: '지출', gradient: ['#F87171', '#FBBF24'] },
                    { value: 'SAVINGS', label: '저축', gradient: ['#60A5FA', '#A78BFA'] },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterOption,
                        filterType === option.value && styles.filterOptionActive,
                      ]}
                      onPress={() => setFilterType(option.value as FilterType)}
                    >
                      {filterType === option.value && (
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
                          filterType === option.value && styles.filterOptionTextActive,
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
                      value={isDateFilterEnabled}
                      onValueChange={handleDateFilterToggle}
                      trackColor={{ false: colors.border, true: colors.accentMint }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
                {isDateFilterEnabled && dateRange && (
                  <View style={styles.filterContent}>
                    <View style={styles.filterRow}>
                      <Text style={styles.filterLabel}>시작</Text>
                      <View style={styles.filterInputRow}>
                        <TouchableOpacity
                          style={styles.filterSelect}
                          onPress={() => {
                            const newYear = dateRange.startYear === 2020 ? currentYear : dateRange.startYear - 1;
                            setDateRange({ ...dateRange, startYear: newYear });
                          }}
                        >
                          <Text style={styles.filterSelectText}>{dateRange.startYear}년</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.filterSelect}
                          onPress={() => {
                            const newMonth = (dateRange.startMonth + 1) % 12;
                            setDateRange({ ...dateRange, startMonth: newMonth });
                          }}
                        >
                          <Text style={styles.filterSelectText}>{dateRange.startMonth + 1}월</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={[styles.filterRow, styles.filterRowLast]}>
                      <Text style={styles.filterLabel}>종료</Text>
                      <View style={styles.filterInputRow}>
                        <TouchableOpacity
                          style={styles.filterSelect}
                          onPress={() => {
                            const newYear = dateRange.endYear === currentYear ? 2020 : dateRange.endYear + 1;
                            setDateRange({ ...dateRange, endYear: newYear });
                          }}
                        >
                          <Text style={styles.filterSelectText}>{dateRange.endYear}년</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.filterSelect}
                          onPress={() => {
                            const newMonth = (dateRange.endMonth + 1) % 12;
                            setDateRange({ ...dateRange, endMonth: newMonth });
                          }}
                        >
                          <Text style={styles.filterSelectText}>{dateRange.endMonth + 1}월</Text>
                        </TouchableOpacity>
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
                      value={isAmountFilterEnabled}
                      onValueChange={handleAmountFilterToggle}
                      trackColor={{ false: colors.border, true: colors.accentMint }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
                {isAmountFilterEnabled && (
                  <View style={styles.filterContent}>
                    <View style={styles.filterRow}>
                      <Text style={styles.filterLabel}>최소 금액</Text>
                      <View style={styles.amountInputContainer}>
                        <Text style={styles.amountPrefix}>₩</Text>
                        <TextInput
                          style={styles.amountInput}
                          value={minAmountInput}
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
                          value={maxAmountInput}
                          onChangeText={(v) => handleAmountInputChange('max', v)}
                          placeholder="제한 없음"
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
                    카테고리 {selectedCategories.length > 0 && (
                      <Text style={{ color: colors.accentMint }}>({selectedCategories.length})</Text>
                    )}
                  </Text>
                </View>

                {/* Income Categories */}
                {(filterType === 'ALL' || filterType === 'INCOME') && (
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
                            ({MOCK_CATEGORIES.INCOME.length})
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
                        {MOCK_CATEGORIES.INCOME.map((cat, index) => (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.categoryItem,
                              index === MOCK_CATEGORIES.INCOME.length - 1 && styles.categoryItemLast,
                            ]}
                            onPress={() => toggleCategory(cat.id)}
                          >
                            <View
                              style={[
                                styles.categoryCheckbox,
                                selectedCategories.includes(cat.id) && styles.categoryCheckboxActive,
                              ]}
                            >
                              {selectedCategories.includes(cat.id) && (
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
                {(filterType === 'ALL' || filterType === 'EXPENSE') && (
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
                            ({MOCK_CATEGORIES.EXPENSE.length})
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
                        {MOCK_CATEGORIES.EXPENSE.map((cat, index) => (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.categoryItem,
                              index === MOCK_CATEGORIES.EXPENSE.length - 1 && styles.categoryItemLast,
                            ]}
                            onPress={() => toggleCategory(cat.id)}
                          >
                            <View
                              style={[
                                styles.categoryCheckbox,
                                selectedCategories.includes(cat.id) && styles.categoryCheckboxActive,
                              ]}
                            >
                              {selectedCategories.includes(cat.id) && (
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
                onPress={() => setIsFilterModalOpen(false)}
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
    </View>
  );
}
