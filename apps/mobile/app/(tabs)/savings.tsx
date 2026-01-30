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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { MaterialIconName } from '../../constants/Icons';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useRefreshStore } from '../../stores/refreshStore';
import { useToast } from '../../contexts/ToastContext';
import { Colors } from '../../constants/Colors';
import { savingsApi, SavingsGoal } from '../../lib/api';
import { SAVINGS_GOAL, formatNumber } from '@moneger/shared';
import { AddGoalModal, DepositModal, EditGoalModal, type SavingsGoalForDeposit, type SavingsGoalForEdit } from '../../components/savings';

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

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
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
