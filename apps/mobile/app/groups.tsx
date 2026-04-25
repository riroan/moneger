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
import { groupsApi, transactionApi, type GroupSummary } from '../lib/api';
import type { TransactionWithCategory } from '../lib/api';
import { formatNumber } from '@moneger/shared';
import TransactionItem from '../components/TransactionItem';
import { GroupFormModal, GROUP_ICON_MAP, type GroupForEdit } from '../components/groups';

const MAX_GROUPS = 20;

export default function GroupsScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const { theme } = useThemeStore();
  const { triggerRefresh, lastTransactionUpdate } = useRefreshStore();
  const { showToast } = useToast();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailTxs, setDetailTxs] = useState<TransactionWithCategory[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editTarget, setEditTarget] = useState<GroupSummary | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await groupsApi.getAll(userId);
      if (res.success && res.data) setGroups(res.data);
    } catch (e) {
      console.error('Failed to fetch groups:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  const fetchDetailTransactions = useCallback(
    async (groupId: string) => {
      if (!userId) return;
      setIsDetailLoading(true);
      try {
        const res = await transactionApi.getByGroup(userId, groupId, 20);
        if (res.success && res.data) setDetailTxs(res.data);
        else setDetailTxs([]);
      } catch {
        setDetailTxs([]);
      } finally {
        setIsDetailLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (lastTransactionUpdate > 0) {
      fetchGroups();
      if (expandedId) fetchDetailTransactions(expandedId);
    }
  }, [lastTransactionUpdate, fetchGroups, fetchDetailTransactions, expandedId]);

  useEffect(() => {
    if (expandedId) fetchDetailTransactions(expandedId);
    else setDetailTxs([]);
  }, [expandedId, fetchDetailTransactions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGroups();
  }, [fetchGroups]);

  const handleSubmit = async (data: {
    name: string;
    description?: string;
    icon: string;
    color: string;
  }) => {
    if (!userId) return;
    setIsFormSubmitting(true);
    try {
      if (formMode === 'add') {
        const res = await groupsApi.create({ userId, ...data });
        if (res.success) {
          showToast('그룹이 추가되었습니다', 'success');
          setIsFormOpen(false);
          fetchGroups();
          triggerRefresh();
        } else {
          showToast(res.error || '추가에 실패했습니다', 'error');
        }
      } else if (editTarget) {
        const res = await groupsApi.update(editTarget.id, { userId, ...data });
        if (res.success) {
          showToast('그룹이 수정되었습니다', 'success');
          setIsFormOpen(false);
          setEditTarget(null);
          fetchGroups();
          triggerRefresh();
        } else {
          showToast(res.error || '수정에 실패했습니다', 'error');
        }
      }
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!userId || !editTarget) return;
    setIsFormSubmitting(true);
    try {
      const res = await groupsApi.delete(editTarget.id, userId);
      if (res.success) {
        showToast('그룹이 삭제되었습니다', 'success');
        setIsFormOpen(false);
        setEditTarget(null);
        if (expandedId === editTarget.id) setExpandedId(null);
        fetchGroups();
        triggerRefresh();
      } else {
        showToast(res.error || '삭제에 실패했습니다', 'error');
      }
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const totalIncome = groups.reduce((sum, g) => sum + g.totalIncome, 0);
  const totalExpense = groups.reduce((sum, g) => sum + g.totalExpense, 0);
  const totalTx = groups.reduce((sum, g) => sum + g.transactionCount, 0);
  const balance = totalIncome - totalExpense;

  const getEditTarget = (g: GroupSummary): GroupForEdit => ({
    id: g.id,
    name: g.name,
    description: g.description,
    icon: g.icon,
    color: g.color,
  });

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
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    summaryCard: {
      flexBasis: '48%',
      flexGrow: 1,
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 4 },
    summaryValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    summarySub: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    sectionCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 14,
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
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
    groupCard: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    groupCardSelected: {
      borderWidth: 1,
      borderColor: colors.accentBlue + '66',
      backgroundColor: colors.accentBlue + '14',
    },
    groupRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    groupIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupInfo: { flex: 1, minWidth: 0 },
    groupName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    groupMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    groupMetaText: { fontSize: 11, color: colors.textMuted },
    chevron: { transform: [{ rotate: '0deg' }] },
    chevronExpanded: { transform: [{ rotate: '180deg' }] },
    accordionBody: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    miniSummaryRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    miniSummaryCard: {
      flex: 1,
      backgroundColor: colors.bgCard,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    miniSummaryLabel: {
      fontSize: 10,
      color: colors.textMuted,
      marginBottom: 2,
    },
    miniSummaryAmount: { fontSize: 12, fontWeight: 'bold' },
    txListLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 8 },
    txActions: { flexDirection: 'row', gap: 12, marginBottom: 10 },
    txActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: colors.bgCard,
    },
    txActionText: { fontSize: 12, color: colors.textSecondary },
    emptyDetailText: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: 16,
    },
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyTitle: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
    emptySubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
      textAlign: 'center',
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentBlue} />
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
        <Text style={styles.headerTitle}>그룹</Text>
        {groups.length < MAX_GROUPS && (
          <TouchableOpacity
            style={styles.addHeaderButton}
            onPress={() => {
              setFormMode('add');
              setEditTarget(null);
              setIsFormOpen(true);
            }}
          >
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
            tintColor={colors.accentBlue}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>그룹 수</Text>
            <Text style={styles.summaryValue}>
              {groups.length}
              <Text style={[styles.summarySub, { fontSize: 14, fontWeight: 'normal' }]}>
                {' '}개
              </Text>
            </Text>
            <Text style={styles.summarySub}>총 {totalTx}건의 거래</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>총 수입</Text>
            <Text style={[styles.summaryValue, { color: colors.accentMint }]} numberOfLines={1}>
              ₩{formatNumber(totalIncome)}
            </Text>
            <Text style={styles.summarySub}>{groups.reduce((s, g) => s + g.incomeCount, 0)}건</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>총 지출</Text>
            <Text style={[styles.summaryValue, { color: colors.accentCoral }]} numberOfLines={1}>
              ₩{formatNumber(totalExpense)}
            </Text>
            <Text style={styles.summarySub}>
              {groups.reduce((s, g) => s + g.expenseCount, 0)}건
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>잔액</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: balance >= 0 ? colors.accentMint : colors.accentCoral },
              ]}
              numberOfLines={1}
            >
              {balance >= 0 ? '+' : '-'}₩{formatNumber(Math.abs(balance))}
            </Text>
            <Text style={styles.summarySub}>{totalTx}건</Text>
          </View>
        </View>

        {/* Group list */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="folder" size={20} color="#818CF8" />
              <Text style={styles.sectionTitle}>
                거래 그룹{' '}
                <Text style={styles.sectionCount}>
                  ({groups.length}/{MAX_GROUPS})
                </Text>
              </Text>
            </View>
            {groups.length < MAX_GROUPS && (
              <TouchableOpacity
                style={styles.sectionAddButton}
                onPress={() => {
                  setFormMode('add');
                  setEditTarget(null);
                  setIsFormOpen(true);
                }}
              >
                <MaterialIcons name="add" size={14} color={colors.textMuted} />
                <Text style={styles.sectionAddText}>추가</Text>
              </TouchableOpacity>
            )}
          </View>

          {groups.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="folder" size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>아직 그룹이 없습니다</Text>
              <Text style={styles.emptySubtitle}>
                여행, 이사 등 특별한 지출을{'\n'}그룹으로 관리해보세요
              </Text>
            </View>
          ) : (
            groups.map((group) => {
              const expanded = expandedId === group.id;
              const iconName = GROUP_ICON_MAP[group.icon || 'folder'] || 'folder';
              const groupColor = group.color || '#6366F1';
              return (
                <View key={group.id}>
                  <TouchableOpacity
                    style={[styles.groupCard, expanded && styles.groupCardSelected]}
                    activeOpacity={0.7}
                    onPress={() => setExpandedId(expanded ? null : group.id)}
                  >
                    <View style={styles.groupRow}>
                      <View
                        style={[
                          styles.groupIconBox,
                          { backgroundColor: groupColor + '20' },
                        ]}
                      >
                        <MaterialIcons name={iconName} size={18} color={groupColor} />
                      </View>
                      <View style={styles.groupInfo}>
                        <Text style={styles.groupName} numberOfLines={1}>
                          {group.name}
                        </Text>
                        <View style={styles.groupMetaRow}>
                          <Text
                            style={[
                              styles.groupMetaText,
                              {
                                color:
                                  group.netAmount >= 0
                                    ? colors.accentMint
                                    : colors.accentCoral,
                              },
                            ]}
                          >
                            {group.netAmount >= 0 ? '+' : '-'}₩
                            {formatNumber(Math.abs(group.netAmount))}
                          </Text>
                          <Text style={styles.groupMetaText}>·</Text>
                          <Text style={styles.groupMetaText}>{group.transactionCount}건</Text>
                        </View>
                      </View>
                      <MaterialIcons
                        name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                        size={20}
                        color={colors.textMuted}
                      />
                    </View>

                    {expanded && (
                      <View style={styles.accordionBody}>
                        <View style={styles.miniSummaryRow}>
                          <View style={styles.miniSummaryCard}>
                            <Text style={styles.miniSummaryLabel}>수입</Text>
                            <Text
                              style={[
                                styles.miniSummaryAmount,
                                { color: colors.accentMint },
                              ]}
                            >
                              ₩{formatNumber(group.totalIncome)}
                            </Text>
                          </View>
                          <View style={styles.miniSummaryCard}>
                            <Text style={styles.miniSummaryLabel}>지출</Text>
                            <Text
                              style={[
                                styles.miniSummaryAmount,
                                { color: colors.accentCoral },
                              ]}
                            >
                              ₩{formatNumber(group.totalExpense)}
                            </Text>
                          </View>
                          <View style={styles.miniSummaryCard}>
                            <Text style={styles.miniSummaryLabel}>합계</Text>
                            <Text
                              style={[
                                styles.miniSummaryAmount,
                                {
                                  color:
                                    group.netAmount >= 0
                                      ? colors.accentMint
                                      : colors.accentCoral,
                                },
                              ]}
                            >
                              {group.netAmount >= 0 ? '+' : '-'}₩
                              {formatNumber(Math.abs(group.netAmount))}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.txActions}>
                          <TouchableOpacity
                            style={styles.txActionButton}
                            onPress={() => {
                              setEditTarget(group);
                              setFormMode('edit');
                              setIsFormOpen(true);
                            }}
                          >
                            <MaterialIcons name="edit" size={14} color={colors.textSecondary} />
                            <Text style={styles.txActionText}>수정</Text>
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.txListLabel}>
                          거래 내역 ({group.transactionCount}건)
                        </Text>

                        {isDetailLoading ? (
                          <ActivityIndicator color={colors.accentBlue} />
                        ) : detailTxs.length > 0 ? (
                          detailTxs.slice(0, 5).map((tx, i) => (
                            <TransactionItem
                              key={tx.id}
                              transaction={{
                                id: tx.id,
                                amount: tx.amount,
                                type: tx.type,
                                description: tx.description,
                                date: tx.date,
                                savingsGoalId: tx.savingsGoalId,
                                recurringExpenseId: tx.recurringExpenseId,
                                category: tx.category
                                  ? {
                                      name: tx.category.name,
                                      icon: tx.category.icon,
                                      color: tx.category.color,
                                    }
                                  : null,
                              }}
                              showDivider={i < Math.min(detailTxs.length, 5) - 1}
                            />
                          ))
                        ) : (
                          <Text style={styles.emptyDetailText}>
                            연결된 거래가 없습니다
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <GroupFormModal
        visible={isFormOpen}
        mode={formMode}
        group={editTarget ? getEditTarget(editTarget) : null}
        onClose={() => {
          setIsFormOpen(false);
          setEditTarget(null);
        }}
        onSubmit={handleSubmit}
        onDelete={formMode === 'edit' ? handleDelete : undefined}
        isSubmitting={isFormSubmitting}
      />
    </View>
  );
}
