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
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { getIconName, UI_ICONS, MaterialIconName } from '../../constants/Icons';
import {
  transactionApi,
  statsApi,
  TransactionSummary,
  TodaySummary,
  TransactionWithCategory,
  CategorySummary,
} from '../../lib/api';
import { useRefreshStore } from '../../stores/refreshStore';
import { formatNumber, formatCurrency, formatTime } from '@moneger/shared';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// Donut Chart Component
interface DonutChartProps {
  data: { color: string; amount: number; name: string }[];
  size: number;
  strokeWidth: number;
  totalAmount: number;
  textColor: string;
  mutedColor: string;
  selectedIndex: number | null;
  onSegmentPress: (index: number | null) => void;
  formatNumber: (amount: number) => string;
}

function DonutChart({
  data,
  size,
  strokeWidth,
  totalAmount,
  textColor,
  mutedColor,
  selectedIndex,
  onSegmentPress,
  formatNumber,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Calculate segment angles and midpoints for touch detection
  const segments: { startAngle: number; endAngle: number; midX: number; midY: number }[] = [];
  let currentAngle = -90;

  const paths = data.map((item, index) => {
    const percentage = total > 0 ? item.amount / total : 0;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    const midAngle = (startAngle + endAngle) / 2;

    // Store segment info
    segments.push({
      startAngle,
      endAngle,
      midX: center + radius * Math.cos((midAngle * Math.PI) / 180),
      midY: center + radius * Math.sin((midAngle * Math.PI) / 180),
    });

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

    // Determine opacity based on selection
    const isSelected = selectedIndex === index;
    const opacity = selectedIndex === null ? 1 : isSelected ? 1 : 0.3;

    return (
      <Path
        key={index}
        d={d}
        stroke={item.color}
        strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
        fill="none"
        strokeLinecap="butt"
        opacity={opacity}
      />
    );
  });

  // Handle touch on chart
  const handleChartPress = (evt: { nativeEvent: { locationX: number; locationY: number } }) => {
    const { locationX, locationY } = evt.nativeEvent;

    // Calculate distance from center
    const dx = locationX - center;
    const dy = locationY - center;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if touch is within the donut ring
    const innerRadius = radius - strokeWidth / 2 - 10;
    const outerRadius = radius + strokeWidth / 2 + 10;

    if (distance < innerRadius) {
      // Touched center - deselect
      onSegmentPress(null);
      return;
    }

    if (distance > outerRadius) {
      // Touched outside - deselect
      onSegmentPress(null);
      return;
    }

    // Calculate angle of touch point
    let touchAngle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Find which segment was touched
    for (let i = 0; i < segments.length; i++) {
      let { startAngle, endAngle } = segments[i];

      // Normalize angles for comparison
      const normalizedTouchAngle = touchAngle;
      let normalizedStart = startAngle;
      let normalizedEnd = endAngle;

      // Handle angle wrapping
      if (normalizedStart <= normalizedTouchAngle && normalizedTouchAngle <= normalizedEnd) {
        onSegmentPress(selectedIndex === i ? null : i);
        return;
      }

      // Handle case where segment crosses -180/180 boundary
      if (normalizedEnd > 180) {
        if (normalizedTouchAngle >= normalizedStart || normalizedTouchAngle <= normalizedEnd - 360) {
          onSegmentPress(selectedIndex === i ? null : i);
          return;
        }
      }
      if (normalizedStart < -180) {
        if (normalizedTouchAngle <= normalizedEnd || normalizedTouchAngle >= normalizedStart + 360) {
          onSegmentPress(selectedIndex === i ? null : i);
          return;
        }
      }
    }
  };

  // Inner circle diameter for text container
  const innerDiameter = size - strokeWidth * 2 - 16;

  // Center text based on selection
  const centerText = selectedIndex !== null && data[selectedIndex]
    ? `₩${formatNumber(data[selectedIndex].amount)}`
    : `₩${formatNumber(totalAmount)}`;
  const centerSubtext = selectedIndex !== null && data[selectedIndex]
    ? data[selectedIndex].name
    : '총 지출';

  // Add padding for selected stroke overflow
  const padding = 8;
  const containerSize = size + padding * 2;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={(evt) => {
        // Adjust touch coordinates for padding
        const adjustedEvt = {
          nativeEvent: {
            locationX: evt.nativeEvent.locationX - padding,
            locationY: evt.nativeEvent.locationY - padding,
          },
        };
        handleChartPress(adjustedEvt);
      }}
      style={{ width: containerSize, height: containerSize, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={containerSize} height={containerSize} style={{ overflow: 'visible' }}>
        <G transform={`translate(${padding}, ${padding})`}>
          {paths}
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', width: innerDiameter, paddingHorizontal: 4 }}>
        <Text
          style={{ fontSize: 16, fontWeight: 'bold', color: textColor }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {centerText}
        </Text>
        <Text style={{ fontSize: 11, color: mutedColor, marginTop: 2 }}>{centerSubtext}</Text>
      </View>
    </TouchableOpacity>
  );
}

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
  const carouselRef = useRef<ScrollView>(null);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

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

  const handleCarouselScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SNAP_INTERVAL);
    setActiveCardIndex(Math.max(0, Math.min(index, 3)));
  };

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
  const summaryCards = [
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

  // Today summary values
  const hasIncomeToday = (todaySummary?.income?.count || 0) > 0;
  const hasExpenseToday = (todaySummary?.expense?.count || 0) > 0;
  const hasSavingsToday = (todaySummary?.savings?.count || 0) > 0;
  const hasAnyToday = hasIncomeToday || hasExpenseToday || hasSavingsToday;

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
      maxWidth: '100%',
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
    categoryAmount: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    categoryBudgetRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    categoryBudgetText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    categoryBudgetPercent: {
      fontSize: 12,
      fontWeight: '600',
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
                    <MaterialIcons name={card.icon} size={24} color="#fff" />
                  </View>
                  <View style={styles.carouselCardInfo}>
                    <Text style={styles.carouselCardLabel}>{card.label}</Text>
                    <Text
                      style={styles.carouselCardAmount}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                    >
                      {card.isNegative ? '-' : ''}₩{formatNumber(Math.abs(card.amount))}
                    </Text>
                    <View style={[styles.carouselCardBadge, { backgroundColor: card.badgeBg }]}>
                      <Text
                        style={[styles.carouselCardBadgeText, { color: card.badgeText }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
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
                오늘 ({todaySummary?.month || month}월 {todaySummary?.day || now.getDate()}일 {DAY_NAMES[todaySummary?.dayOfWeek ?? now.getDay()]})
              </Text>
            </View>

            {hasAnyToday ? (
              <>
                {/* Income */}
                <View style={styles.todayRow}>
                  <View style={styles.todayRowLeft}>
                    <MaterialIcons name="trending-up" size={16} color={colors.accentMint} />
                    <Text style={styles.todayLabel}>수입</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {hasIncomeToday ? (
                      <>
                        <Text style={[styles.todayAmount, { color: colors.accentMint }]}>
                          ₩{formatNumber(todaySummary?.income?.total || 0)}
                        </Text>
                        <Text style={styles.todayCount}>({todaySummary?.income?.count || 0}건)</Text>
                      </>
                    ) : (
                      <Text style={styles.todayEmpty}>-</Text>
                    )}
                  </View>
                </View>

                {/* Expense */}
                <View style={styles.todayRow}>
                  <View style={styles.todayRowLeft}>
                    <MaterialIcons name="trending-down" size={16} color={colors.accentCoral} />
                    <Text style={styles.todayLabel}>지출</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {hasExpenseToday ? (
                      <>
                        <Text style={[styles.todayAmount, { color: colors.accentCoral }]}>
                          ₩{formatNumber(todaySummary?.expense?.total || 0)}
                        </Text>
                        <Text style={styles.todayCount}>({todaySummary?.expense?.count || 0}건)</Text>
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
                          ₩{formatNumber(todaySummary?.savings?.total || 0)}
                        </Text>
                        <Text style={styles.todayCount}>({todaySummary?.savings?.count || 0}건)</Text>
                      </>
                    ) : (
                      <Text style={styles.todayEmpty}>-</Text>
                    )}
                  </View>
                </View>

                {/* Balance */}
                <View style={[styles.todayRow, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 }]}>
                  <View style={styles.todayRowLeft}>
                    <MaterialIcons name="account-balance-wallet" size={16} color="#A78BFA" />
                    <Text style={[styles.todayLabel, { fontWeight: '600' }]}>잔액</Text>
                  </View>
                  <Text style={[styles.todayAmount, {
                    color: (todaySummary?.income?.total || 0) - (todaySummary?.expense?.total || 0) >= 0
                      ? colors.accentMint
                      : colors.accentCoral,
                    fontWeight: '600',
                  }]}>
                    ₩{formatNumber((todaySummary?.income?.total || 0) - (todaySummary?.expense?.total || 0))}
                  </Text>
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
                <View key={tx.id}>
                  <View style={styles.transactionItem}>
                    <View style={[styles.transactionIcon, { backgroundColor: `${tx.category?.color || '#6B7280'}20` }]}>
                      <MaterialIcons
                        name={getIconName(tx.category?.icon)}
                        size={20}
                        color={tx.category?.color || '#6B7280'}
                      />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionDesc}>
                        {tx.description || (tx.type === 'INCOME' ? '수입' : '지출')}
                      </Text>
                      <Text style={styles.transactionCategory}>
                        {tx.category?.name || '미분류'}
                      </Text>
                    </View>
                    <View style={styles.transactionRight}>
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
                      <Text style={styles.transactionTime}>
                        {formatTime(tx.date)}
                      </Text>
                    </View>
                  </View>
                  {index < recentTransactions.length - 1 && (
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
            </View>
            {categories.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="pie-chart" size={40} color={colors.textMuted} />
                <Text style={styles.emptyText}>이번 달 지출 내역이 없습니다</Text>
              </View>
            ) : (
              <>
                {/* Donut Chart */}
                <View style={styles.chartContainer}>
                  <DonutChart
                    data={categories.map(cat => ({
                      color: cat.color || '#6B7280',
                      amount: cat.total,
                      name: cat.name,
                    }))}
                    size={160}
                    strokeWidth={20}
                    totalAmount={categories.reduce((sum, cat) => sum + cat.total, 0)}
                    textColor={colors.textPrimary}
                    mutedColor={colors.textMuted}
                    selectedIndex={selectedCategoryIndex}
                    onSegmentPress={setSelectedCategoryIndex}
                    formatNumber={formatNumber}
                  />
                </View>

                {/* Category List */}
                {categories.map((cat, index) => {
                  const usagePercent = cat.budget ? Math.round((cat.total / cat.budget) * 100) : 0;
                  const progressColor = usagePercent >= 90
                    ? colors.accentCoral
                    : usagePercent >= 66
                    ? colors.accentYellow
                    : colors.accentMint;
                  const isSelected = selectedCategoryIndex === index;
                  const categoryColor = cat.color || '#6B7280';

                  return (
                    <TouchableOpacity
                      key={cat.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedCategoryIndex(isSelected ? null : index)}
                      style={[
                        styles.categoryItem,
                        index === categories.length - 1 && styles.categoryItemLast,
                        isSelected && {
                          borderWidth: 2,
                          borderColor: categoryColor,
                          transform: [{ scale: 1.02 }],
                        },
                        selectedCategoryIndex !== null && !isSelected && {
                          opacity: 0.5,
                        },
                      ]}
                    >
                      <View style={styles.categoryItemHeader}>
                        <View
                          style={[
                            styles.categoryIconContainer,
                            { backgroundColor: `${categoryColor}20` },
                            isSelected && { transform: [{ scale: 1.1 }] },
                          ]}
                        >
                          <MaterialIcons
                            name={getIconName(cat.icon)}
                            size={20}
                            color={categoryColor}
                          />
                        </View>
                        <View style={styles.categoryInfo}>
                          <Text style={styles.categoryName}>{cat.name}</Text>
                          <Text style={styles.categoryCount}>{cat.count}건</Text>
                        </View>
                        <Text style={styles.categoryAmount}>
                          ₩{formatNumber(cat.total)}
                        </Text>
                      </View>
                      {cat.budget && (
                        <View style={styles.categoryBudgetRow}>
                          <Text style={styles.categoryBudgetText}>
                            예산: ₩{formatNumber(cat.budget)}
                          </Text>
                          <Text style={[styles.categoryBudgetPercent, { color: progressColor }]}>
                            {usagePercent}% 사용
                          </Text>
                        </View>
                      )}
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
                    </TouchableOpacity>
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
