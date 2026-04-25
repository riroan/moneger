import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { useRefreshStore } from '../../stores/refreshStore';
import { Colors } from '../../constants/Colors';
import { groupsApi, type GroupSummary } from '../../lib/api';
import { formatNumber } from '@moneger/shared';
import type { MaterialIconName } from '../../constants/Icons';

const GROUP_ICON_MAP: Record<string, MaterialIconName> = {
  folder: 'folder',
  travel: 'flight',
  home: 'home',
  celebration: 'celebration',
  work: 'work',
  school: 'school',
  shopping: 'shopping-bag',
  health: 'favorite',
};

interface GroupsCardProps {
  onViewAll?: () => void;
}

export function GroupsCard({ onViewAll }: GroupsCardProps) {
  const { theme } = useThemeStore();
  const { userId } = useAuthStore();
  const { lastTransactionUpdate } = useRefreshStore();
  const colors = Colors[theme];

  const [groups, setGroups] = useState<GroupSummary[]>([]);

  const fetchGroups = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await groupsApi.getAll(userId);
      if (res.success && res.data) setGroups(res.data.slice(0, 3));
    } catch {
      // ignore
    }
  }, [userId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (lastTransactionUpdate > 0) {
      fetchGroups();
    }
  }, [lastTransactionUpdate, fetchGroups]);

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
    groupRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    groupRowLast: { marginBottom: 0 },
    iconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { flex: 1, minWidth: 0 },
    name: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
    amountColumn: { alignItems: 'flex-end' },
    amount: { fontSize: 12, fontWeight: '600', color: colors.accentCoral },
    count: { fontSize: 10, color: colors.textMuted },
    emptyState: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingVertical: 18,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: 8,
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="folder" size={20} color="#818CF8" />
          <Text style={styles.title}>그룹</Text>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text style={styles.viewAll}>전체보기 →</Text>
          </TouchableOpacity>
        )}
      </View>

      {groups.length > 0 ? (
        groups.map((group, i) => {
          const iconName = GROUP_ICON_MAP[group.icon || 'folder'] || 'folder';
          const groupColor = group.color || '#6366F1';
          return (
            <View
              key={group.id}
              style={[styles.groupRow, i === groups.length - 1 && styles.groupRowLast]}
            >
              <View style={[styles.iconBox, { backgroundColor: groupColor + '20' }]}>
                <MaterialIcons name={iconName} size={16} color={groupColor} />
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {group.name}
                </Text>
              </View>
              <View style={styles.amountColumn}>
                <Text style={styles.amount}>₩{formatNumber(group.totalExpense)}</Text>
                <Text style={styles.count}>{group.transactionCount}건</Text>
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            여행, 이사 등 특별 지출을 그룹으로 관리해보세요
          </Text>
        </View>
      )}
    </View>
  );
}
