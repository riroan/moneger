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
  const iconColor = isSavings
    ? colors.accentBlue
    : (transaction.category?.color || '#6B7280');
  const amountColor = isSavings
    ? colors.accentBlue
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
    },
  });

  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: iconColor + '20' }]}>
        <MaterialIcons name={iconName} size={20} color={iconColor} />
      </View>
      <View style={styles.info}>
        <Text style={styles.description}>
          {transaction.description || (transaction.type === 'INCOME' ? '수입' : '지출')}
        </Text>
        <Text style={styles.category}>{categoryName}</Text>
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
