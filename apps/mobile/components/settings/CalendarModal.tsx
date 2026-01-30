import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { getHolidayDaysInMonth, formatNumber, getKSTDay } from '@moneger/shared';
import type { MaterialIconName } from '../../constants/Icons';

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, MaterialIconName> = {
  star: 'star',
  box: 'inventory-2',
  restaurant: 'restaurant',
  car: 'directions-car',
  home: 'home',
  work: 'work',
  game: 'sports-esports',
  movie: 'movie',
  cart: 'shopping-cart',
  money: 'attach-money',
  card: 'credit-card',
  hospital: 'local-hospital',
  book: 'menu-book',
  flight: 'flight',
  gift: 'card-giftcard',
  cafe: 'local-cafe',
  food: 'fastfood',
  person: 'person',
  heart: 'favorite',
  bag: 'shopping-bag',
  payment: 'payments',
  music: 'music-note',
  fitness: 'fitness-center',
  pet: 'pets',
};

export interface CalendarTransaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description?: string;
  date: string;
  categoryId?: string;
  savingsGoalId?: string | null;
  category?: {
    name: string;
    icon: string | null;
    color: string | null;
  };
}

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  transactions: CalendarTransaction[];
  isLoading: boolean;
  calendarDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  isPrevMonthDisabled: boolean;
  isNextMonthDisabled: boolean;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export function CalendarModal({
  visible,
  onClose,
  transactions,
  isLoading,
  calendarDate,
  onPrevMonth,
  onNextMonth,
  isPrevMonthDisabled,
  isNextMonthDisabled,
}: CalendarModalProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (visible) {
      const now = new Date();
      if (calendarDate.getFullYear() === now.getFullYear() && calendarDate.getMonth() === now.getMonth()) {
        setSelectedDate(now);
      } else {
        setSelectedDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1));
      }
    }
  }, [visible, calendarDate]);

  const getCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];

    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const getTransactionsForDay = (day: number) => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return getKSTDay(txDate) === day;
    });
  };

  const getDayIndicators = (day: number) => {
    const txs = getTransactionsForDay(day);
    const hasIncome = txs.some(tx => tx.type === 'INCOME' && !tx.savingsGoalId);
    const hasExpense = txs.some(tx => tx.type === 'EXPENSE' && !tx.savingsGoalId);
    const hasSavings = txs.some(tx => tx.savingsGoalId);
    return { hasIncome, hasExpense, hasSavings };
  };

  const getSelectedDateTransactions = () => {
    if (!selectedDate) return [];
    const selectedDay = selectedDate.getDate();
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return getKSTDay(txDate) === selectedDay;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getSelectedDateSummary = () => {
    const txs = getSelectedDateTransactions();
    const income = txs.filter(tx => tx.type === 'INCOME' && !tx.savingsGoalId).reduce((sum, tx) => sum + tx.amount, 0);
    const expense = txs.filter(tx => tx.type === 'EXPENSE' && !tx.savingsGoalId).reduce((sum, tx) => sum + tx.amount, 0);
    const savings = txs.filter(tx => tx.savingsGoalId).reduce((sum, tx) => sum + tx.amount, 0);
    return { income, expense, savings };
  };

  const isToday = (day: number) => {
    const now = new Date();
    return (
      calendarDate.getFullYear() === now.getFullYear() &&
      calendarDate.getMonth() === now.getMonth() &&
      day === now.getDate()
    );
  };

  const isSelectedDay = (day: number) => {
    if (!selectedDate) return false;
    return (
      calendarDate.getFullYear() === selectedDate.getFullYear() &&
      calendarDate.getMonth() === selectedDate.getMonth() &&
      day === selectedDate.getDate()
    );
  };

  const renderCategoryIcon = (iconId: string, size: number = 20, color: string = '#fff') => {
    const iconName = CATEGORY_ICONS[iconId] || CATEGORY_ICONS.money;
    return <MaterialIcons name={iconName} size={size} color={color} />;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    monthText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      minWidth: 100,
      textAlign: 'center',
    },
    navButton: {
      padding: 8,
    },
    navButtonDisabled: {
      opacity: 0.3,
    },
    grid: {
      paddingHorizontal: 12,
      paddingTop: 12,
    },
    dayNames: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    dayName: {
      flex: 1,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '600',
      paddingVertical: 8,
    },
    weekRow: {
      flexDirection: 'row',
    },
    dayCell: {
      flex: 1,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      margin: 2,
      borderRadius: 8,
    },
    dayCellSelected: {
      borderWidth: 2,
      borderColor: colors.accentMint,
    },
    dayCellToday: {
      backgroundColor: colors.bgSecondary,
    },
    dayText: {
      fontSize: 14,
      color: colors.textPrimary,
    },
    dayTextSunday: {
      color: '#EF4444',
    },
    dayTextSaturday: {
      color: '#3B82F6',
    },
    indicators: {
      flexDirection: 'row',
      gap: 3,
      marginTop: 2,
      height: 6,
    },
    indicatorDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    selectedSection: {
      backgroundColor: colors.bgCard,
      marginHorizontal: 12,
      marginTop: 16,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectedHeader: {
      marginBottom: 12,
    },
    selectedDateText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    selectedSummary: {
      flexDirection: 'row',
      gap: 12,
    },
    summaryIncome: {
      fontSize: 14,
      color: colors.accentMint,
      fontWeight: '500',
    },
    summaryExpense: {
      fontSize: 14,
      color: colors.accentCoral,
      fontWeight: '500',
    },
    summarySavings: {
      fontSize: 14,
      color: colors.accentCyan,
      fontWeight: '500',
    },
    transactionList: {
      gap: 8,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    transactionItemLast: {
      borderBottomWidth: 0,
    },
    transactionIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    transactionInfo: {
      flex: 1,
    },
    transactionCategory: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    transactionDate: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    transactionAmount: {
      fontSize: 14,
      fontWeight: '600',
    },
    emptyText: {
      textAlign: 'center',
      color: colors.textMuted,
      paddingVertical: 20,
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 24 }} />
          <View style={styles.monthNav}>
            <TouchableOpacity
              style={[styles.navButton, isPrevMonthDisabled && styles.navButtonDisabled]}
              onPress={onPrevMonth}
              disabled={isPrevMonthDisabled}
            >
              <MaterialIcons name="chevron-left" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {calendarDate.getFullYear()}년 {calendarDate.getMonth() + 1}월
            </Text>
            <TouchableOpacity
              style={[styles.navButton, isNextMonthDisabled && styles.navButtonDisabled]}
              onPress={onNextMonth}
              disabled={isNextMonthDisabled}
            >
              <MaterialIcons name="chevron-right" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView>
          <View style={styles.grid}>
            <View style={styles.dayNames}>
              {DAY_NAMES.map((day, index) => (
                <Text
                  key={day}
                  style={[
                    styles.dayName,
                    index === 0 && styles.dayTextSunday,
                    index === 6 && styles.dayTextSaturday,
                    index !== 0 && index !== 6 && { color: colors.textSecondary },
                  ]}
                >
                  {day}
                </Text>
              ))}
            </View>

            {isLoading ? (
              <ActivityIndicator size="large" color={colors.accentMint} style={{ padding: 40 }} />
            ) : (
              (() => {
                const days = getCalendarDays();
                const weeks: (number | null)[][] = [];
                for (let i = 0; i < days.length; i += 7) {
                  weeks.push(days.slice(i, i + 7));
                }
                const lastWeek = weeks[weeks.length - 1];
                while (lastWeek && lastWeek.length < 7) {
                  lastWeek.push(null);
                }

                return weeks.map((week, weekIndex) => (
                  <View key={weekIndex} style={styles.weekRow}>
                    {week.map((day, dayIndex) => {
                      if (day === null) {
                        return <View key={`empty-${dayIndex}`} style={styles.dayCell} />;
                      }

                      const indicators = getDayIndicators(day);
                      const isSunday = dayIndex === 0;
                      const isSaturday = dayIndex === 6;
                      const holidayDays = getHolidayDaysInMonth(calendarDate.getFullYear(), calendarDate.getMonth() + 1);
                      const isHoliday = holidayDays.has(day);

                      return (
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.dayCell,
                            isToday(day) && styles.dayCellToday,
                            isSelectedDay(day) && styles.dayCellSelected,
                          ]}
                          onPress={() => setSelectedDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day))}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              (isSunday || isHoliday) && styles.dayTextSunday,
                              isSaturday && !isHoliday && styles.dayTextSaturday,
                            ]}
                          >
                            {day}
                          </Text>
                          <View style={styles.indicators}>
                            {indicators.hasIncome && (
                              <View style={[styles.indicatorDot, { backgroundColor: colors.accentMint }]} />
                            )}
                            {indicators.hasExpense && (
                              <View style={[styles.indicatorDot, { backgroundColor: colors.accentCoral }]} />
                            )}
                            {indicators.hasSavings && (
                              <View style={[styles.indicatorDot, { backgroundColor: colors.accentCyan }]} />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ));
              })()
            )}
          </View>

          {selectedDate && (
            <View style={styles.selectedSection}>
              <View style={styles.selectedHeader}>
                <Text style={styles.selectedDateText}>
                  {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
                </Text>
                <View style={styles.selectedSummary}>
                  <Text style={styles.summaryIncome}>
                    +{formatNumber(getSelectedDateSummary().income)}
                  </Text>
                  <Text style={styles.summaryExpense}>
                    -{formatNumber(getSelectedDateSummary().expense)}
                  </Text>
                  <Text style={styles.summarySavings}>
                    -{formatNumber(getSelectedDateSummary().savings)}
                  </Text>
                </View>
              </View>

              <View style={styles.transactionList}>
                {getSelectedDateTransactions().length === 0 ? (
                  <Text style={styles.emptyText}>거래 내역이 없습니다</Text>
                ) : (
                  getSelectedDateTransactions().map((tx, index, arr) => (
                    <View
                      key={tx.id}
                      style={[
                        styles.transactionItem,
                        index === arr.length - 1 && styles.transactionItemLast,
                      ]}
                    >
                      <View
                        style={[
                          styles.transactionIcon,
                          { backgroundColor: tx.savingsGoalId ? colors.accentCyan + '20' : (tx.category?.color || '#6B7280') + '20' },
                        ]}
                      >
                        {tx.savingsGoalId ? (
                          <MaterialIcons name="savings" size={18} color={colors.accentCyan} />
                        ) : tx.category?.icon ? (
                          renderCategoryIcon(tx.category.icon, 18, tx.category.color || '#6B7280')
                        ) : (
                          <MaterialIcons name="attach-money" size={18} color="#6B7280" />
                        )}
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionCategory}>
                          {tx.savingsGoalId ? (tx.description || '저축') : (tx.description || tx.category?.name || '기타')}
                        </Text>
                        <Text style={styles.transactionDate}>
                          {new Date(tx.date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          {tx.savingsGoalId ? ' · 저축' : (tx.category?.name && tx.description ? ` · ${tx.category.name}` : '')}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.transactionAmount,
                          { color: tx.savingsGoalId ? colors.accentCyan : (tx.type === 'INCOME' ? colors.accentMint : colors.accentCoral) },
                        ]}
                      >
                        {tx.savingsGoalId ? '-' : (tx.type === 'INCOME' ? '+' : '-')}₩{formatNumber(tx.amount)}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}
