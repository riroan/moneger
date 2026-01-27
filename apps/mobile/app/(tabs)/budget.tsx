import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { budgetApi, Budget } from '../../lib/api';

export default function BudgetScreen() {
  const { userId } = useAuthStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const fetchData = useCallback(async () => {
    if (!userId) return;

    try {
      const res = await budgetApi.getAll(userId, year, month);
      if (res.success && res.data) {
        setBudgets(res.data.budgets);
        setTotalBudget(res.data.totalBudget);
        setTotalSpent(res.data.totalSpent);
      }
    } catch (error) {
      console.error('Failed to fetch budgets:', error);
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

  const getProgressPercent = (spent: number, budget: number) => {
    if (budget === 0) return 0;
    return Math.min((spent / budget) * 100, 100);
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
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    summaryCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      padding: 24,
      margin: 20,
      marginTop: 0,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    summaryAmount: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    progressContainer: {
      marginTop: 8,
    },
    progressBar: {
      height: 8,
      backgroundColor: colors.bgSecondary,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    progressText: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 8,
      textAlign: 'right',
    },
    section: {
      padding: 20,
      paddingTop: 0,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    budgetItem: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    budgetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    budgetIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    budgetName: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    budgetAmount: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    budgetProgress: {
      height: 6,
      backgroundColor: colors.bgSecondary,
      borderRadius: 3,
      overflow: 'hidden',
    },
    budgetProgressFill: {
      height: '100%',
      borderRadius: 3,
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

  const remainingPercent = getProgressPercent(totalSpent, totalBudget);
  const isOverBudget = totalSpent > totalBudget;

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
          <Text style={styles.title}>예산</Text>
          <Text style={styles.subtitle}>
            {year}년 {month}월 예산 현황
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>총 예산</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(totalBudget)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.summaryLabel}>사용 금액</Text>
              <Text
                style={[
                  styles.summaryAmount,
                  { color: isOverBudget ? colors.accentCoral : colors.textPrimary },
                ]}
              >
                {formatCurrency(totalSpent)}
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${remainingPercent}%`,
                    backgroundColor: isOverBudget
                      ? colors.accentCoral
                      : colors.accentMint,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {isOverBudget
                ? `${formatCurrency(totalSpent - totalBudget)} 초과`
                : `${formatCurrency(totalBudget - totalSpent)} 남음`}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>카테고리별 예산</Text>

          {budgets.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="wallet-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>설정된 예산이 없습니다</Text>
            </View>
          ) : (
            budgets.map((budget) => {
              const percent = getProgressPercent(budget.spent, budget.amount);
              const over = budget.spent > budget.amount;

              return (
                <View key={budget.id} style={styles.budgetItem}>
                  <View style={styles.budgetHeader}>
                    <View
                      style={[
                        styles.budgetIcon,
                        { backgroundColor: budget.categoryColor + '20' },
                      ]}
                    >
                      <Text style={{ fontSize: 18 }}>{budget.categoryIcon}</Text>
                    </View>
                    <Text style={styles.budgetName}>{budget.categoryName}</Text>
                    <Text style={styles.budgetAmount}>
                      {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                    </Text>
                  </View>
                  <View style={styles.budgetProgress}>
                    <View
                      style={[
                        styles.budgetProgressFill,
                        {
                          width: `${percent}%`,
                          backgroundColor: over
                            ? colors.accentCoral
                            : budget.categoryColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
