import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { Colors } from '../constants/Colors';
import { analyticsApi, type AnalyticsResult } from '../lib/api';
import { formatNumber } from '@moneger/shared';
import BarChart from '../components/charts/BarChart';
import MultiLineChart from '../components/charts/MultiLineChart';

const COLOR_MINT = '#4ade80';
const COLOR_CORAL = '#ff6b6b';
const COLOR_BLUE = '#60a5fa';
const COLOR_PURPLE = '#a78bfa';
const COLOR_YELLOW = '#fbbf24';

const CATEGORY_FALLBACK_COLORS = [
  '#60a5fa',
  '#f472b6',
  '#fb923c',
  '#a78bfa',
  '#34d399',
  '#facc15',
];

function shortMonthLabel(year: number, month: number) {
  const yy = String(year).slice(2);
  const mm = String(month).padStart(2, '0');
  return `${yy}-${mm}`;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;

  const [months, setMonths] = useState(6);
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.get(userId, months);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || '데이터를 불러오지 못했습니다');
      }
    } catch {
      setError('데이터를 불러오지 못했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [userId, months]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 12,
      gap: 8,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.textPrimary,
      flex: 1,
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    errorText: { color: colors.accentCoral, fontSize: 14 },
    monthSelectorRow: {
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    monthButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.bgSecondary,
    },
    monthButtonActive: {
      backgroundColor: colors.accentBlue + '33',
    },
    monthButtonText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    monthButtonTextActive: {
      color: colors.accentBlue,
      fontWeight: '600',
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    summaryCard: {
      flexBasis: '48%',
      flexGrow: 1,
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 4 },
    summaryValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    summarySub: { fontSize: 11, marginTop: 4 },
    chartCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 14,
      marginHorizontal: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chartTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    chartTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 12,
      marginTop: 8,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendSwatch: { width: 10, height: 10, borderRadius: 2 },
    legendLine: { width: 16, height: 2, borderRadius: 1 },
    legendText: { fontSize: 11, color: colors.textMuted },
    emptySection: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    emptyText: { color: colors.textMuted, fontSize: 13 },
  });

  if (isLoading && !data) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>분석</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentBlue} />
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>분석</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || '데이터가 없습니다'}</Text>
        </View>
      </View>
    );
  }

  // Compute summary card values
  const monthly = data.months;
  const currentMonth = monthly[monthly.length - 1];
  const expenseDiff =
    data.averages.expense > 0
      ? Math.round(((currentMonth.expense - data.averages.expense) / data.averages.expense) * 100)
      : 0;
  const peakMonth = monthly.reduce((max, m) => (m.expense > max.expense ? m : max), monthly[0]);
  const recentN = monthly.slice(-months);
  const savingsTrend =
    recentN.length >= 2
      ? recentN[recentN.length - 1].savingsDeposit >= recentN[0].savingsDeposit
        ? '상승'
        : '하락'
      : '-';
  const savingsRateMonths = monthly.filter((m) => m.income > 0);
  const avgSavingsRate =
    savingsRateMonths.reduce((sum, m) => sum + (m.savingsDeposit / m.income) * 100, 0) /
    (savingsRateMonths.length || 1);
  const totalNet = monthly.reduce((sum, m) => sum + m.net, 0);

  // Chart data
  const xLabels = monthly.map((m) => shortMonthLabel(m.year, m.month));
  const chartWidth = screenWidth - 32 - 28; // screen - margins - card padding

  // DOW chart
  const dowLabels = data.dowPattern.map((d) => d.day);

  // Category trends
  const trendCategories = data.categoryTrends.categories;
  const hasOthers = data.categoryTrends.data.some((d) => '기타' in d);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>분석</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Period selector */}
        <View style={styles.monthSelectorRow}>
          {[3, 6, 12].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.monthButton, months === n && styles.monthButtonActive]}
              onPress={() => setMonths(n)}
            >
              <Text
                style={[
                  styles.monthButtonText,
                  months === n && styles.monthButtonTextActive,
                ]}
              >
                {n}개월
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>이번 달 지출</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>
              ₩{formatNumber(currentMonth.expense)}
            </Text>
            <Text
              style={[
                styles.summarySub,
                {
                  color:
                    expenseDiff > 0
                      ? colors.accentCoral
                      : expenseDiff < 0
                      ? colors.accentMint
                      : colors.textMuted,
                },
              ]}
            >
              {expenseDiff > 0
                ? `평균 대비 +${expenseDiff}% ↗`
                : expenseDiff < 0
                ? `평균 대비 ${expenseDiff}% ↘`
                : '평균과 동일'}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>최고 지출 월</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>
              ₩{formatNumber(peakMonth.expense)}
            </Text>
            <Text style={[styles.summarySub, { color: colors.textMuted }]}>
              {peakMonth.year}년 {peakMonth.month}월
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>평균 저축률</Text>
            <Text style={styles.summaryValue}>{Math.round(avgSavingsRate)}%</Text>
            <Text
              style={[
                styles.summarySub,
                {
                  color:
                    savingsTrend === '상승'
                      ? colors.accentMint
                      : savingsTrend === '하락'
                      ? colors.accentCoral
                      : colors.textMuted,
                },
              ]}
            >
              {savingsTrend === '상승'
                ? '상승 중 ↗'
                : savingsTrend === '하락'
                ? '하락 중 ↘'
                : '-'}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{months}개월 누적 순저축</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: totalNet >= 0 ? colors.accentMint : colors.accentCoral },
              ]}
              numberOfLines={1}
            >
              {totalNet >= 0 ? '+' : ''}₩{formatNumber(Math.abs(totalNet))}
            </Text>
            <Text style={[styles.summarySub, { color: colors.textMuted }]}>
              {totalNet >= 0 ? '흑자' : '적자'}
            </Text>
          </View>
        </View>

        {/* Monthly income/expense/savings chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartTitleRow}>
            <MaterialIcons name="bar-chart" size={20} color={COLOR_BLUE} />
            <Text style={styles.chartTitle}>월별 수입 / 지출 / 저축</Text>
          </View>
          <BarChart
            width={chartWidth}
            height={220}
            labels={xLabels}
            series={[
              { key: 'income', label: '수입', color: COLOR_MINT, values: monthly.map((m) => m.income) },
              { key: 'expense', label: '지출', color: COLOR_CORAL, values: monthly.map((m) => m.expense) },
              { key: 'savings', label: '저축', color: COLOR_BLUE, values: monthly.map((m) => m.savingsDeposit) },
            ]}
            lineSeries={{
              key: 'net',
              label: '순저축',
              color: COLOR_PURPLE,
              values: monthly.map((m) => m.net),
              dashed: true,
            }}
          />
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: COLOR_MINT }]} />
              <Text style={styles.legendText}>수입</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: COLOR_CORAL }]} />
              <Text style={styles.legendText}>지출</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: COLOR_BLUE }]} />
              <Text style={styles.legendText}>저축</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: COLOR_PURPLE }]} />
              <Text style={styles.legendText}>순저축</Text>
            </View>
          </View>
        </View>

        {/* Day-of-week pattern */}
        <View style={styles.chartCard}>
          <View style={styles.chartTitleRow}>
            <MaterialIcons name="calendar-view-week" size={20} color={COLOR_BLUE} />
            <Text style={styles.chartTitle}>요일별 지출 패턴</Text>
          </View>
          <BarChart
            width={chartWidth}
            height={180}
            labels={dowLabels}
            series={[
              {
                key: 'dow',
                label: '지출',
                color: COLOR_BLUE,
                values: data.dowPattern.map((d) => d.amount),
              },
            ]}
          />
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: COLOR_BLUE }]} />
              <Text style={styles.legendText}>평일/주말</Text>
            </View>
          </View>
        </View>

        {/* Savings rate trend */}
        <View style={styles.chartCard}>
          <View style={styles.chartTitleRow}>
            <MaterialIcons name="savings" size={20} color={COLOR_MINT} />
            <Text style={styles.chartTitle}>저축률 트렌드</Text>
          </View>
          <MultiLineChart
            width={chartWidth}
            height={180}
            labels={xLabels}
            series={[
              {
                key: 'savings',
                label: '저축액',
                color: COLOR_MINT,
                values: monthly.map((m) => m.savingsDeposit),
              },
            ]}
            referenceLine={
              data.monthlyTarget != null
                ? {
                    value: data.monthlyTarget,
                    color: COLOR_YELLOW,
                    label: `목표`,
                  }
                : undefined
            }
          />
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: COLOR_MINT }]} />
              <Text style={styles.legendText}>저축액</Text>
            </View>
            {data.monthlyTarget != null && (
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: COLOR_YELLOW }]} />
                <Text style={styles.legendText}>목표 저축액</Text>
              </View>
            )}
          </View>
        </View>

        {/* Category trends */}
        {trendCategories.length > 0 && (
          <View style={styles.chartCard}>
            <View style={styles.chartTitleRow}>
              <MaterialIcons name="category" size={20} color={COLOR_CORAL} />
              <Text style={styles.chartTitle}>카테고리별 지출 추이</Text>
            </View>
            <MultiLineChart
              width={chartWidth}
              height={200}
              labels={xLabels}
              series={[
                ...trendCategories.map((cat, i) => ({
                  key: cat.id,
                  label: cat.name,
                  color:
                    cat.color ||
                    CATEGORY_FALLBACK_COLORS[i % CATEGORY_FALLBACK_COLORS.length],
                  values: data.categoryTrends.data.map((d) => Number(d[cat.name] ?? 0)),
                })),
                ...(hasOthers
                  ? [
                      {
                        key: '__others__',
                        label: '기타',
                        color: colors.textMuted,
                        values: data.categoryTrends.data.map((d) =>
                          Number(d['기타'] ?? 0)
                        ),
                        dashed: true,
                      },
                    ]
                  : []),
              ]}
            />
            <View style={styles.legendRow}>
              {trendCategories.map((cat, i) => (
                <View key={cat.id} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendLine,
                      {
                        backgroundColor:
                          cat.color ||
                          CATEGORY_FALLBACK_COLORS[i % CATEGORY_FALLBACK_COLORS.length],
                      },
                    ]}
                  />
                  <Text style={styles.legendText}>{cat.name}</Text>
                </View>
              ))}
              {hasOthers && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendLine, { backgroundColor: colors.textMuted }]} />
                  <Text style={styles.legendText}>기타</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
