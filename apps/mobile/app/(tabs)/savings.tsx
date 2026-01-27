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
import type { MaterialIconName } from '../../constants/Icons';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { savingsApi, SavingsGoal } from '../../lib/api';

// Mock data for testing
const USE_MOCK_DATA = true;

const MOCK_SAVINGS_GOALS: SavingsGoal[] = [
  {
    id: '1',
    name: '해외여행',
    icon: 'travel',
    targetAmount: 3000000,
    currentAmount: 1500000,
    progressPercent: 50,
    monthlyRequired: 250000,
    monthlyTarget: 300000,
    thisMonthSavings: 200000,
    targetDate: '2026년 6월',
    startYear: 2026,
    startMonth: 1,
    targetYear: 2026,
    targetMonth: 6,
    isPrimary: true,
  },
  {
    id: '2',
    name: '비상금',
    icon: 'savings',
    targetAmount: 10000000,
    currentAmount: 4500000,
    progressPercent: 45,
    monthlyRequired: 458333,
    monthlyTarget: 500000,
    thisMonthSavings: 350000,
    targetDate: '2026년 12월',
    startYear: 2026,
    startMonth: 1,
    targetYear: 2026,
    targetMonth: 12,
    isPrimary: false,
  },
  {
    id: '3',
    name: '새 노트북',
    icon: 'device',
    targetAmount: 2000000,
    currentAmount: 1800000,
    progressPercent: 90,
    monthlyRequired: 100000,
    monthlyTarget: 200000,
    thisMonthSavings: 200000,
    targetDate: '2026년 3월',
    startYear: 2026,
    startMonth: 1,
    targetYear: 2026,
    targetMonth: 3,
    isPrimary: false,
  },
];

const MAX_GOALS = 10;

// Icon mapping for savings goals
const GOAL_ICONS: Record<string, MaterialIconName> = {
  home: 'home',
  car: 'directions-car',
  school: 'school',
  travel: 'flight',
  device: 'devices',
  gift: 'card-giftcard',
  health: 'favorite',
  savings: 'savings',
};

export default function SavingsScreen() {
  const { userId } = useAuthStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setGoals(MOCK_SAVINGS_GOALS);
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    if (!userId) return;

    try {
      const res = await savingsApi.getAll(userId);
      if (res.success && res.data) {
        setGoals(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch savings:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const formatNumber = (amount: number) => {
    return amount.toLocaleString('ko-KR');
  };

  // Calculate totals
  const totalSavings = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalMonthlyRemaining = goals.reduce(
    (sum, goal) => sum + Math.max(0, goal.monthlyTarget - goal.thisMonthSavings),
    0
  );
  const overallProgress = totalTarget > 0 ? Math.round((totalSavings / totalTarget) * 100) : 0;

  const renderGoalIcon = (iconName: string, size: number = 20, color: string = '#FBBF24') => {
    const iconKey = GOAL_ICONS[iconName] || GOAL_ICONS.savings;
    return <MaterialIcons name={iconKey} size={size} color={color} />;
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Summary cards
    summarySection: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    summaryCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    summaryValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    summaryValueMint: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.accentMint,
    },
    summaryValueBlue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#3B82F6',
    },
    summarySubtext: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 4,
    },
    summaryNeeded: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: 'normal',
    },
    progressBarContainer: {
      height: 8,
      backgroundColor: colors.bgSecondary,
      borderRadius: 4,
      overflow: 'hidden',
      marginTop: 8,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: colors.accentMint,
    },
    // Goals section
    goalsSection: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    sectionCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
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
    sectionCount: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: 'normal',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    addButtonText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    // Goal card
    goalCard: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
    },
    goalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    goalIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: 'rgba(251, 191, 36, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    goalStarBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    goalInfo: {
      flex: 1,
    },
    goalNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    goalName: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    goalPrimaryBadge: {
      fontSize: 11,
      color: '#FBBF24',
      fontWeight: '500',
    },
    goalDate: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    goalAmountContainer: {
      alignItems: 'flex-end',
      marginBottom: 12,
    },
    goalCurrentAmount: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    goalTargetRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    goalTargetAmount: {
      fontSize: 12,
      color: colors.textMuted,
    },
    goalPercent: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.accentMint,
      marginLeft: 4,
    },
    goalProgressBar: {
      height: 8,
      backgroundColor: colors.bgCard,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 12,
    },
    goalProgressFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: colors.accentMint,
    },
    goalFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    depositButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(52, 211, 153, 0.15)',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
    },
    depositButtonText: {
      fontSize: 13,
      color: colors.accentMint,
      fontWeight: '500',
    },
    goalMonthlyStatus: {
      alignItems: 'flex-end',
    },
    goalMonthlyComplete: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.accentMint,
    },
    goalMonthlyNeeded: {
      fontSize: 13,
      color: colors.textPrimary,
    },
    goalMonthlyNeededLabel: {
      color: colors.textMuted,
    },
    // Empty state
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
          <Text style={styles.title}>저축</Text>
          <Text style={styles.subtitle}>목표를 향해 차근차근 모아보세요</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summarySection}>
          {/* Total Savings */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>총 저축액</Text>
            <Text style={styles.summaryValue}>₩{formatNumber(totalSavings)}</Text>
            <Text style={styles.summarySubtext}>목표 ₩{formatNumber(totalTarget)}</Text>
          </View>

          {/* This Month */}
          <View style={[styles.summaryCard, { marginTop: 12 }]}>
            <Text style={styles.summaryLabel}>이번 달 저축</Text>
            {totalMonthlyRemaining === 0 ? (
              <Text style={styles.summaryValueMint}>목표 달성!</Text>
            ) : (
              <Text style={styles.summaryValue}>
                ₩{formatNumber(totalMonthlyRemaining)}
                <Text style={styles.summaryNeeded}> 더 필요</Text>
              </Text>
            )}
            <Text style={styles.summarySubtext}>{goals.length}개 목표 기준</Text>
          </View>

          {/* Overall Progress */}
          <View style={[styles.summaryCard, { marginTop: 12 }]}>
            <Text style={styles.summaryLabel}>전체 달성률</Text>
            <Text style={styles.summaryValueBlue}>{overallProgress}%</Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(overallProgress, 100)}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Goals Section */}
        <View style={styles.goalsSection}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <MaterialIcons name="savings" size={20} color="#FBBF24" />
                <Text style={styles.sectionTitle}>
                  저축 목표 <Text style={styles.sectionCount}>({goals.length}/{MAX_GOALS})</Text>
                </Text>
              </View>
              {goals.length < MAX_GOALS && (
                <TouchableOpacity style={styles.addButton}>
                  <MaterialIcons name="add" size={14} color={colors.textMuted} />
                  <Text style={styles.addButtonText}>목표 추가</Text>
                </TouchableOpacity>
              )}
            </View>

            {goals.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="savings" size={40} color={colors.textMuted} />
                <Text style={styles.emptyText}>저축 목표가 없습니다</Text>
              </View>
            ) : (
              goals.map((goal) => (
                <TouchableOpacity key={goal.id} style={styles.goalCard} activeOpacity={0.7}>
                  {/* Goal Header */}
                  <View style={styles.goalHeader}>
                    <TouchableOpacity style={styles.goalIconContainer} activeOpacity={0.7}>
                      {renderGoalIcon(goal.icon, 20, '#FBBF24')}
                      <View
                        style={[
                          styles.goalStarBadge,
                          { backgroundColor: goal.isPrimary ? '#FBBF24' : 'rgba(156, 163, 175, 0.5)' },
                        ]}
                      >
                        <MaterialIcons
                          name="star"
                          size={10}
                          color={goal.isPrimary ? '#fff' : 'rgba(255,255,255,0.7)'}
                        />
                      </View>
                    </TouchableOpacity>
                    <View style={styles.goalInfo}>
                      <View style={styles.goalNameRow}>
                        <Text style={styles.goalName}>{goal.name}</Text>
                        {goal.isPrimary && <Text style={styles.goalPrimaryBadge}>대표</Text>}
                      </View>
                      <Text style={styles.goalDate}>{goal.targetDate}</Text>
                    </View>
                  </View>

                  {/* Amount */}
                  <View style={styles.goalAmountContainer}>
                    <Text style={styles.goalCurrentAmount}>₩{formatNumber(goal.currentAmount)}</Text>
                    <View style={styles.goalTargetRow}>
                      <Text style={styles.goalTargetAmount}>/ ₩{formatNumber(goal.targetAmount)}</Text>
                      <Text style={styles.goalPercent}>({goal.progressPercent}%)</Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.goalProgressBar}>
                    <View
                      style={[
                        styles.goalProgressFill,
                        { width: `${Math.min(goal.progressPercent, 100)}%` },
                      ]}
                    />
                  </View>

                  {/* Footer */}
                  <View style={styles.goalFooter}>
                    <TouchableOpacity style={styles.depositButton} activeOpacity={0.7}>
                      <MaterialIcons name="add" size={16} color={colors.accentMint} />
                      <Text style={styles.depositButtonText}>저축하기</Text>
                    </TouchableOpacity>
                    <View style={styles.goalMonthlyStatus}>
                      {goal.thisMonthSavings >= goal.monthlyTarget ? (
                        <Text style={styles.goalMonthlyComplete}>이번 달 완료!</Text>
                      ) : (
                        <Text style={styles.goalMonthlyNeeded}>
                          ₩{formatNumber(goal.monthlyTarget - goal.thisMonthSavings)}
                          <Text style={styles.goalMonthlyNeededLabel}> 더 필요</Text>
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
