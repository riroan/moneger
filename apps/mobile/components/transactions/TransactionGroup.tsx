import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { getIconName, MaterialIconName } from '../../constants/Icons';
import { formatNumber, formatDateWithDay, formatTime } from '@moneger/shared';

export interface TransactionGroupItem {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string | null;
  date: string;
  categoryId: string | null;
  savingsGoalId?: string | null;
  category?: {
    name: string;
    icon: string | null;
    color: string | null;
    type?: 'INCOME' | 'EXPENSE';
  };
}

interface TransactionGroupProps {
  date: string;
  transactions: TransactionGroupItem[];
  onPressTransaction: (transaction: TransactionGroupItem) => void;
}

export function TransactionGroup({
  date,
  transactions,
  onPressTransaction,
}: TransactionGroupProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const isSavingsTransaction = (tx: TransactionGroupItem): boolean => {
    return !!(tx.savingsGoalId || tx.category?.name === '저축');
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    dateHeader: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    info: {
      flex: 1,
    },
    description: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    category: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    right: {
      alignItems: 'flex-end',
    },
    amount: {
      fontSize: 15,
      fontWeight: '600',
    },
    time: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 66,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.dateHeader}>{formatDateWithDay(date)}</Text>
      <View style={styles.card}>
        {transactions.map((tx, index) => {
          const isSavings = isSavingsTransaction(tx);
          const iconColor = isSavings
            ? colors.accentCyan
            : (tx.category?.color || '#6B7280');
          const amountColor = isSavings
            ? colors.accentCyan
            : tx.type === 'INCOME'
              ? colors.accentMint
              : colors.accentCoral;
          const categoryName = isSavings
            ? '저축'
            : (tx.category?.name || '미분류');
          const iconName = isSavings
            ? 'savings'
            : getIconName(tx.category?.icon);

          return (
            <View key={tx.id}>
              <TouchableOpacity
                style={styles.item}
                onPress={() => onPressTransaction(tx)}
              >
                <View
                  style={[
                    styles.icon,
                    { backgroundColor: iconColor + '20' },
                  ]}
                >
                  <MaterialIcons
                    name={iconName as MaterialIconName}
                    size={20}
                    color={iconColor}
                  />
                </View>
                <View style={styles.info}>
                  <Text style={styles.description}>
                    {tx.description || '내역 없음'}
                  </Text>
                  <Text style={styles.category}>
                    {categoryName}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text
                    style={[
                      styles.amount,
                      { color: amountColor },
                    ]}
                  >
                    {tx.type === 'INCOME' ? '+' : '-'}
                    {formatNumber(tx.amount)}
                  </Text>
                  <Text style={styles.time}>
                    {formatTime(tx.date)}
                  </Text>
                </View>
              </TouchableOpacity>
              {index < transactions.length - 1 && <View style={styles.divider} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}
