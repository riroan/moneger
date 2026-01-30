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
import { getIconName } from '../../constants/Icons';
import { formatNumber } from '@moneger/shared';
import { DonutChart, DonutChartData } from '../charts';

export interface CategoryData {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  total: number;
  count: number;
  budget?: number;
}

interface CategoryExpenseListProps {
  categories: CategoryData[];
  selectedIndex: number | null;
  onSelectIndex: (index: number | null) => void;
}

export function CategoryExpenseList({
  categories,
  selectedIndex,
  onSelectIndex,
}: CategoryExpenseListProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const totalAmount = categories.reduce((sum, cat) => sum + cat.total, 0);

  const chartData: DonutChartData[] = categories.map((cat) => ({
    color: cat.color || '#6B7280',
    amount: cat.total,
    name: cat.name,
  }));

  const styles = StyleSheet.create({
    container: {
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
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    emptyState: {
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 8,
    },
    chartContainer: {
      alignItems: 'center',
      marginBottom: 16,
      paddingVertical: 8,
    },
    categoryItem: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    categoryItemLast: {
      marginBottom: 0,
    },
    categoryItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    categoryIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    categoryInfo: {
      flex: 1,
    },
    categoryName: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    categoryCount: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    categoryAmount: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    budgetRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    budgetText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    budgetPercent: {
      fontSize: 12,
      fontWeight: '600',
    },
    progressContainer: {
      marginTop: 8,
    },
    progressBar: {
      height: 6,
      backgroundColor: colors.bgCard,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
  });

  if (categories.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <MaterialIcons name="pie-chart" size={20} color={colors.accentMint} />
            <Text style={styles.title}>카테고리별 지출</Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <MaterialIcons name="pie-chart" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>이번 달 지출 내역이 없습니다</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MaterialIcons name="pie-chart" size={20} color={colors.accentMint} />
          <Text style={styles.title}>카테고리별 지출</Text>
        </View>
      </View>

      {/* Donut Chart */}
      <View style={styles.chartContainer}>
        <DonutChart
          data={chartData}
          size={160}
          strokeWidth={20}
          totalAmount={totalAmount}
          selectedIndex={selectedIndex}
          onSegmentPress={onSelectIndex}
        />
      </View>

      {/* Category List */}
      {categories.map((cat, index) => {
        const usagePercent = cat.budget ? Math.round((cat.total / cat.budget) * 100) : 0;
        const progressColor =
          usagePercent >= 90
            ? colors.accentCoral
            : usagePercent >= 66
            ? colors.accentYellow
            : colors.accentMint;
        const isSelected = selectedIndex === index;
        const categoryColor = cat.color || '#6B7280';

        return (
          <TouchableOpacity
            key={cat.id}
            activeOpacity={0.7}
            onPress={() => onSelectIndex(isSelected ? null : index)}
            style={[
              styles.categoryItem,
              index === categories.length - 1 && styles.categoryItemLast,
              isSelected && {
                borderWidth: 2,
                borderColor: categoryColor,
                transform: [{ scale: 1.02 }],
              },
              selectedIndex !== null &&
                !isSelected && {
                  opacity: 0.5,
                },
            ]}
          >
            <View style={styles.categoryItemHeader}>
              <View
                style={[
                  styles.categoryIconContainer,
                  { backgroundColor: `${categoryColor}20` },
                  isSelected && { transform: [{ scale: 1.1 }] },
                ]}
              >
                <MaterialIcons
                  name={getIconName(cat.icon)}
                  size={20}
                  color={categoryColor}
                />
              </View>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{cat.name}</Text>
                <Text style={styles.categoryCount}>{cat.count}건</Text>
              </View>
              <Text style={styles.categoryAmount}>₩{formatNumber(cat.total)}</Text>
            </View>
            {cat.budget && (
              <View style={styles.budgetRow}>
                <Text style={styles.budgetText}>예산: ₩{formatNumber(cat.budget)}</Text>
                <Text style={[styles.budgetPercent, { color: progressColor }]}>
                  {usagePercent}% 사용
                </Text>
              </View>
            )}
            {cat.budget && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(usagePercent, 100)}%`,
                        backgroundColor: progressColor,
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
