import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { useRefreshStore } from '../../stores/refreshStore';
import { Colors } from '../../constants/Colors';
import { dailyBalanceApi, DailyBalance } from '../../lib/api';
import { LineChart } from '../charts';
import { formatNumber } from '@moneger/shared';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_PADDING = 40; // 20 padding on each side

const PERIOD_OPTIONS = [
  { label: '1일', days: 1 },
  { label: '3일', days: 3 },
  { label: '7일', days: 7 },
  { label: '30일', days: 30 },
];

export default function DailyReportCard() {
  const { theme } = useThemeStore();
  const { userId } = useAuthStore();
  const { lastTransactionUpdate } = useRefreshStore();
  const colors = Colors[theme];

  const [data, setData] = useState<DailyBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedDays, setSelectedDays] = useState(7);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    const result = await dailyBalanceApi.getRecent(userId, selectedDays);
    if (result.success && result.data) {
      setData(result.data);
      // 기본값으로 마지막 인덱스(오늘) 선택
      setSelectedIndex(result.data.length > 0 ? result.data.length - 1 : null);
    }
    setIsLoading(false);
  }, [userId, selectedDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData, lastTransactionUpdate]);

  const chartWidth = SCREEN_WIDTH - CHART_PADDING;

  // Calculate balance change
  const getBalanceChange = () => {
    if (data.length < 2) return { amount: 0, isPositive: true };
    const firstBalance = data[0].balance;
    const lastBalance = data[data.length - 1].balance;
    const change = lastBalance - firstBalance;
    return { amount: Math.abs(change), isPositive: change >= 0 };
  };

  const balanceChange = getBalanceChange();
  const latestBalance = data.length > 0 ? data[data.length - 1].balance : 0;

  // Determine line color based on balance trend
  const lineColor = balanceChange.isPositive ? colors.accentMint : colors.accentCoral;

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
      marginBottom: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textMuted,
    },
    balanceContainer: {
      alignItems: 'flex-end',
    },
    balance: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    changeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginTop: 2,
    },
    changeText: {
      fontSize: 12,
      fontWeight: '500',
    },
    chartContainer: {
      marginTop: 8,
      marginHorizontal: -16,
    },
    loadingContainer: {
      height: 150,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyContainer: {
      height: 150,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    summaryContainer: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 10,
    },
    summaryItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '600',
    },
    periodSelector: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    periodButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: colors.bgSecondary,
    },
    periodButtonActive: {
      backgroundColor: colors.accentMint,
    },
    periodButtonText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    periodButtonTextActive: {
      color: colors.bgPrimary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 10,
    },
    totalItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    totalLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    totalValue: {
      fontSize: 15,
      fontWeight: '600',
    },
  });

  // 선택된 날짜의 데이터 (기본값: 마지막 = 오늘)
  const selectedData = selectedIndex !== null && data[selectedIndex] ? data[selectedIndex] : null;
  const selectedIncome = selectedData?.income ?? 0;
  const selectedExpense = selectedData?.expense ?? 0;
  const selectedSavings = selectedData?.savings ?? 0;
  const selectedTotal = selectedIncome - selectedExpense - selectedSavings;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="show-chart" size={20} color={colors.accentMint} />
          <View>
            <Text style={styles.title}>일별 리포트</Text>
            <Text style={styles.subtitle}>최근 {selectedDays}일</Text>
          </View>
        </View>
        <View style={styles.balanceContainer}>
          <Text style={[styles.balance, latestBalance < 0 && { color: colors.accentCoral }]}>
            {latestBalance < 0 ? '-' : ''}₩{formatNumber(Math.abs(latestBalance))}
          </Text>
          {data.length >= 2 && (
            <View style={styles.changeContainer}>
              <MaterialIcons
                name={balanceChange.isPositive ? 'arrow-upward' : 'arrow-downward'}
                size={12}
                color={balanceChange.isPositive ? colors.accentMint : colors.accentCoral}
              />
              <Text style={[styles.changeText, { color: balanceChange.isPositive ? colors.accentMint : colors.accentCoral }]}>
                ₩{formatNumber(balanceChange.amount)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.periodSelector}>
        {PERIOD_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.days}
            style={[
              styles.periodButton,
              selectedDays === option.days && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedDays(option.days)}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedDays === option.days && styles.periodButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.textMuted} />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>데이터가 없습니다</Text>
        </View>
      ) : (
        <>
          <View style={styles.chartContainer}>
            <LineChart
              data={data.map((d) => ({ date: d.date, value: d.balance }))}
              width={chartWidth}
              height={150}
              lineColor={lineColor}
              showDots={true}
              showLabels={true}
              selectedIndex={selectedIndex}
              onSelectIndex={setSelectedIndex}
            />
          </View>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>수입</Text>
              <Text style={[styles.summaryValue, { color: selectedIncome > 0 ? colors.accentMint : colors.textMuted }]}>
                {selectedIncome > 0 ? `+₩${formatNumber(selectedIncome)}` : '-'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>지출</Text>
              <Text style={[styles.summaryValue, { color: selectedExpense > 0 ? colors.accentCoral : colors.textMuted }]}>
                {selectedExpense > 0 ? `-₩${formatNumber(selectedExpense)}` : '-'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>저축</Text>
              <Text style={[styles.summaryValue, { color: selectedSavings > 0 ? colors.accentCyan : colors.textMuted }]}>
                {selectedSavings > 0 ? `₩${formatNumber(selectedSavings)}` : '-'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>합계</Text>
              <Text style={[styles.totalValue, { color: selectedTotal >= 0 ? colors.accentMint : colors.accentCoral }]}>
                {selectedTotal >= 0 ? '+' : '-'}₩{formatNumber(Math.abs(selectedTotal))}
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
