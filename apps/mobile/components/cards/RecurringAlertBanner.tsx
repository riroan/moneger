import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { useRefreshStore } from '../../stores/refreshStore';
import { Colors } from '../../constants/Colors';
import { recurringApi, type RecurringSummaryAlert } from '../../lib/api';
import { formatNumber } from '@moneger/shared';

export function RecurringAlertBanner() {
  const { theme } = useThemeStore();
  const { userId } = useAuthStore();
  const { lastTransactionUpdate } = useRefreshStore();
  const colors = Colors[theme];

  const [alerts, setAlerts] = useState<RecurringSummaryAlert[]>([]);
  const [dismissed, setDismissed] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await recurringApi.getSummary(userId);
      if (res.success && res.data?.alerts?.length) {
        setAlerts(res.data.alerts);
      } else {
        setAlerts([]);
      }
    } catch {
      // ignore
    }
  }, [userId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (lastTransactionUpdate > 0) {
      fetchAlerts();
    }
  }, [lastTransactionUpdate, fetchAlerts]);

  const styles = StyleSheet.create({
    banner: {
      backgroundColor: colors.accentCoral + '1a',
      borderWidth: 1,
      borderColor: colors.accentCoral + '33',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginHorizontal: 20,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    iconWrap: { paddingTop: 2 },
    body: { flex: 1, minWidth: 0 },
    line: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    daysHighlight: {
      color: colors.accentCoral,
      fontWeight: '600',
    },
    moreText: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    closeButton: { padding: 4 },
  });

  if (dismissed || alerts.length === 0) return null;

  const displayed = alerts.slice(0, 3);
  const remaining = alerts.length - 3;

  const getDiffDays = (dueDateStr: string) => {
    const due = new Date(dueDateStr);
    const today = new Date();
    const dueOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((dueOnly.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <View style={styles.banner}>
      <View style={styles.iconWrap}>
        <MaterialIcons
          name="notifications-active"
          size={18}
          color={colors.accentCoral}
        />
      </View>
      <View style={styles.body}>
        {displayed.map((alert) => {
          const diff = getDiffDays(alert.nextDueDate);
          return (
            <Text key={alert.id} style={styles.line} numberOfLines={1}>
              {alert.description} ₩{formatNumber(alert.amount)} 지출이{' '}
              <Text style={styles.daysHighlight}>
                {diff <= 0 ? '오늘' : `${diff}일 후`}
              </Text>
              입니다
            </Text>
          );
        })}
        {remaining > 0 && (
          <Text style={styles.moreText}>외 {remaining}건</Text>
        )}
      </View>
      <TouchableOpacity style={styles.closeButton} onPress={() => setDismissed(true)}>
        <MaterialIcons name="close" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}
