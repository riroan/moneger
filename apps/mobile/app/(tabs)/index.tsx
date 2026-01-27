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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { balanceApi, transactionApi, Transaction } from '../../lib/api';

export default function HomeScreen() {
  const { userId, userName } = useAuthStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const [balance, setBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const fetchData = useCallback(async () => {
    if (!userId) return;

    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        balanceApi.get(userId),
        transactionApi.getAll(userId, year, month),
      ]);

      if (balanceRes.success && balanceRes.data) {
        setBalance(balanceRes.data.balance);
        setTotalIncome(balanceRes.data.totalIncome);
        setTotalExpense(balanceRes.data.totalExpense);
      }

      if (transactionsRes.success && transactionsRes.data) {
        setTransactions(transactionsRes.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId, year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
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
    greeting: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    userName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginTop: 4,
    },
    balanceCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      padding: 24,
      margin: 20,
      marginTop: 0,
      borderWidth: 1,
      borderColor: colors.border,
    },
    balanceLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    balanceAmount: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    summaryRow: {
      flexDirection: 'row',
      marginTop: 20,
      gap: 12,
    },
    summaryItem: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 16,
    },
    summaryLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 4,
    },
    summaryIncome: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.accentMint,
    },
    summaryExpense: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.accentCoral,
    },
    section: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    transactionIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    transactionInfo: {
      flex: 1,
    },
    transactionDesc: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    transactionCategory: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    transactionAmount: {
      fontSize: 16,
      fontWeight: '600',
    },
    incomeAmount: {
      color: colors.accentMint,
    },
    expenseAmount: {
      color: colors.accentCoral,
    },
    emptyState: {
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 12,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentMint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
          <Text style={styles.greeting}>안녕하세요,</Text>
          <Text style={styles.userName}>{userName || '사용자'}님</Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>총 자산</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>이번 달 수입</Text>
              <Text style={styles.summaryIncome}>
                +{formatCurrency(totalIncome)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>이번 달 지출</Text>
              <Text style={styles.summaryExpense}>
                -{formatCurrency(totalExpense)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>최근 거래</Text>

          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="receipt-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>아직 거래 내역이 없습니다</Text>
            </View>
          ) : (
            transactions.map((tx) => (
              <View key={tx.id} style={styles.transactionItem}>
                <View style={styles.transactionIcon}>
                  <Text style={{ fontSize: 20 }}>
                    {tx.categoryIcon || (tx.type === 'INCOME' ? '💰' : '💸')}
                  </Text>
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDesc}>
                    {tx.description || (tx.type === 'INCOME' ? '수입' : '지출')}
                  </Text>
                  <Text style={styles.transactionCategory}>
                    {tx.categoryName || '미분류'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    tx.type === 'INCOME'
                      ? styles.incomeAmount
                      : styles.expenseAmount,
                  ]}
                >
                  {tx.type === 'INCOME' ? '+' : '-'}
                  {formatCurrency(tx.amount)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
