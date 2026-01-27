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
import Svg, { Path, G } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 20;
const CARD_GAP = 12;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
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

// Mock today summary data
const MOCK_TODAY_SUMMARY = {
  month: new Date().getMonth() + 1,
  day: new Date().getDate(),
  dayOfWeek: new Date().getDay(),
  income: { total: 200000, count: 1 },
  expense: { total: 154000, count: 3 },
  savings: { total: 100000, count: 1 },
};

// Mock savings goal data
const MOCK_SAVINGS_GOAL = {
  id: '1',
  name: '해외여행',
  icon: 'travel',
  currentAmount: 1250000,
  targetAmount: 3000000,
  targetDate: '2026-06-30',
  progressPercent: 42,
};

// Mock category expense data
const MOCK_CATEGORY_EXPENSES = [
  { id: '1', name: '식비', icon: '🍔', color: '#ff6b6b', amount: 450000, count: 12, budget: 500000 },
  { id: '2', name: '교통', icon: '🚌', color: '#60a5fa', amount: 120000, count: 8, budget: 150000 },
  { id: '3', name: '생활용품', icon: '🛒', color: '#a78bfa', amount: 230000, count: 5, budget: 200000 },
  { id: '4', name: '문화/여가', icon: '🎬', color: '#fbbf24', amount: 180000, count: 3, budget: 300000 },
  { id: '5', name: '의료/건강', icon: '💊', color: '#34d399', amount: 85000, count: 2, budget: 100000 },
];

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// Donut Chart Component
interface DonutChartProps {
  data: { color: string; amount: number }[];
  size: number;
  strokeWidth: number;
  centerText: string;
  centerSubtext: string;
  textColor: string;
  mutedColor: string;
}

function DonutChart({ data, size, strokeWidth, centerText, centerSubtext, textColor, mutedColor }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let currentAngle = -90; // Start from top

  const paths = data.map((item, index) => {
    const percentage = total > 0 ? item.amount / total : 0;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    // Convert angles to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Calculate arc path
    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

    return (
      <Path
        key={index}
        d={d}
        stroke={item.color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
    );
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G>
          {paths}
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: textColor }}>{centerText}</Text>
        <Text style={{ fontSize: 11, color: mutedColor, marginTop: 2 }}>{centerSubtext}</Text>
      </View>
    </View>
  );
}

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
      icon: 'money-bill-wave',
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
      icon: 'credit-card',
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
      icon: 'chart-line',
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
      icon: 'wallet',
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

  const formatNumber = (amount: number) => {
    return amount.toLocaleString('ko-KR');
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Summary cards carousel styles
    carouselContainer: {
      marginBottom: 16,
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
    // Cards section
    cardsSection: {
      paddingHorizontal: 20,
      gap: 12,
      marginBottom: 16,
    },
    // Today summary card
    todayCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    todayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    todayTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    todayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    todayRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    todayLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    todayAmount: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    todayCount: {
      fontSize: 11,
      color: colors.textMuted,
      marginLeft: 6,
    },
    todayEmpty: {
      fontSize: 14,
      color: colors.textMuted,
    },
    // Savings card
    savingsCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    savingsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    savingsHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    savingsTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    savingsViewAll: {
      fontSize: 13,
      color: colors.textMuted,
    },
    savingsGoalContainer: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 16,
    },
    savingsGoalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    savingsGoalIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: 'rgba(251, 191, 36, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    savingsGoalStarBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#FBBF24',
      alignItems: 'center',
      justifyContent: 'center',
    },
    savingsGoalInfo: {
      flex: 1,
    },
    savingsGoalNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    savingsGoalName: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    savingsGoalBadge: {
      fontSize: 11,
      color: '#FBBF24',
      fontWeight: '500',
    },
    savingsGoalDate: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    savingsAmountContainer: {
      alignItems: 'flex-end',
      marginBottom: 12,
    },
    savingsCurrentAmount: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    savingsTargetRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    savingsTargetAmount: {
      fontSize: 12,
      color: colors.textMuted,
    },
    savingsPercent: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.accentMint,
      marginLeft: 4,
    },
    savingsProgressBar: {
      height: 8,
      backgroundColor: colors.bgCard,
      borderRadius: 4,
      overflow: 'hidden',
    },
    savingsProgressFill: {
      height: '100%',
      borderRadius: 4,
    },
    savingsEmpty: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 20,
      alignItems: 'center',
    },
    savingsEmptyText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    // Recent transactions
    section: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    sectionViewAll: {
      fontSize: 13,
      color: colors.textMuted,
    },
    transactionsCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },
    transactionIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    transactionInfo: {
      flex: 1,
    },
    transactionDesc: {
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
    incomeAmount: {
      color: colors.accentMint,
    },
    expenseAmount: {
      color: colors.accentCoral,
    },
    emptyState: {
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 8,
    },
    transactionDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    // Category expense styles
    categoryCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chartContainer: {
      alignItems: 'center',
      marginBottom: 16,
      paddingVertical: 8,
    },
    categoryItem: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    categoryItemLast: {
      marginBottom: 0,
    },
    categoryItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    categoryIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    categoryIconText: {
      fontSize: 18,
    },
    categoryInfo: {
      flex: 1,
    },
    categoryName: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    categoryCount: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    categoryAmountContainer: {
      alignItems: 'flex-end',
    },
    categoryAmount: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    categoryBudget: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    categoryProgressContainer: {
      marginTop: 8,
    },
    categoryProgressBar: {
      height: 6,
      backgroundColor: colors.bgCard,
      borderRadius: 3,
      overflow: 'hidden',
    },
    categoryProgressFill: {
      height: '100%',
      borderRadius: 3,
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

  const hasIncomeToday = MOCK_TODAY_SUMMARY.income.count > 0;
  const hasExpenseToday = MOCK_TODAY_SUMMARY.expense.count > 0;
  const hasSavingsToday = MOCK_TODAY_SUMMARY.savings.count > 0;
  const hasAnyToday = hasIncomeToday || hasExpenseToday || hasSavingsToday;

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
            {summaryCards.map((card) => (
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

        {/* Today Summary & Savings Cards */}
        <View style={styles.cardsSection}>
          {/* Today Summary Card */}
          <View style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <MaterialIcons name="today" size={20} color="#FBBF24" />
              <Text style={styles.todayTitle}>
                오늘 ({MOCK_TODAY_SUMMARY.month}월 {MOCK_TODAY_SUMMARY.day}일 {DAY_NAMES[MOCK_TODAY_SUMMARY.dayOfWeek]})
              </Text>
            </View>

            {hasAnyToday ? (
              <>
                {/* Income */}
                <View style={styles.todayRow}>
                  <View style={styles.todayRowLeft}>
                    <FontAwesome5 name="money-bill-wave" size={14} color={colors.accentMint} />
                    <Text style={styles.todayLabel}>수입</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {hasIncomeToday ? (
                      <>
                        <Text style={[styles.todayAmount, { color: colors.accentMint }]}>
                          ₩{formatNumber(MOCK_TODAY_SUMMARY.income.total)}
                        </Text>
                        <Text style={styles.todayCount}>({MOCK_TODAY_SUMMARY.income.count}건)</Text>
                      </>
                    ) : (
                      <Text style={styles.todayEmpty}>-</Text>
                    )}
                  </View>
                </View>

                {/* Expense */}
                <View style={styles.todayRow}>
                  <View style={styles.todayRowLeft}>
                    <FontAwesome5 name="credit-card" size={14} color={colors.accentCoral} />
                    <Text style={styles.todayLabel}>지출</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {hasExpenseToday ? (
                      <>
                        <Text style={[styles.todayAmount, { color: colors.accentCoral }]}>
                          ₩{formatNumber(MOCK_TODAY_SUMMARY.expense.total)}
                        </Text>
                        <Text style={styles.todayCount}>({MOCK_TODAY_SUMMARY.expense.count}건)</Text>
                      </>
                    ) : (
                      <Text style={styles.todayEmpty}>-</Text>
                    )}
                  </View>
                </View>

                {/* Savings */}
                <View style={styles.todayRow}>
                  <View style={styles.todayRowLeft}>
                    <MaterialIcons name="savings" size={16} color="#3B82F6" />
                    <Text style={styles.todayLabel}>저축</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {hasSavingsToday ? (
                      <>
                        <Text style={[styles.todayAmount, { color: '#3B82F6' }]}>
                          ₩{formatNumber(MOCK_TODAY_SUMMARY.savings.total)}
                        </Text>
                        <Text style={styles.todayCount}>({MOCK_TODAY_SUMMARY.savings.count}건)</Text>
                      </>
                    ) : (
                      <Text style={styles.todayEmpty}>-</Text>
                    )}
                  </View>
                </View>
              </>
            ) : (
              <Text style={[styles.todayEmpty, { textAlign: 'center', paddingVertical: 8 }]}>
                오늘 거래 내역이 없습니다
              </Text>
            )}
          </View>

          {/* Savings Card */}
          <View style={styles.savingsCard}>
            <View style={styles.savingsHeader}>
              <View style={styles.savingsHeaderLeft}>
                <FontAwesome5 name="chart-line" size={18} color="#06B6D4" />
                <Text style={styles.savingsTitle}>저축</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.savingsViewAll}>전체보기 →</Text>
              </TouchableOpacity>
            </View>

            {MOCK_SAVINGS_GOAL ? (
              <View style={styles.savingsGoalContainer}>
                {/* Goal header */}
                <View style={styles.savingsGoalHeader}>
                  <View style={styles.savingsGoalIconContainer}>
                    <MaterialIcons name="flight" size={20} color="#FBBF24" />
                    <View style={styles.savingsGoalStarBadge}>
                      <FontAwesome5 name="star" size={8} color="#fff" />
                    </View>
                  </View>
                  <View style={styles.savingsGoalInfo}>
                    <View style={styles.savingsGoalNameRow}>
                      <Text style={styles.savingsGoalName}>{MOCK_SAVINGS_GOAL.name}</Text>
                      <Text style={styles.savingsGoalBadge}>대표</Text>
                    </View>
                    <Text style={styles.savingsGoalDate}>{MOCK_SAVINGS_GOAL.targetDate}</Text>
                  </View>
                </View>

                {/* Amount */}
                <View style={styles.savingsAmountContainer}>
                  <Text style={styles.savingsCurrentAmount}>
                    ₩{formatNumber(MOCK_SAVINGS_GOAL.currentAmount)}
                  </Text>
                  <View style={styles.savingsTargetRow}>
                    <Text style={styles.savingsTargetAmount}>
                      / ₩{formatNumber(MOCK_SAVINGS_GOAL.targetAmount)}
                    </Text>
                    <Text style={styles.savingsPercent}>
                      ({MOCK_SAVINGS_GOAL.progressPercent}%)
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.savingsProgressBar}>
                  <View
                    style={[
                      styles.savingsProgressFill,
                      {
                        width: `${Math.min(MOCK_SAVINGS_GOAL.progressPercent, 100)}%`,
                        backgroundColor: colors.accentMint,
                      },
                    ]}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.savingsEmpty}>
                <Text style={styles.savingsEmptyText}>대표 저축 목표를 설정해주세요</Text>
              </View>
            )}
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.transactionsCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <MaterialIcons name="history" size={20} color={colors.accentMint} />
                <Text style={styles.sectionTitle}>최근 내역</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.sectionViewAll}>전체보기 →</Text>
              </TouchableOpacity>
            </View>
            {(!transactions || transactions.length === 0) ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="receipt-outline"
                  size={40}
                  color={colors.textMuted}
                />
                <Text style={styles.emptyText}>거래 내역이 없습니다</Text>
              </View>
            ) : (
              transactions.map((tx, index) => (
                <View key={tx.id}>
                  <View style={styles.transactionItem}>
                    <View style={styles.transactionIcon}>
                      <Text style={{ fontSize: 18 }}>
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
                  {index < transactions.length - 1 && (
                    <View style={styles.transactionDivider} />
                  )}
                </View>
              ))
            )}
          </View>
        </View>

        {/* Category Expenses */}
        <View style={styles.section}>
          <View style={styles.categoryCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <MaterialIcons name="pie-chart" size={20} color={colors.accentMint} />
                <Text style={styles.sectionTitle}>카테고리별 지출</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.sectionViewAll}>전체보기 →</Text>
              </TouchableOpacity>
            </View>
            {MOCK_CATEGORY_EXPENSES.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="pie-chart-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyText}>이번 달 지출 내역이 없습니다</Text>
              </View>
            ) : (
              <>
                {/* Donut Chart */}
                <View style={styles.chartContainer}>
                  <DonutChart
                    data={MOCK_CATEGORY_EXPENSES.map(cat => ({ color: cat.color, amount: cat.amount }))}
                    size={160}
                    strokeWidth={20}
                    centerText={`₩${formatNumber(MOCK_CATEGORY_EXPENSES.reduce((sum, cat) => sum + cat.amount, 0))}`}
                    centerSubtext="총 지출"
                    textColor={colors.textPrimary}
                    mutedColor={colors.textMuted}
                  />
                </View>

                {/* Category List */}
                {MOCK_CATEGORY_EXPENSES.map((cat, index) => {
                const usagePercent = cat.budget ? Math.round((cat.amount / cat.budget) * 100) : 0;
                const progressColor = usagePercent >= 90
                  ? colors.accentCoral
                  : usagePercent >= 66
                  ? colors.accentYellow
                  : colors.accentMint;

                return (
                  <View
                    key={cat.id}
                    style={[
                      styles.categoryItem,
                      index === MOCK_CATEGORY_EXPENSES.length - 1 && styles.categoryItemLast,
                    ]}
                  >
                    <View style={styles.categoryItemHeader}>
                      <View
                        style={[
                          styles.categoryIconContainer,
                          { backgroundColor: `${cat.color}20` },
                        ]}
                      >
                        <Text style={styles.categoryIconText}>{cat.icon}</Text>
                      </View>
                      <View style={styles.categoryInfo}>
                        <Text style={styles.categoryName}>{cat.name}</Text>
                        <Text style={styles.categoryCount}>{cat.count}건</Text>
                      </View>
                      <View style={styles.categoryAmountContainer}>
                        <Text style={styles.categoryAmount}>
                          ₩{formatNumber(cat.amount)}
                        </Text>
                        {cat.budget && (
                          <Text style={styles.categoryBudget}>
                            / ₩{formatNumber(cat.budget)}{' '}
                            <Text style={{ color: progressColor, fontWeight: '500' }}>
                              ({usagePercent}%)
                            </Text>
                          </Text>
                        )}
                      </View>
                    </View>
                    {cat.budget && (
                      <View style={styles.categoryProgressContainer}>
                        <View style={styles.categoryProgressBar}>
                          <View
                            style={[
                              styles.categoryProgressFill,
                              {
                                width: `${Math.min(usagePercent, 100)}%`,
                                backgroundColor: progressColor,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
