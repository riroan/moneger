import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { getIconName, UI_ICONS } from '../../constants/Icons';
import {
  transactionApi,
  statsApi,
  TransactionSummary,
  TodaySummary,
  TransactionWithCategory,
} from '../../lib/api';
import { useRefreshStore } from '../../stores/refreshStore';
import { formatNumber, getKSTDateParts } from '@moneger/shared';
import TransactionItem from '../../components/TransactionItem';
import { SummaryCarousel, SummaryCardData, CategoryExpenseList, CategoryData } from '../../components/home';
import { TodaySummaryCard } from '../../components/cards';

export default function HomeScreen() {
  const { userId, userName } = useAuthStore();
  const { theme } = useThemeStore();
  const { lastTransactionUpdate } = useRefreshStore();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Data states
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithCategory[]>([]);
  const [lastMonthBalance, setLastMonthBalance] = useState<number>(0);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number | null>(null);

  const now = new Date();
  const kstNow = getKSTDateParts(now);
  const year = kstNow.year;
  const month = kstNow.month;

  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch all data in parallel
      const [summaryRes, todayRes, recentRes, lastMonthRes] = await Promise.all([
        transactionApi.getSummary(userId, year, month),
        transactionApi.getToday(userId),
        transactionApi.getRecent(userId, 5),
        // Get last month stats for comparison
        statsApi.get(userId, month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1),
      ]);

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }

      if (todayRes.success && todayRes.data) {
        setTodaySummary(todayRes.data);
      }

      if (recentRes.success && recentRes.data) {
        setRecentTransactions(recentRes.data);
      }

      if (lastMonthRes.success && lastMonthRes.data) {
        setLastMonthBalance(lastMonthRes.data.summary.balance);
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

  // Refresh when transaction is added
  useEffect(() => {
    if (lastTransactionUpdate > 0) {
      fetchData();
    }
  }, [lastTransactionUpdate, fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Computed values from summary
  const totalIncome = summary?.summary?.totalIncome || 0;
  const totalExpense = summary?.summary?.totalExpense || 0;
  const totalSavings = summary?.summary?.totalSavings || 0;
  const balance = summary?.summary?.balance || 0;
  const incomeCount = summary?.transactionCount?.income || 0;
  const expenseCount = summary?.transactionCount?.expense || 0;
  const savingsCount = summary?.savings?.count || 0;
  const primaryGoal = summary?.savings?.primaryGoal;
  const categories = summary?.categories || [];

  // Calculate balance difference from last month
  const balanceDiff = balance - lastMonthBalance;

  // Summary cards data for carousel
  const summaryCards: SummaryCardData[] = [
    {
      type: 'income',
      label: '이번 달 수입',
      amount: totalIncome,
      badge: `${incomeCount}건의 수입`,
      icon: UI_ICONS.income,
      iconBg: '#10B981',
      barColor: '#10B981',
      badgeBg: 'rgba(34, 197, 94, 0.2)',
      badgeText: '#4ade80',
    },
    {
      type: 'expense',
      label: '이번 달 지출',
      amount: totalExpense,
      badge: `${expenseCount}건의 지출`,
      icon: UI_ICONS.expense,
      iconBg: '#B91C1C',
      barColor: '#EF4444',
      badgeBg: 'rgba(239, 68, 68, 0.2)',
      badgeText: '#f87171',
    },
    {
      type: 'savings',
      label: '저축',
      amount: totalSavings,
      badge: `${savingsCount}건의 저축`,
      icon: UI_ICONS.savings,
      iconBg: '#0891B2',
      barColor: '#06B6D4',
      badgeBg: 'rgba(6, 182, 212, 0.2)',
      badgeText: '#22d3ee',
    },
    {
      type: 'balance',
      label: '잔액',
      amount: balance,
      badge: `지난달 대비 ${balanceDiff >= 0 ? '+' : '-'}₩${formatNumber(Math.abs(balanceDiff))}`,
      icon: UI_ICONS.balance,
      iconBg: '#7C3AED',
      barColor: '#8B5CF6',
      badgeBg: 'rgba(168, 85, 247, 0.2)',
      badgeText: '#c084fc',
      isNegative: balance < 0,
    },
  ];

  // Today summary values (from API - KST based)
  const todayMonth = todaySummary?.month ?? month;
  const todayDay = todaySummary?.day ?? now.getDate();
  const todayDayOfWeek = todaySummary?.dayOfWeek ?? now.getDay();
  const todayIncome = { total: todaySummary?.income?.total || 0, count: todaySummary?.income?.count || 0 };
  const todayExpense = { total: todaySummary?.expense?.total || 0, count: todaySummary?.expense?.count || 0 };
  const todaySavingsData = { total: todaySummary?.savings?.total || 0, count: todaySummary?.savings?.count || 0 };

  // Category data for CategoryExpenseList
  const categoryData: CategoryData[] = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    total: cat.total,
    count: cat.count,
    budget: cat.budget,
  }));

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
    // Cards section
    cardsSection: {
      paddingHorizontal: 20,
      gap: 12,
      marginBottom: 16,
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
    emptyState: {
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 8,
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
          <Text style={styles.userName}>{userName || '사용자'}님</Text>
        </View>

        {/* Summary Cards Carousel */}
        <SummaryCarousel
          cards={summaryCards}
          activeIndex={activeCardIndex}
          onIndexChange={setActiveCardIndex}
        />

        {/* Today Summary & Savings Cards */}
        <View style={styles.cardsSection}>
          {/* Today Summary Card */}
          <TodaySummaryCard
            month={todayMonth}
            day={todayDay}
            dayOfWeek={todayDayOfWeek}
            income={todayIncome}
            expense={todayExpense}
            savings={todaySavingsData}
          />

          {/* Savings Card */}
          <View style={styles.savingsCard}>
            <View style={styles.savingsHeader}>
              <View style={styles.savingsHeaderLeft}>
                <MaterialIcons name="savings" size={20} color="#06B6D4" />
                <Text style={styles.savingsTitle}>저축</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/savings')}>
                <Text style={styles.savingsViewAll}>전체보기 →</Text>
              </TouchableOpacity>
            </View>

            {primaryGoal ? (
              <View style={styles.savingsGoalContainer}>
                {/* Goal header */}
                <View style={styles.savingsGoalHeader}>
                  <View style={styles.savingsGoalIconContainer}>
                    <MaterialIcons name={getIconName(primaryGoal.icon)} size={20} color="#FBBF24" />
                    <View style={styles.savingsGoalStarBadge}>
                      <MaterialIcons name="star" size={10} color="#fff" />
                    </View>
                  </View>
                  <View style={styles.savingsGoalInfo}>
                    <View style={styles.savingsGoalNameRow}>
                      <Text style={styles.savingsGoalName}>{primaryGoal.name}</Text>
                      <Text style={styles.savingsGoalBadge}>대표</Text>
                    </View>
                    <Text style={styles.savingsGoalDate}>{primaryGoal.targetDate}</Text>
                  </View>
                </View>

                {/* Amount */}
                <View style={styles.savingsAmountContainer}>
                  <Text style={styles.savingsCurrentAmount}>
                    ₩{formatNumber(primaryGoal.currentAmount)}
                  </Text>
                  <View style={styles.savingsTargetRow}>
                    <Text style={styles.savingsTargetAmount}>
                      / ₩{formatNumber(primaryGoal.targetAmount)}
                    </Text>
                    <Text style={styles.savingsPercent}>
                      ({primaryGoal.progressPercent}%)
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.savingsProgressBar}>
                  <View
                    style={[
                      styles.savingsProgressFill,
                      {
                        width: `${Math.min(primaryGoal.progressPercent, 100)}%`,
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
              <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
                <Text style={styles.sectionViewAll}>전체보기 →</Text>
              </TouchableOpacity>
            </View>
            {(!recentTransactions || recentTransactions.length === 0) ? (
              <View style={styles.emptyState}>
                <MaterialIcons
                  name="receipt-long"
                  size={40}
                  color={colors.textMuted}
                />
                <Text style={styles.emptyText}>거래 내역이 없습니다</Text>
              </View>
            ) : (
              recentTransactions.map((tx, index) => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  showDivider={index < recentTransactions.length - 1}
                />
              ))
            )}
          </View>
        </View>

        {/* Category Expenses */}
        <View style={styles.section}>
          <CategoryExpenseList
            categories={categoryData}
            selectedIndex={selectedCategoryIndex}
            onSelectIndex={setSelectedCategoryIndex}
          />
        </View>
      </ScrollView>
    </View>
  );
}
