import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 20; // 좌우 패딩
const CARD_GAP = 12; // 카드 사이 간격
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2; // 카드 실제 너비
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP; // 스냅 간격 (카드 너비 + 간격)
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { balanceApi, transactionApi, Transaction } from '../../lib/api';

// Mock data for testing
const USE_MOCK_DATA = true;

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    amount: 50000,
    type: 'EXPENSE',
    description: '점심 식사',
    date: new Date().toISOString(),
    categoryId: 'cat1',
    categoryName: '식비',
    categoryIcon: '🍔',
    categoryColor: '#ff6b6b',
  },
  {
    id: '2',
    amount: 3500000,
    type: 'INCOME',
    description: '월급',
    date: new Date().toISOString(),
    categoryId: 'cat2',
    categoryName: '급여',
    categoryIcon: '💰',
    categoryColor: '#4ade80',
  },
  {
    id: '3',
    amount: 15000,
    type: 'EXPENSE',
    description: '교통비',
    date: new Date().toISOString(),
    categoryId: 'cat3',
    categoryName: '교통',
    categoryIcon: '🚌',
    categoryColor: '#60a5fa',
  },
  {
    id: '4',
    amount: 89000,
    type: 'EXPENSE',
    description: '마트 장보기',
    date: new Date().toISOString(),
    categoryId: 'cat4',
    categoryName: '생활용품',
    categoryIcon: '🛒',
    categoryColor: '#a78bfa',
  },
  {
    id: '5',
    amount: 200000,
    type: 'INCOME',
    description: '부수입',
    date: new Date().toISOString(),
    categoryId: 'cat5',
    categoryName: '기타수입',
    categoryIcon: '✨',
    categoryColor: '#fbbf24',
  },
];

const MOCK_BALANCE = {
  balance: 12500000,
  totalIncome: 3700000,
  totalExpense: 1200000,
};

const MOCK_USER_NAME = '테스트';

// Mock summary cards data
const MOCK_SUMMARY_CARDS = {
  income: { amount: 15050000, count: 3 },
  expense: { amount: 19595123, count: 14 },
  savings: { amount: 2060000, count: 5 },
  netBalance: { amount: -6605123, lastMonthDiff: -6605123 },
};

export default function HomeScreen() {
  const { userId, userName } = useAuthStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const [balance, setBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const carouselRef = useRef<ScrollView>(null);

  // Summary cards data for carousel (matching web icons)
  const summaryCards = [
    {
      type: 'income',
      label: '이번 달 수입',
      amount: MOCK_SUMMARY_CARDS.income.amount,
      badge: `${MOCK_SUMMARY_CARDS.income.count}건의 수입`,
      icon: 'money-bill-wave', // FaMoneyBillWave
      iconBg: '#10B981',
      barColor: '#10B981',
      badgeBg: 'rgba(34, 197, 94, 0.2)',
      badgeText: '#4ade80',
    },
    {
      type: 'expense',
      label: '이번 달 지출',
      amount: MOCK_SUMMARY_CARDS.expense.amount,
      badge: `${MOCK_SUMMARY_CARDS.expense.count}건의 지출`,
      icon: 'credit-card', // FaCreditCard
      iconBg: '#B91C1C',
      barColor: '#EF4444',
      badgeBg: 'rgba(239, 68, 68, 0.2)',
      badgeText: '#f87171',
    },
    {
      type: 'savings',
      label: '저축',
      amount: MOCK_SUMMARY_CARDS.savings.amount,
      badge: `${MOCK_SUMMARY_CARDS.savings.count}건의 저축`,
      icon: 'chart-line', // FaChartLine
      iconBg: '#0891B2',
      barColor: '#06B6D4',
      badgeBg: 'rgba(6, 182, 212, 0.2)',
      badgeText: '#22d3ee',
    },
    {
      type: 'balance',
      label: '잔액',
      amount: MOCK_SUMMARY_CARDS.netBalance.amount,
      badge: `지난달 대비 ${MOCK_SUMMARY_CARDS.netBalance.lastMonthDiff < 0 ? '-' : '+'}₩${Math.abs(MOCK_SUMMARY_CARDS.netBalance.lastMonthDiff).toLocaleString()}`,
      icon: 'wallet', // FaWallet
      iconBg: '#7C3AED',
      barColor: '#8B5CF6',
      badgeBg: 'rgba(168, 85, 247, 0.2)',
      badgeText: '#c084fc',
      isNegative: MOCK_SUMMARY_CARDS.netBalance.amount < 0,
    },
  ];

  const handleCarouselScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SNAP_INTERVAL);
    setActiveCardIndex(Math.max(0, Math.min(index, summaryCards.length - 1)));
  };

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const fetchData = useCallback(async () => {
    if (USE_MOCK_DATA) {
      // Use mock data for testing
      setBalance(MOCK_BALANCE.balance);
      setTotalIncome(MOCK_BALANCE.totalIncome);
      setTotalExpense(MOCK_BALANCE.totalExpense);
      setTransactions(MOCK_TRANSACTIONS.slice(0, 5));
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    if (!userId) return;

    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        balanceApi.get(userId),
        transactionApi.getAll(userId, year, month),
      ]);

      if (balanceRes.success && balanceRes.data) {
        setBalance(balanceRes.data.balance);
        setTotalIncome(balanceRes.data.totalIncome);
        setTotalExpense(balanceRes.data.totalExpense);
      }

      if (transactionsRes.success && transactionsRes.data) {
        setTransactions(transactionsRes.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId, year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '0원';
    return amount.toLocaleString('ko-KR') + '원';
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    header: {
      padding: 20,
      paddingTop: 10,
    },
    greeting: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    userName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginTop: 4,
    },
    balanceCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      padding: 24,
      margin: 20,
      marginTop: 0,
      borderWidth: 1,
      borderColor: colors.border,
    },
    balanceLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    balanceAmount: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    summaryRow: {
      flexDirection: 'row',
      marginTop: 20,
      gap: 12,
    },
    summaryItem: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 16,
    },
    summaryLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 4,
    },
    summaryIncome: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.accentMint,
    },
    summaryExpense: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.accentCoral,
    },
    section: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    transactionIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    transactionInfo: {
      flex: 1,
    },
    transactionDesc: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    transactionCategory: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    transactionAmount: {
      fontSize: 16,
      fontWeight: '600',
    },
    incomeAmount: {
      color: colors.accentMint,
    },
    expenseAmount: {
      color: colors.accentCoral,
    },
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
    // Summary cards carousel styles
    carouselContainer: {
      marginBottom: 10,
    },
    carouselCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      paddingTop: 24,
      paddingHorizontal: 20,
      paddingBottom: 24,
      width: CARD_WIDTH,
      marginRight: CARD_GAP,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    carouselCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    carouselCardIcon: {
      width: 56,
      height: 56,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    carouselCardInfo: {
      flex: 1,
      alignItems: 'flex-end',
    },
    carouselCardLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    carouselCardAmount: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    carouselCardBadge: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
    },
    carouselCardBadgeText: {
      fontSize: 12,
      fontWeight: '500',
    },
    carouselCardBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 4,
    },
    // Pagination dots
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 12,
      gap: 8,
    },
    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    paginationDotActive: {
      backgroundColor: colors.accentMint,
      width: 24,
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
          <Text style={styles.greeting}>안녕하세요,</Text>
          <Text style={styles.userName}>{USE_MOCK_DATA ? MOCK_USER_NAME : (userName || '사용자')}님</Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>총 자산</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
        </View>

        {/* Summary Cards Carousel */}
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={carouselRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={handleCarouselScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={SNAP_INTERVAL}
            snapToAlignment="start"
            contentContainerStyle={{ paddingLeft: CARD_PADDING, paddingRight: CARD_PADDING - CARD_GAP }}
          >
            {summaryCards.map((card, index) => (
              <View key={card.type} style={styles.carouselCard}>
                <View style={styles.carouselCardContent}>
                  <View style={[styles.carouselCardIcon, { backgroundColor: card.iconBg }]}>
                    <FontAwesome5 name={card.icon} size={24} color="#fff" />
                  </View>
                  <View style={styles.carouselCardInfo}>
                    <Text style={styles.carouselCardLabel}>{card.label}</Text>
                    <Text style={styles.carouselCardAmount}>
                      {card.isNegative ? '-' : ''}₩{Math.abs(card.amount).toLocaleString()}
                    </Text>
                    <View style={[styles.carouselCardBadge, { backgroundColor: card.badgeBg }]}>
                      <Text style={[styles.carouselCardBadgeText, { color: card.badgeText }]}>
                        {card.badge}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.carouselCardBar, { backgroundColor: card.barColor }]} />
              </View>
            ))}
          </ScrollView>

          {/* Pagination dots */}
          <View style={styles.paginationContainer}>
            {summaryCards.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  activeCardIndex === index && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>최근 거래</Text>

          {(!transactions || transactions.length === 0) ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="receipt-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>아직 거래 내역이 없습니다</Text>
            </View>
          ) : (
            transactions.map((tx) => (
              <View key={tx.id} style={styles.transactionItem}>
                <View style={styles.transactionIcon}>
                  <Text style={{ fontSize: 20 }}>
                    {tx.categoryIcon || (tx.type === 'INCOME' ? '💰' : '💸')}
                  </Text>
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDesc}>
                    {tx.description || (tx.type === 'INCOME' ? '수입' : '지출')}
                  </Text>
                  <Text style={styles.transactionCategory}>
                    {tx.categoryName || '미분류'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    tx.type === 'INCOME'
                      ? styles.incomeAmount
                      : styles.expenseAmount,
                  ]}
                >
                  {tx.type === 'INCOME' ? '+' : '-'}
                  {formatCurrency(tx.amount)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
