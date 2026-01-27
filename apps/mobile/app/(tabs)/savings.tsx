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
import { savingsApi, SavingsGoal } from '../../lib/api';

export default function SavingsScreen() {
  const { userId } = useAuthStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    try {
      const res = await savingsApi.getAll(userId);
      if (res.success && res.data) {
        setGoals(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch savings:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

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
    section: {
      padding: 20,
      paddingTop: 0,
    },
    goalCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    goalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    goalIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    goalInfo: {
      flex: 1,
    },
    goalName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    goalTarget: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    goalPercent: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.accentMint,
    },
    progressContainer: {
      marginBottom: 16,
    },
    progressBar: {
      height: 10,
      backgroundColor: colors.bgSecondary,
      borderRadius: 5,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.accentMint,
      borderRadius: 5,
    },
    amountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    currentAmount: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    targetAmount: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statItem: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 14,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
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
          <Text style={styles.title}>저축 목표</Text>
          <Text style={styles.subtitle}>목표를 향해 차근차근 모아보세요</Text>
        </View>

        <View style={styles.section}>
          {goals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="trending-up-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>아직 저축 목표가 없습니다</Text>
            </View>
          ) : (
            goals.map((goal) => (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalIcon}>
                    <Text style={{ fontSize: 24 }}>{goal.icon}</Text>
                  </View>
                  <View style={styles.goalInfo}>
                    <Text style={styles.goalName}>{goal.name}</Text>
                    <Text style={styles.goalTarget}>{goal.targetDate}</Text>
                  </View>
                  <Text style={styles.goalPercent}>{goal.progressPercent}%</Text>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(goal.progressPercent, 100)}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.amountRow}>
                    <Text style={styles.currentAmount}>
                      {formatCurrency(goal.currentAmount)}
                    </Text>
                    <Text style={styles.targetAmount}>
                      {formatCurrency(goal.targetAmount)}
                    </Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>월별 목표</Text>
                    <Text style={styles.statValue}>
                      {formatCurrency(goal.monthlyTarget)}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>이번 달 저축</Text>
                    <Text style={styles.statValue}>
                      {formatCurrency(goal.thisMonthSavings)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
