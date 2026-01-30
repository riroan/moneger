import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { formatNumber } from '@moneger/shared';
import { UI_ICONS } from '../../constants/Icons';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

interface TodaySummaryCardProps {
  month: number;
  day: number;
  dayOfWeek: number;
  income: { total: number; count: number };
  expense: { total: number; count: number };
  savings: { total: number; count: number };
}

export default function TodaySummaryCard({
  month,
  day,
  dayOfWeek,
  income,
  expense,
  savings,
}: TodaySummaryCardProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const hasIncome = income.count > 0;
  const hasExpense = expense.count > 0;
  const hasSavings = savings.count > 0;
  const hasAny = hasIncome || hasExpense || hasSavings;
  const balance = income.total - expense.total - savings.total;

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
      marginBottom: 16,
    },
    icon: {
      marginRight: 8,
    },
    title: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    date: {
      fontSize: 13,
      color: colors.textMuted,
    },
    content: {
      gap: 12,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    itemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    itemLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    itemCount: {
      fontSize: 12,
      color: colors.textMuted,
    },
    itemAmount: {
      fontSize: 16,
      fontWeight: '600',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginTop: 12,
    },
    balanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    balanceLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    balanceAmount: {
      fontSize: 16,
      fontWeight: '600',
    },
    emptyContainer: {
      alignItems: 'center',
      padding: 12,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
    },
  });

  const formattedDate = `${month}월 ${day}일 (${DAY_NAMES[dayOfWeek]})`;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialIcons name={UI_ICONS.today} size={18} color={colors.accentMint} style={styles.icon} />
        <Text style={styles.title}>오늘의 내역</Text>
        <Text style={styles.date}>{formattedDate}</Text>
      </View>

      {hasAny ? (
        <View style={styles.content}>
          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemLabel}>수입</Text>
              {hasIncome && <Text style={styles.itemCount}>{income.count}건</Text>}
            </View>
            <Text style={[styles.itemAmount, { color: hasIncome ? colors.accentMint : colors.textMuted }]}>
              {hasIncome ? `+₩${formatNumber(income.total)}` : '-'}
            </Text>
          </View>
          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemLabel}>지출</Text>
              {hasExpense && <Text style={styles.itemCount}>{expense.count}건</Text>}
            </View>
            <Text style={[styles.itemAmount, { color: hasExpense ? colors.accentCoral : colors.textMuted }]}>
              {hasExpense ? `-₩${formatNumber(expense.total)}` : '-'}
            </Text>
          </View>
          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemLabel}>저축</Text>
              {hasSavings && <Text style={styles.itemCount}>{savings.count}건</Text>}
            </View>
            <Text style={[styles.itemAmount, { color: hasSavings ? colors.accentCyan : colors.textMuted }]}>
              {hasSavings ? `₩${formatNumber(savings.total)}` : '-'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>합계</Text>
            <Text style={[styles.balanceAmount, { color: balance >= 0 ? colors.accentMint : colors.accentCoral }]}>
              {balance >= 0 ? '+' : '-'}₩{formatNumber(Math.abs(balance))}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>오늘은 아직 내역이 없어요</Text>
        </View>
      )}
    </View>
  );
}
