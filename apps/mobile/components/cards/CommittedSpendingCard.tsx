import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { useRefreshStore } from '../../stores/refreshStore';
import { Colors } from '../../constants/Colors';
import { recurringApi, type RecurringSummary } from '../../lib/api';
import { formatNumber } from '@moneger/shared';

interface CommittedSpendingCardProps {
  onManage?: () => void;
}

export function CommittedSpendingCard({ onManage }: CommittedSpendingCardProps) {
  const { theme } = useThemeStore();
  const { userId } = useAuthStore();
  const { lastTransactionUpdate } = useRefreshStore();
  const colors = Colors[theme];

  const [data, setData] = useState<RecurringSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await recurringApi.getSummary(userId);
      if (res.success && res.data) setData(res.data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (lastTransactionUpdate > 0) {
      fetchSummary();
    }
  }, [lastTransactionUpdate, fetchSummary]);

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    viewAll: { fontSize: 13, color: colors.textMuted },
    inner: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    innerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 107, 107, 0.15)',
    },
    label: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
    sublabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    amountRow: { alignItems: 'flex-end' },
    amount: { fontSize: 18, fontWeight: 'bold', color: colors.accentCoral },
    remainingText: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    breakdownRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 8,
    },
    breakdownItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    breakdownDot: { width: 8, height: 8, borderRadius: 4 },
    breakdownText: { fontSize: 10, color: colors.textMuted },
    nextAlertText: { fontSize: 11, color: colors.textMuted },
    nextAlertHighlight: { color: colors.accentCoral, fontWeight: '600' },
    emptyState: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingVertical: 18,
      alignItems: 'center',
    },
    emptyText: { fontSize: 13, color: colors.textMuted },
    skeleton: { padding: 16, height: 80 },
  });

  if (isLoading) {
    return (
      <View style={[styles.card, styles.skeleton]}>
        <ActivityIndicator color={colors.accentCoral} />
      </View>
    );
  }

  if (!data || data.activeCount === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="event-repeat" size={20} color={colors.accentCoral} />
            <Text style={styles.title}>고정비</Text>
          </View>
          {onManage && (
            <TouchableOpacity onPress={onManage}>
              <Text style={styles.viewAll}>전체보기 →</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>고정비를 등록해주세요</Text>
        </View>
      </View>
    );
  }

  const nextAlert = data.alerts[0] || null;
  const nextAlertDays = (() => {
    if (!nextAlert) return null;
    const due = new Date(nextAlert.nextDueDate);
    const today = new Date();
    const dueOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((dueOnly.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24));
  })();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="event-repeat" size={20} color={colors.accentCoral} />
          <Text style={styles.title}>고정비</Text>
        </View>
        {onManage && (
          <TouchableOpacity onPress={onManage}>
            <Text style={styles.viewAll}>전체보기 →</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inner}>
        <View style={styles.innerTop}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="event-repeat" size={20} color={colors.accentCoral} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>월 고정비</Text>
            <Text style={styles.sublabel}>{data.activeCount}건 등록</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amount}>₩{formatNumber(data.totalMonthly)}</Text>
            <Text style={styles.remainingText}>
              남은 ₩{formatNumber(data.remainingTotal)}
            </Text>
          </View>
        </View>
      </View>

      {data.categoryBreakdown.length > 0 && (
        <View style={styles.breakdownRow}>
          {data.categoryBreakdown.slice(0, 4).map((cat, i) => (
            <View key={cat.name} style={styles.breakdownItem}>
              <View
                style={[
                  styles.breakdownDot,
                  {
                    backgroundColor: cat.color || `hsl(${i * 60 + 200}, 50%, 55%)`,
                  },
                ]}
              />
              <Text style={styles.breakdownText}>
                {cat.name} {cat.percentage}%
              </Text>
            </View>
          ))}
        </View>
      )}

      {nextAlert && nextAlertDays !== null && (
        <Text style={styles.nextAlertText}>
          다음 지출: {nextAlert.description} ₩{formatNumber(nextAlert.amount)}{' '}
          <Text style={styles.nextAlertHighlight}>
            {nextAlertDays <= 0 ? '오늘' : `${nextAlertDays}일 후`}
          </Text>
        </Text>
      )}
    </View>
  );
}
