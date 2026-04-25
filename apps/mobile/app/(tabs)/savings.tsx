import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import type { MaterialIconName } from '../../constants/Icons';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useRefreshStore } from '../../stores/refreshStore';
import { useToast } from '../../contexts/ToastContext';
import { Colors } from '../../constants/Colors';
import { savingsApi, SavingsGoal, type SavingsTrendPoint } from '../../lib/api';
import { SAVINGS_GOAL, formatNumber } from '@moneger/shared';
import { AddGoalModal, DepositModal, EditGoalModal, type SavingsGoalForDeposit, type SavingsGoalForEdit } from '../../components/savings';
import BarChart from '../../components/charts/BarChart';
import MultiLineChart from '../../components/charts/MultiLineChart';

const MAX_GOALS = SAVINGS_GOAL.MAX_COUNT;

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
  const { triggerRefresh } = useRefreshStore();
  const { showToast } = useToast();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [trend, setTrend] = useState<SavingsTrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  // Submitting states
  const [isSaving, setIsSaving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const [goalsRes, trendRes] = await Promise.all([
        savingsApi.getAll(userId),
        savingsApi.getTrend(userId),
      ]);
      if (goalsRes.success && goalsRes.data) {
        setGoals(goalsRes.data);
      }
      if (trendRes.success && trendRes.data) {
        setTrend(trendRes.data);
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

  // 큰 숫자를 간결하게 표시 (억, 조 단위)
  const formatCompactNumber = (amount: number) => {
    if (amount >= 1_000_000_000_000) {
      const jo = Math.floor(amount / 1_000_000_000_000);
      const eok = Math.floor((amount % 1_000_000_000_000) / 100_000_000);
      if (eok > 0) {
        return `${jo}조 ${eok}억`;
      }
      return `${jo}조`;
    }
    if (amount >= 100_000_000) {
      const eok = Math.floor(amount / 100_000_000);
      const man = Math.floor((amount % 100_000_000) / 10_000);
      if (man > 0) {
        return `${eok}억 ${formatNumber(man)}만`;
      }
      return `${eok}억`;
    }
    if (amount >= 10_000) {
      const man = Math.floor(amount / 10_000);
      return `${formatNumber(man)}만`;
    }
    return formatNumber(amount);
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

  // Handle add goal
  const handleAddGoal = async (data: {
    name: string;
    icon: string;
    targetAmount: number;
    currentAmount: number;
    startYear: number;
    startMonth: number;
    targetYear: number;
    targetMonth: number;
  }) => {
    if (!userId) return;

    setIsSaving(true);
    try {
      const res = await savingsApi.create({
        userId,
        name: data.name,
        icon: data.icon,
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount,
        startYear: data.startYear,
        startMonth: data.startMonth,
        targetYear: data.targetYear,
        targetMonth: data.targetMonth,
      });

      if (res.success) {
        showToast('저축 목표가 추가되었습니다', 'success');
        setIsAddModalOpen(false);
        fetchData();
        triggerRefresh();
      } else {
        showToast(res.error || '저축 목표 추가에 실패했습니다', 'error');
      }
    } catch (error) {
      showToast('저축 목표 추가에 실패했습니다', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle deposit
  const handleDeposit = async (amount: number) => {
    if (!userId || !selectedGoal) return;

    setIsDepositing(true);
    try {
      const res = await savingsApi.deposit(selectedGoal.id, userId, amount);

      if (res.success) {
        showToast('저축이 완료되었습니다', 'success');
        setIsDepositModalOpen(false);
        setSelectedGoal(null);
        fetchData();
        triggerRefresh();
      } else {
        showToast(res.error || '저축에 실패했습니다', 'error');
      }
    } catch (error) {
      showToast('저축에 실패했습니다', 'error');
    } finally {
      setIsDepositing(false);
    }
  };

  // Handle delete goal
  const handleDeleteGoal = (goal: SavingsGoal) => {
    Alert.alert(
      '저축 목표 삭제',
      `'${goal.name}' 목표를 삭제하시겠습니까?\n\n삭제하면 저축 내역도 함께 삭제됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            if (!userId) return;
            try {
              const res = await savingsApi.delete(goal.id, userId);
              if (res.success) {
                showToast('저축 목표가 삭제되었습니다', 'success');
                fetchData();
                triggerRefresh();
              } else {
                showToast(res.error || '삭제에 실패했습니다', 'error');
              }
            } catch (error) {
              showToast('삭제에 실패했습니다', 'error');
            }
          },
        },
      ]
    );
  };

  // Open deposit modal
  const openDepositModal = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setIsDepositModalOpen(true);
  };

  // Handle toggle primary goal
  const handleTogglePrimary = async (goal: SavingsGoal) => {
    if (!userId) return;

    try {
      const res = await savingsApi.togglePrimary(goal.id, userId, !goal.isPrimary);

      if (res.success) {
        showToast(
          goal.isPrimary ? '대표 저축이 해제되었습니다' : '대표 저축으로 설정되었습니다',
          'success'
        );
        fetchData();
        triggerRefresh();
      } else {
        showToast(res.error || '대표 저축 변경에 실패했습니다', 'error');
      }
    } catch (error) {
      showToast('대표 저축 변경에 실패했습니다', 'error');
    }
  };

  // Open edit modal
  const openEditModal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setIsEditModalOpen(true);
  };

  // Handle edit goal
  const handleEditGoal = async (data: {
    name: string;
    icon: string;
    targetAmount: number;
    targetYear: number;
    targetMonth: number;
  }) => {
    if (!userId || !editingGoal) return;

    setIsEditing(true);
    try {
      const res = await savingsApi.update(editingGoal.id, {
        userId,
        name: data.name,
        icon: data.icon,
        targetAmount: data.targetAmount,
        targetYear: data.targetYear,
        targetMonth: data.targetMonth,
      });

      if (res.success) {
        showToast('저축 목표가 수정되었습니다', 'success');
        setIsEditModalOpen(false);
        setEditingGoal(null);
        fetchData();
        triggerRefresh();
      } else {
        showToast(res.error || '저축 목표 수정에 실패했습니다', 'error');
      }
    } catch (error) {
      showToast('저축 목표 수정에 실패했습니다', 'error');
    } finally {
      setIsEditing(false);
    }
  };

  // Handle delete from edit modal
  const handleDeleteFromEdit = async () => {
    if (!userId || !editingGoal) return;

    setIsEditing(true);
    try {
      const res = await savingsApi.delete(editingGoal.id, userId);
      if (res.success) {
        showToast('저축 목표가 삭제되었습니다', 'success');
        setIsEditModalOpen(false);
        setEditingGoal(null);
        fetchData();
        triggerRefresh();
      } else {
        showToast(res.error || '삭제에 실패했습니다', 'error');
      }
    } catch (error) {
      showToast('삭제에 실패했습니다', 'error');
    } finally {
      setIsEditing(false);
    }
  };

  // Convert SavingsGoal to SavingsGoalForDeposit
  const getGoalForDeposit = (goal: SavingsGoal | null): SavingsGoalForDeposit | null => {
    if (!goal) return null;
    return {
      id: goal.id,
      name: goal.name,
      icon: goal.icon,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      progressPercent: goal.progressPercent,
    };
  };

  // Convert SavingsGoal to SavingsGoalForEdit
  const getGoalForEdit = (goal: SavingsGoal | null): SavingsGoalForEdit | null => {
    if (!goal) return null;
    return {
      id: goal.id,
      name: goal.name,
      icon: goal.icon,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate,
    };
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 12,
      gap: 8,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.textPrimary,
      flex: 1,
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
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
      color: colors.accentCyan,
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
      flexShrink: 1,
      maxWidth: '55%',
    },
    goalMonthlyLabel: {
      fontSize: 11,
      color: colors.textMuted,
      marginBottom: 2,
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
    // Trend chart card
    trendChartCard: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    chartLegendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      marginTop: 8,
    },
    chartLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    chartLegendSwatch: {
      width: 10,
      height: 10,
      borderRadius: 2,
    },
    chartLegendLine: { width: 16, height: 2, borderRadius: 1 },
    chartLegendText: { fontSize: 11, color: colors.textMuted },
    chartEmpty: {
      paddingVertical: 28,
      alignItems: 'center',
    },
    // Monthly progress card
    monthlyProgressItem: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    monthlyProgressHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 6,
    },
    monthlyProgressIconBox: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: 'rgba(251, 191, 36, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthlyProgressName: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textPrimary,
      flex: 1,
    },
    monthlyProgressPct: {
      fontSize: 11,
      color: colors.textMuted,
    },
    monthlyProgressBar: {
      height: 6,
      backgroundColor: colors.bgCard,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 4,
    },
    monthlyProgressFill: {
      height: '100%',
      borderRadius: 3,
    },
    monthlyProgressFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    monthlyProgressAmount: {
      fontSize: 11,
      color: colors.textMuted,
    },
    monthlyProgressDone: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.accentMint,
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
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>저축</Text>
      </View>

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
              <Text style={styles.summaryValue} numberOfLines={1}>
                {formatCompactNumber(totalMonthlyRemaining)}
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
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setIsAddModalOpen(true)}
                >
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
                <TouchableOpacity
                  key={goal.id}
                  style={styles.goalCard}
                  activeOpacity={0.7}
                  onPress={() => openEditModal(goal)}
                >
                  {/* Goal Header */}
                  <View style={styles.goalHeader}>
                    <TouchableOpacity
                      style={styles.goalIconContainer}
                      onPress={() => handleTogglePrimary(goal)}
                      activeOpacity={0.7}
                    >
                      {renderGoalIcon(goal.icon, 20, '#FBBF24')}
                      <View
                        style={[
                          styles.goalStarBadge,
                          { backgroundColor: goal.isPrimary ? '#FBBF24' : 'rgba(156, 163, 175, 0.5)' },
                        ]}
                      >
                        <MaterialIcons
                          name={goal.isPrimary ? 'star' : 'star-outline'}
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
                    <TouchableOpacity
                      style={styles.depositButton}
                      activeOpacity={0.7}
                      onPress={() => openDepositModal(goal)}
                    >
                      <MaterialIcons name="add" size={16} color={colors.accentMint} />
                      <Text style={styles.depositButtonText}>저축하기</Text>
                    </TouchableOpacity>
                    <View style={styles.goalMonthlyStatus}>
                      {goal.thisMonthSavings >= goal.monthlyTarget ? (
                        <Text style={styles.goalMonthlyComplete}>이번 달 완료!</Text>
                      ) : (
                        <>
                          <Text style={styles.goalMonthlyLabel}>이번 달</Text>
                          <Text style={styles.goalMonthlyNeeded} numberOfLines={1}>
                            {formatCompactNumber(goal.monthlyTarget - goal.thisMonthSavings)}
                            <Text style={styles.goalMonthlyNeededLabel}> 더 필요</Text>
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Savings Trend Chart */}
        <View style={styles.goalsSection}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <MaterialIcons name="trending-up" size={20} color={colors.accentMint} />
                <Text style={styles.sectionTitle}>저축 추세</Text>
              </View>
            </View>

            {trend.length === 0 ? (
              <View style={styles.chartEmpty}>
                <Text style={styles.emptyText}>저축 기록이 없습니다</Text>
              </View>
            ) : (() => {
              const chartWidth = Dimensions.get('window').width - 40 - 32; // screen - section padding - card padding
              const labels = trend.map((p) => {
                const [yy, mm] = p.month.split('-');
                return `${yy.slice(2)}-${mm.padStart(2, '0')}`;
              });
              return (
                <>
                  <BarChart
                    width={chartWidth}
                    height={220}
                    labels={labels}
                    series={[
                      {
                        key: 'amount',
                        label: '월 저축',
                        color: colors.accentMint,
                        values: trend.map((p) => p.amount),
                      },
                    ]}
                    lineSeries={{
                      key: 'cumulative',
                      label: '누적',
                      color: colors.accentBlue,
                      values: trend.map((p) => p.cumulative),
                    }}
                  />
                  <View style={styles.chartLegendRow}>
                    <View style={styles.chartLegendItem}>
                      <View style={[styles.chartLegendSwatch, { backgroundColor: colors.accentMint }]} />
                      <Text style={styles.chartLegendText}>월 저축</Text>
                    </View>
                    <View style={styles.chartLegendItem}>
                      <View style={[styles.chartLegendLine, { backgroundColor: colors.accentBlue }]} />
                      <Text style={styles.chartLegendText}>누적</Text>
                    </View>
                  </View>
                </>
              );
            })()}
          </View>
        </View>

        {/* Monthly Progress per Goal */}
        {goals.length > 0 && (
          <View style={styles.goalsSection}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <MaterialIcons name="calendar-today" size={20} color={colors.accentBlue} />
                  <Text style={styles.sectionTitle}>이번 달 진행</Text>
                </View>
              </View>

              {goals.map((goal) => {
                const progress = goal.monthlyTarget > 0
                  ? Math.min(Math.round((goal.thisMonthSavings / goal.monthlyTarget) * 100), 100)
                  : 0;
                const isComplete = goal.thisMonthSavings >= goal.monthlyTarget;
                const fillWidth = Math.max(progress, goal.thisMonthSavings > 0 ? 2 : 0);
                const fillColor = isComplete
                  ? colors.accentMint
                  : progress >= 50
                  ? colors.accentBlue
                  : colors.textMuted;

                return (
                  <View key={goal.id} style={styles.monthlyProgressItem}>
                    <View style={styles.monthlyProgressHeader}>
                      <View style={styles.monthlyProgressIconBox}>
                        {renderGoalIcon(goal.icon, 16, '#FBBF24')}
                      </View>
                      <Text style={styles.monthlyProgressName} numberOfLines={1}>
                        {goal.name}
                      </Text>
                      {isComplete ? (
                        <MaterialIcons name="check-circle" size={18} color={colors.accentMint} />
                      ) : (
                        <Text style={styles.monthlyProgressPct}>{progress}%</Text>
                      )}
                    </View>
                    <View style={styles.monthlyProgressBar}>
                      <View
                        style={[
                          styles.monthlyProgressFill,
                          { width: `${fillWidth}%`, backgroundColor: fillColor },
                        ]}
                      />
                    </View>
                    <View style={styles.monthlyProgressFooter}>
                      <Text style={styles.monthlyProgressAmount}>
                        ₩{formatNumber(goal.thisMonthSavings)} / ₩{formatNumber(goal.monthlyTarget)}
                      </Text>
                      {isComplete && <Text style={styles.monthlyProgressDone}>완료!</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Add Savings Goal Modal */}
      <AddGoalModal
        visible={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddGoal}
        isSubmitting={isSaving}
      />

      {/* Deposit Modal */}
      <DepositModal
        visible={isDepositModalOpen}
        goal={getGoalForDeposit(selectedGoal)}
        onClose={() => {
          setIsDepositModalOpen(false);
          setSelectedGoal(null);
        }}
        onSubmit={handleDeposit}
        isSubmitting={isDepositing}
      />

      {/* Edit Savings Goal Modal */}
      <EditGoalModal
        visible={isEditModalOpen}
        goal={getGoalForEdit(editingGoal)}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingGoal(null);
        }}
        onSubmit={handleEditGoal}
        onDelete={handleDeleteFromEdit}
        isSubmitting={isEditing}
      />
    </View>
  );
}
