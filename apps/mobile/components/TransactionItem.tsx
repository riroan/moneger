import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getIconName } from '../constants/Icons';
import { useThemeStore } from '../stores/themeStore';
import { Colors } from '../constants/Colors';
import { formatNumber, formatTime } from '@moneger/shared';

interface TransactionItemProps {
  transaction: {
    id: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    description: string | null;
    date: string;
    savingsGoalId?: string | null;
    recurringExpenseId?: string | null;
    category?: {
      name: string;
      icon: string | null;
      color: string | null;
    } | null;
  };
  onPress?: () => void;
  showDivider?: boolean;
}

export default function TransactionItem({
  transaction,
  onPress,
  showDivider = false,
}: TransactionItemProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const isSavings = !!transaction.savingsGoalId;
  const isRecurring = !!transaction.recurringExpenseId;
  const iconColor = isSavings
    ? colors.accentCyan
    : (transaction.category?.color || '#6B7280');
  const amountColor = isSavings
    ? colors.accentCyan
    : transaction.type === 'INCOME'
      ? colors.accentMint
      : colors.accentCoral;
  const categoryName = isSavings
    ? '저축'
    : (transaction.category?.name || '미분류');
  const iconName = isSavings
    ? 'savings'
    : getIconName(transaction.category?.icon);

  const styles = StyleSheet.create({
    container: {},
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    recurringBadge: {
      position: 'absolute',
      top: -3,
      right: -3,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.bgCard,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: {
      flex: 1,
    },
    description: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    categoryPill: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 8,
      backgroundColor: colors.accentCoral + '26',
    },
    categoryPillText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.accentCoral,
    },
    category: {
      fontSize: 12,
      color: colors.textMuted,
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
    },
  });

  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: iconColor + '20' }]}>
        <MaterialIcons name={iconName} size={20} color={iconColor} />
        {isRecurring && (
          <View style={styles.recurringBadge}>
            <MaterialIcons name="event-repeat" size={9} color={colors.accentCoral} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.description}>
          {transaction.description || (transaction.type === 'INCOME' ? '수입' : '지출')}
        </Text>
        <View style={styles.categoryRow}>
          {isRecurring && !isSavings && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>정기</Text>
            </View>
          )}
          <Text style={styles.category}>{categoryName}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {transaction.type === 'INCOME' ? '+' : '-'}₩{formatNumber(transaction.amount)}
        </Text>
        <Text style={styles.time}>{formatTime(transaction.date)}</Text>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      {onPress ? (
        <TouchableOpacity style={styles.item} onPress={onPress}>
          {content}
        </TouchableOpacity>
      ) : (
        <View style={styles.item}>{content}</View>
      )}
      {showDivider && <View style={styles.divider} />}
    </View>
  );
}
