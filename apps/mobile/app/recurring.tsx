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
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { useRefreshStore } from '../stores/refreshStore';
import { useToast } from '../contexts/ToastContext';
import { Colors } from '../constants/Colors';
import { recurringApi, type RecurringExpense, type RecurringSummary } from '../lib/api';
import { formatNumber } from '@moneger/shared';
import DonutChart from '../components/charts/DonutChart';
import { AddRecurringModal, EditRecurringModal } from '../components/recurring';

const MAX_ITEMS = 10;

function getDaysUntilDue(nextDueDate: string): number {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(Date.now() + kstOffset);
  const todayStr = kstNow.toISOString().split('T')[0];
  const dueStr = nextDueDate.split('T')[0];
  const diffMs = new Date(dueStr).getTime() - new Date(todayStr).getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export default function RecurringScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const { theme } = useThemeStore();
  const { triggerRefresh } = useRefreshStore();
  const { showToast } = useToast();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [summary, setSummary] = useState<RecurringSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddSubmitting, setIsAddSubmitting] = useState(false);

  const [editTarget, setEditTarget] = useState<RecurringExpense | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const [donutSelectedIndex, setDonutSelectedIndex] = useState<number | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [expensesRes, summaryRes] = await Promise.all([
        recurringApi.getAll(userId),
        recurringApi.getSummary(userId),
      ]);
      if (expensesRes.success && expensesRes.data) setExpenses(expensesRes.data);
      if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data);
    } catch (e) {
      console.error('Failed to load recurring:', e);
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

  const handleAdd = async (data: {
    description: string;
    amount: number;
    dayOfMonth: number;
    categoryId: string | null;
  }) => {
    if (!userId) return;
    setIsAddSubmitting(true);
    try {
      const res = await recurringApi.create({
        userId,
        amount: data.amount,
        description: data.description,
        dayOfMonth: data.dayOfMonth,
        categoryId: data.categoryId,
      });
      if (res.success) {
        showToast('고정비가 추가되었습니다', 'success');
        setIsAddOpen(false);
        fetchData();
        triggerRefresh();
      } else {
        showToast(res.error || '고정비 추가에 실패했습니다', 'error');
      }
    } finally {
      setIsAddSubmitting(false);
    }
  };

  const handleEditSubmit = async (data: {
    description: string;
    amount: number;
    dayOfMonth: number;
    categoryId: string | null;
  }) => {
    if (!userId || !editTarget) return;
    setIsEditSubmitting(true);
    try {
      const res = await recurringApi.update(editTarget.id, {
        userId,
        amount: data.amount,
        description: data.description,
        dayOfMonth: data.dayOfMonth,
        categoryId: data.categoryId,
      });
      if (res.success) {
        showToast('고정비가 수정되었습니다', 'success');
        setEditTarget(null);
        fetchData();
        triggerRefresh();
      } else {
        showToast(res.error || '수정에 실패했습니다', 'error');
      }
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!userId || !editTarget) return;
    setIsEditSubmitting(true);
    try {
      const res = await recurringApi.delete(editTarget.id, userId);
      if (res.success) {
        showToast('고정비가 삭제되었습니다', 'success');
        setEditTarget(null);
        fetchData();
        triggerRefresh();
      } else {
        showToast(res.error || '삭제에 실패했습니다', 'error');
      }
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleToggleActive = async (expense: RecurringExpense) => {
    if (!userId) return;
    const res = await recurringApi.update(expense.id, {
      userId,
      isActive: !expense.isActive,
    });
    if (res.success) {
      fetchData();
      triggerRefresh();
    } else {
      showToast(res.error || '상태 변경에 실패했습니다', 'error');
    }
  };

  const totalMonthly = summary?.totalMonthly || 0;
  const activeCount = summary?.activeCount || 0;
  const processedThisMonth = summary?.processedThisMonth || 0;
  const remainingTotal = summary?.remainingTotal || 0;

  const activeExpenses = expenses.filter((e) => e.isActive).sort((a, b) => b.amount - a.amount);
  const itemTotal = activeExpenses.reduce((sum, e) => sum + e.amount, 0);

  const donutData = activeExpenses.map((e, i) => ({
    name: e.description,
    amount: e.amount,
    color: e.category?.color || `hsl(${i * 47 + 180}, 50%, 55%)`,
  }));

  const upcomingExpenses = activeExpenses
    .map((e) => ({ ...e, daysLeft: getDaysUntilDue(e.nextDueDate) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    header: {
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
    addHeaderButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.bgCard,
    },
    addHeaderText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    summarySection: { paddingHorizontal: 16, marginBottom: 12 },
    summaryCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    summaryLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
    summaryValue: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.accentCoral,
    },
    summaryValueBlue: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.accentBlue,
    },
    summaryValueMint: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.accentMint,
    },
    summaryValueWhite: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    summarySubtext: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    progressBarContainer: {
      height: 6,
      backgroundColor: colors.bgSecondary,
      borderRadius: 3,
      overflow: 'hidden',
      marginTop: 8,
    },
    progressBarFill: { height: '100%', borderRadius: 3 },
    sectionCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: 16,
      marginBottom: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    sectionCount: { fontSize: 13, color: colors.textMuted, fontWeight: 'normal' },
    sectionAddButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    sectionAddText: { fontSize: 13, color: colors.textMuted },
    expenseCard: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
    },
    expenseInactive: { opacity: 0.5 },
    expenseTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 107, 107, 0.15)',
    },
    iconButtonInactive: { backgroundColor: 'rgba(156, 163, 175, 0.15)' },
    expenseInfo: { flex: 1, minWidth: 0 },
    expenseNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    expenseName: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '500',
    },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    expenseDay: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    actionButtons: { flexDirection: 'row', gap: 2 },
    actionButton: { padding: 6, borderRadius: 8 },
    expenseBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    historyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: 8,
    },
    historyButtonText: { fontSize: 11, color: colors.textMuted },
    expenseAmount: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.accentCoral,
    },
    historySection: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    historyLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 6 },
    historyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 2,
    },
    historyText: { fontSize: 11, color: colors.textSecondary },
    emptyState: { alignItems: 'center', paddingVertical: 32 },
    emptyText: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
    donutContainer: { alignItems: 'center', marginVertical: 8 },
    breakdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginTop: 8,
    },
    breakdownDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 10,
    },
    breakdownLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    breakdownName: { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
    breakdownAmount: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    breakdownPercent: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.accentCoral,
    },
    upcomingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginTop: 8,
    },
    upcomingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    upcomingDayBadge: {
      minWidth: 50,
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: 8,
      alignItems: 'center',
    },
    upcomingDayText: { fontSize: 11, fontWeight: '500' },
    upcomingName: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '500',
      flex: 1,
    },
    upcomingAmount: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.accentCoral,
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentCoral} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>고정비</Text>
        {expenses.length < MAX_ITEMS && (
          <TouchableOpacity style={styles.addHeaderButton} onPress={() => setIsAddOpen(true)}>
            <MaterialIcons name="add" size={16} color={colors.textSecondary} />
            <Text style={styles.addHeaderText}>추가</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentCoral}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary cards */}
        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>월 고정비</Text>
            <Text style={styles.summaryValue}>₩{formatNumber(totalMonthly)}</Text>
            <Text style={styles.summarySubtext}>{activeCount}개 항목</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>이번 달 처리 현황</Text>
            <Text style={styles.summaryValueBlue}>
              {processedThisMonth}
              <Text style={[styles.summaryLabel, { fontSize: 14, fontWeight: 'normal' }]}>
                {' '}건 처리됨
              </Text>
            </Text>
            <Text style={styles.summarySubtext}>{activeCount}건 중</Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width:
                      activeCount > 0
                        ? `${Math.min(Math.round((processedThisMonth / activeCount) * 100), 100)}%`
                        : '0%',
                    backgroundColor:
                      activeCount > 0 && processedThisMonth >= activeCount
                        ? colors.accentMint
                        : colors.accentCoral,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>남은 고정비</Text>
            {remainingTotal === 0 ? (
              <Text style={styles.summaryValueMint}>모두 처리!</Text>
            ) : (
              <Text style={styles.summaryValueWhite}>₩{formatNumber(remainingTotal)}</Text>
            )}
            <Text style={styles.summarySubtext}>이번 달 미처리 금액</Text>
          </View>
        </View>

        {/* Recurring list */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="event-repeat" size={20} color={colors.accentCoral} />
              <Text style={styles.sectionTitle}>
                고정비 <Text style={styles.sectionCount}>({expenses.length}/{MAX_ITEMS})</Text>
              </Text>
            </View>
            {expenses.length < MAX_ITEMS && (
              <TouchableOpacity
                style={styles.sectionAddButton}
                onPress={() => setIsAddOpen(true)}
              >
                <MaterialIcons name="add" size={14} color={colors.textMuted} />
                <Text style={styles.sectionAddText}>추가</Text>
              </TouchableOpacity>
            )}
          </View>

          {expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-repeat" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>고정비가 없습니다</Text>
            </View>
          ) : (
            expenses.map((expense) => {
              const daysLeft = getDaysUntilDue(expense.nextDueDate);
              const inactive = !expense.isActive;
              const processedMonth = expense.lastProcessedDate
                ? new Date(expense.lastProcessedDate).getMonth() + 1
                : new Date().getMonth() + 1;
              const dueLabel =
                daysLeft < 0
                  ? `${Math.abs(daysLeft)}일 지남`
                  : daysLeft === 0
                  ? '오늘 예정'
                  : `${daysLeft}일 후 예정`;
              const dueColor =
                daysLeft <= 0
                  ? colors.accentCoral
                  : daysLeft <= 3
                  ? colors.accentYellow
                  : colors.accentBlue;

              return (
                <View
                  key={expense.id}
                  style={[styles.expenseCard, inactive && styles.expenseInactive]}
                >
                  <View style={styles.expenseTopRow}>
                    <TouchableOpacity
                      style={[
                        styles.iconButton,
                        inactive && styles.iconButtonInactive,
                      ]}
                      onPress={() => handleToggleActive(expense)}
                    >
                      <MaterialIcons
                        name="event-repeat"
                        size={20}
                        color={inactive ? colors.textMuted : colors.accentCoral}
                      />
                    </TouchableOpacity>

                    <View style={styles.expenseInfo}>
                      <View style={styles.expenseNameRow}>
                        <Text style={styles.expenseName} numberOfLines={1}>
                          {expense.description}
                        </Text>
                        {expense.category && (
                          <View
                            style={[
                              styles.badge,
                              { backgroundColor: `${expense.category.color || '#666'}20` },
                            ]}
                          >
                            <Text
                              style={[
                                styles.badgeText,
                                { color: expense.category.color || '#666' },
                              ]}
                            >
                              {expense.category.name}
                            </Text>
                          </View>
                        )}
                        {inactive ? (
                          <View
                            style={[
                              styles.badge,
                              { backgroundColor: colors.bgCard },
                            ]}
                          >
                            <Text style={[styles.badgeText, { color: colors.textMuted }]}>
                              중지
                            </Text>
                          </View>
                        ) : expense.processedThisMonth ? (
                          <View
                            style={[
                              styles.badge,
                              styles.badgeRow,
                              { backgroundColor: 'rgba(74, 222, 128, 0.15)' },
                            ]}
                          >
                            <MaterialIcons
                              name="check-circle"
                              size={11}
                              color={colors.accentMint}
                            />
                            <Text style={[styles.badgeText, { color: colors.accentMint }]}>
                              {processedMonth}월 처리됨
                            </Text>
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.badge,
                              styles.badgeRow,
                              { backgroundColor: `${dueColor}26` },
                            ]}
                          >
                            <MaterialIcons name="access-time" size={11} color={dueColor} />
                            <Text style={[styles.badgeText, { color: dueColor }]}>
                              {dueLabel}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.expenseDay}>
                        매월 {expense.dayOfMonth}일 · 다음{' '}
                        {new Date(expense.nextDueDate).toLocaleDateString('ko-KR')}
                      </Text>
                    </View>

                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setEditTarget(expense)}
                      >
                        <MaterialIcons name="edit" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.expenseBottomRow}>
                    {expense.history.length > 0 ? (
                      <TouchableOpacity
                        style={styles.historyButton}
                        onPress={() =>
                          setExpandedHistoryId(
                            expandedHistoryId === expense.id ? null : expense.id
                          )
                        }
                      >
                        <MaterialIcons name="history" size={14} color={colors.textMuted} />
                        <Text style={styles.historyButtonText}>이력</Text>
                      </TouchableOpacity>
                    ) : (
                      <View />
                    )}
                    <Text style={styles.expenseAmount}>₩{formatNumber(expense.amount)}</Text>
                  </View>

                  {expandedHistoryId === expense.id && expense.history.length > 0 && (
                    <View style={styles.historySection}>
                      <Text style={styles.historyLabel}>금액 변경 이력</Text>
                      {expense.history.map((h) => (
                        <View key={h.id} style={styles.historyRow}>
                          <Text style={styles.historyText}>
                            {new Date(h.changedAt).toLocaleDateString('ko-KR')}
                          </Text>
                          <Text style={styles.historyText}>
                            ₩{formatNumber(h.previousAmount)} → ₩{formatNumber(h.newAmount)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Item breakdown (donut + list) */}
        {activeExpenses.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <MaterialIcons name="pie-chart" size={20} color={colors.accentCoral} />
                <Text style={styles.sectionTitle}>항목별 비중</Text>
              </View>
            </View>

            <View style={styles.donutContainer}>
              <DonutChart
                data={donutData}
                totalAmount={itemTotal}
                selectedIndex={donutSelectedIndex}
                onSegmentPress={setDonutSelectedIndex}
                emptyText="월 합계"
              />
            </View>

            {activeExpenses.map((e, i) => {
              const pct = itemTotal > 0 ? Math.round((e.amount / itemTotal) * 100) : 0;
              const color = e.category?.color || `hsl(${i * 47 + 180}, 50%, 55%)`;
              return (
                <View key={e.id} style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.breakdownDot, { backgroundColor: color }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.breakdownName} numberOfLines={1}>
                        {e.description}
                      </Text>
                      <Text style={styles.breakdownAmount}>
                        ₩{formatNumber(e.amount)}/월
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.breakdownPercent}>{pct}%</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Upcoming expenses */}
        {upcomingExpenses.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <MaterialIcons name="schedule" size={20} color={colors.accentBlue} />
                <Text style={styles.sectionTitle}>다가오는 지출</Text>
              </View>
            </View>

            {upcomingExpenses.map((e) => {
              const tone =
                e.daysLeft <= 0
                  ? colors.accentCoral
                  : e.daysLeft <= 3
                  ? colors.accentYellow
                  : colors.accentBlue;
              return (
                <View key={e.id} style={styles.upcomingRow}>
                  <View style={styles.upcomingLeft}>
                    <View
                      style={[styles.upcomingDayBadge, { backgroundColor: `${tone}26` }]}
                    >
                      <Text style={[styles.upcomingDayText, { color: tone }]}>
                        {e.daysLeft <= 0 ? '오늘' : `${e.daysLeft}일 후`}
                      </Text>
                    </View>
                    <Text style={styles.upcomingName} numberOfLines={1}>
                      {e.description}
                    </Text>
                  </View>
                  <Text style={styles.upcomingAmount}>₩{formatNumber(e.amount)}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <AddRecurringModal
        visible={isAddOpen}
        userId={userId || ''}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAdd}
        isSubmitting={isAddSubmitting}
      />

      <EditRecurringModal
        visible={!!editTarget}
        userId={userId || ''}
        expense={editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEditSubmit}
        onDelete={handleDelete}
        isSubmitting={isEditSubmitting}
      />
    </View>
  );
}
