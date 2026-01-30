import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { getIconName } from '../../constants/Icons';
import { AMOUNT_LIMITS } from '@moneger/shared';
import { Category } from '../../lib/api';

export type FilterType = 'ALL' | 'INCOME' | 'EXPENSE' | 'SAVINGS';

export interface DateRange {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

export interface AmountRange {
  minAmount: number | null;
  maxAmount: number | null;
}

export interface FilterState {
  filterType: FilterType;
  isDateFilterEnabled: boolean;
  dateRange: DateRange | null;
  isAmountFilterEnabled: boolean;
  amountRange: AmountRange | null;
  selectedCategories: string[];
}

interface FilterModalProps {
  visible: boolean;
  categories: { INCOME: Category[]; EXPENSE: Category[] };
  initialState: FilterState;
  onClose: () => void;
  onApply: (state: FilterState) => void;
}

export function FilterModal({
  visible,
  categories,
  initialState,
  onClose,
  onApply,
}: FilterModalProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Draft state
  const [draftFilterType, setDraftFilterType] = useState<FilterType>(initialState.filterType);
  const [draftIsDateFilterEnabled, setDraftIsDateFilterEnabled] = useState(initialState.isDateFilterEnabled);
  const [draftDateRange, setDraftDateRange] = useState<DateRange | null>(initialState.dateRange);
  const [draftIsAmountFilterEnabled, setDraftIsAmountFilterEnabled] = useState(initialState.isAmountFilterEnabled);
  const [draftAmountRange, setDraftAmountRange] = useState<AmountRange | null>(initialState.amountRange);
  const [draftMinAmountInput, setDraftMinAmountInput] = useState(
    initialState.amountRange?.minAmount?.toLocaleString('ko-KR') || ''
  );
  const [draftMaxAmountInput, setDraftMaxAmountInput] = useState(
    initialState.amountRange?.maxAmount?.toLocaleString('ko-KR') || ''
  );
  const [draftSelectedCategories, setDraftSelectedCategories] = useState<string[]>([...initialState.selectedCategories]);

  // Dropdown states
  const [activeDropdown, setActiveDropdown] = useState<'startYear' | 'startMonth' | 'endYear' | 'endMonth' | null>(null);
  const [isIncomeCategoryOpen, setIsIncomeCategoryOpen] = useState(true);
  const [isExpenseCategoryOpen, setIsExpenseCategoryOpen] = useState(true);

  // Reset draft to initial when modal opens
  React.useEffect(() => {
    if (visible) {
      setDraftFilterType(initialState.filterType);
      setDraftIsDateFilterEnabled(initialState.isDateFilterEnabled);
      setDraftDateRange(initialState.dateRange);
      setDraftIsAmountFilterEnabled(initialState.isAmountFilterEnabled);
      setDraftAmountRange(initialState.amountRange);
      setDraftMinAmountInput(initialState.amountRange?.minAmount?.toLocaleString('ko-KR') || '');
      setDraftMaxAmountInput(initialState.amountRange?.maxAmount?.toLocaleString('ko-KR') || '');
      setDraftSelectedCategories([...initialState.selectedCategories]);
      setActiveDropdown(null);
    }
  }, [visible, initialState]);

  const handleDateFilterToggle = (enabled: boolean) => {
    setDraftIsDateFilterEnabled(enabled);
    if (enabled) {
      setDraftDateRange({
        startYear: currentYear,
        startMonth: currentMonth,
        endYear: currentYear,
        endMonth: currentMonth,
      });
    } else {
      setDraftDateRange(null);
    }
  };

  const handleAmountFilterToggle = (enabled: boolean) => {
    setDraftIsAmountFilterEnabled(enabled);
    if (enabled) {
      setDraftAmountRange({ minAmount: null, maxAmount: null });
    } else {
      setDraftAmountRange(null);
      setDraftMinAmountInput('');
      setDraftMaxAmountInput('');
    }
  };

  const handleAmountInputChange = (type: 'min' | 'max', value: string) => {
    const rawValue = value.replace(/,/g, '');
    if (rawValue === '') {
      if (type === 'min') {
        setDraftMinAmountInput('');
        setDraftAmountRange(prev => prev ? { ...prev, minAmount: null } : null);
      } else {
        setDraftMaxAmountInput('');
        setDraftAmountRange(prev => prev ? { ...prev, maxAmount: null } : null);
      }
      return;
    }
    if (!/^\d+$/.test(rawValue)) return;
    const numValue = Math.min(parseInt(rawValue), AMOUNT_LIMITS.TRANSACTION_MAX);
    const formatted = numValue.toLocaleString('ko-KR');
    if (type === 'min') {
      setDraftMinAmountInput(formatted);
      setDraftAmountRange(prev => prev ? { ...prev, minAmount: numValue } : null);
    } else {
      setDraftMaxAmountInput(formatted);
      setDraftAmountRange(prev => prev ? { ...prev, maxAmount: numValue } : null);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setDraftSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleReset = () => {
    setDraftFilterType('ALL');
    setDraftIsDateFilterEnabled(false);
    setDraftDateRange(null);
    setDraftIsAmountFilterEnabled(false);
    setDraftAmountRange(null);
    setDraftMinAmountInput('');
    setDraftMaxAmountInput('');
    setDraftSelectedCategories([]);
    setActiveDropdown(null);
  };

  const handleApply = () => {
    onApply({
      filterType: draftFilterType,
      isDateFilterEnabled: draftIsDateFilterEnabled,
      dateRange: draftDateRange,
      isAmountFilterEnabled: draftIsAmountFilterEnabled,
      amountRange: draftAmountRange,
      selectedCategories: draftSelectedCategories,
    });
    onClose();
  };

  const yearOptions = [];
  for (let y = 2020; y <= currentYear; y++) {
    yearOptions.push(y);
  }
  const monthOptions = Array.from({ length: 12 }, (_, i) => i);

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    content: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: '85%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    body: {
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    toggleLabel: {
      fontSize: 12,
      color: colors.textMuted,
    },
    typeRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    typeOption: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.bgSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeOptionActive: {
      borderColor: colors.accentMint,
    },
    typeOptionText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    typeOptionTextActive: {
      color: '#fff',
    },
    filterContent: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 16,
    },
    filterRow: {
      marginBottom: 12,
    },
    filterRowLast: {
      marginBottom: 0,
    },
    filterLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 8,
    },
    filterInputRow: {
      flexDirection: 'row',
      gap: 8,
    },
    filterSelect: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.bgCard,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    filterSelectActive: {
      borderColor: colors.accentMint,
    },
    filterSelectText: {
      fontSize: 14,
      color: colors.textPrimary,
    },
    dropdownList: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: 4,
      backgroundColor: colors.bgCard,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      zIndex: 100,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    dropdownItem: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownItemActive: {
      backgroundColor: colors.accentMint + '20',
    },
    dropdownItemText: {
      fontSize: 14,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    dropdownItemTextActive: {
      color: colors.accentMint,
      fontWeight: '600',
    },
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
    },
    amountPrefix: {
      fontSize: 14,
      color: colors.textMuted,
      marginRight: 4,
    },
    amountInput: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.textPrimary,
      textAlign: 'right',
    },
    categoryAccordion: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 8,
    },
    categoryAccordionLast: {
      marginBottom: 0,
    },
    categoryAccordionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
    },
    categoryAccordionTitle: {
      fontSize: 14,
      fontWeight: '500',
    },
    categoryAccordionCount: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: 'normal',
    },
    categoryList: {
      paddingHorizontal: 8,
      paddingBottom: 8,
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: 8,
      padding: 10,
      marginBottom: 4,
    },
    categoryItemLast: {
      marginBottom: 0,
    },
    categoryCheckbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.border,
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryCheckboxActive: {
      backgroundColor: colors.accentMint,
      borderColor: colors.accentMint,
    },
    categoryItemName: {
      fontSize: 14,
      color: colors.textPrimary,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
      paddingTop: 0,
    },
    resetButton: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    resetButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    applyButton: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    applyButtonGradient: {
      paddingVertical: 14,
      alignItems: 'center',
    },
    applyButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
  });

  const filterTypeOptions = [
    { value: 'ALL', label: '전체', gradient: ['#34D399', '#60A5FA'] },
    { value: 'INCOME', label: '수입', gradient: ['#34D399', '#4ade80'] },
    { value: 'EXPENSE', label: '지출', gradient: ['#F87171', '#FBBF24'] },
    { value: 'SAVINGS', label: '저축', gradient: ['#60A5FA', '#A78BFA'] },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>필터</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={() => setActiveDropdown(null)}
          >
            {/* Transaction Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>거래 유형</Text>
              <View style={styles.typeRow}>
                {filterTypeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.typeOption,
                      draftFilterType === option.value && styles.typeOptionActive,
                    ]}
                    onPress={() => setDraftFilterType(option.value as FilterType)}
                  >
                    {draftFilterType === option.value && (
                      <LinearGradient
                        colors={option.gradient as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <Text
                      style={[
                        styles.typeOptionText,
                        draftFilterType === option.value && styles.typeOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date Filter */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>기간</Text>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>사용</Text>
                  <Switch
                    value={draftIsDateFilterEnabled}
                    onValueChange={handleDateFilterToggle}
                    trackColor={{ false: colors.border, true: colors.accentMint }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
              {draftIsDateFilterEnabled && draftDateRange && (
                <View style={styles.filterContent}>
                  {/* Start Date */}
                  <View style={[styles.filterRow, { zIndex: 20 }]}>
                    <Text style={styles.filterLabel}>시작</Text>
                    <View style={styles.filterInputRow}>
                      <View style={{ flex: 1, zIndex: activeDropdown === 'startYear' ? 10 : 1 }}>
                        <TouchableOpacity
                          style={[styles.filterSelect, activeDropdown === 'startYear' && styles.filterSelectActive]}
                          onPress={() => setActiveDropdown(activeDropdown === 'startYear' ? null : 'startYear')}
                        >
                          <Text style={styles.filterSelectText}>{draftDateRange.startYear}년</Text>
                          <MaterialIcons
                            name={activeDropdown === 'startYear' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                            size={18}
                            color={colors.textMuted}
                          />
                        </TouchableOpacity>
                        {activeDropdown === 'startYear' && (
                          <View style={styles.dropdownList}>
                            <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                              {yearOptions.map((year) => (
                                <TouchableOpacity
                                  key={year}
                                  style={[styles.dropdownItem, draftDateRange.startYear === year && styles.dropdownItemActive]}
                                  onPress={() => {
                                    setDraftDateRange({ ...draftDateRange, startYear: year });
                                    setActiveDropdown(null);
                                  }}
                                >
                                  <Text style={[styles.dropdownItemText, draftDateRange.startYear === year && styles.dropdownItemTextActive]}>
                                    {year}년
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1, zIndex: activeDropdown === 'startMonth' ? 10 : 1 }}>
                        <TouchableOpacity
                          style={[styles.filterSelect, activeDropdown === 'startMonth' && styles.filterSelectActive]}
                          onPress={() => setActiveDropdown(activeDropdown === 'startMonth' ? null : 'startMonth')}
                        >
                          <Text style={styles.filterSelectText}>{draftDateRange.startMonth + 1}월</Text>
                          <MaterialIcons
                            name={activeDropdown === 'startMonth' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                            size={18}
                            color={colors.textMuted}
                          />
                        </TouchableOpacity>
                        {activeDropdown === 'startMonth' && (
                          <View style={styles.dropdownList}>
                            <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                              {monthOptions.map((month) => (
                                <TouchableOpacity
                                  key={month}
                                  style={[styles.dropdownItem, draftDateRange.startMonth === month && styles.dropdownItemActive]}
                                  onPress={() => {
                                    setDraftDateRange({ ...draftDateRange, startMonth: month });
                                    setActiveDropdown(null);
                                  }}
                                >
                                  <Text style={[styles.dropdownItemText, draftDateRange.startMonth === month && styles.dropdownItemTextActive]}>
                                    {month + 1}월
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  {/* End Date */}
                  <View style={[styles.filterRow, styles.filterRowLast, { zIndex: 10 }]}>
                    <Text style={styles.filterLabel}>종료</Text>
                    <View style={styles.filterInputRow}>
                      <View style={{ flex: 1, zIndex: activeDropdown === 'endYear' ? 10 : 1 }}>
                        <TouchableOpacity
                          style={[styles.filterSelect, activeDropdown === 'endYear' && styles.filterSelectActive]}
                          onPress={() => setActiveDropdown(activeDropdown === 'endYear' ? null : 'endYear')}
                        >
                          <Text style={styles.filterSelectText}>{draftDateRange.endYear}년</Text>
                          <MaterialIcons
                            name={activeDropdown === 'endYear' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                            size={18}
                            color={colors.textMuted}
                          />
                        </TouchableOpacity>
                        {activeDropdown === 'endYear' && (
                          <View style={styles.dropdownList}>
                            <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                              {yearOptions.map((year) => (
                                <TouchableOpacity
                                  key={year}
                                  style={[styles.dropdownItem, draftDateRange.endYear === year && styles.dropdownItemActive]}
                                  onPress={() => {
                                    setDraftDateRange({ ...draftDateRange, endYear: year });
                                    setActiveDropdown(null);
                                  }}
                                >
                                  <Text style={[styles.dropdownItemText, draftDateRange.endYear === year && styles.dropdownItemTextActive]}>
                                    {year}년
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1, zIndex: activeDropdown === 'endMonth' ? 10 : 1 }}>
                        <TouchableOpacity
                          style={[styles.filterSelect, activeDropdown === 'endMonth' && styles.filterSelectActive]}
                          onPress={() => setActiveDropdown(activeDropdown === 'endMonth' ? null : 'endMonth')}
                        >
                          <Text style={styles.filterSelectText}>{draftDateRange.endMonth + 1}월</Text>
                          <MaterialIcons
                            name={activeDropdown === 'endMonth' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                            size={18}
                            color={colors.textMuted}
                          />
                        </TouchableOpacity>
                        {activeDropdown === 'endMonth' && (
                          <View style={styles.dropdownList}>
                            <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                              {monthOptions.map((month) => (
                                <TouchableOpacity
                                  key={month}
                                  style={[styles.dropdownItem, draftDateRange.endMonth === month && styles.dropdownItemActive]}
                                  onPress={() => {
                                    setDraftDateRange({ ...draftDateRange, endMonth: month });
                                    setActiveDropdown(null);
                                  }}
                                >
                                  <Text style={[styles.dropdownItemText, draftDateRange.endMonth === month && styles.dropdownItemTextActive]}>
                                    {month + 1}월
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Amount Filter */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>금액 범위</Text>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>사용</Text>
                  <Switch
                    value={draftIsAmountFilterEnabled}
                    onValueChange={handleAmountFilterToggle}
                    trackColor={{ false: colors.border, true: colors.accentMint }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
              {draftIsAmountFilterEnabled && (
                <View style={styles.filterContent}>
                  <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>최소 금액</Text>
                    <View style={styles.amountInputContainer}>
                      <Text style={styles.amountPrefix}>₩</Text>
                      <TextInput
                        style={styles.amountInput}
                        value={draftMinAmountInput}
                        onChangeText={(v) => handleAmountInputChange('min', v)}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <View style={[styles.filterRow, styles.filterRowLast]}>
                    <Text style={styles.filterLabel}>최대 금액</Text>
                    <View style={styles.amountInputContainer}>
                      <Text style={styles.amountPrefix}>₩</Text>
                      <TextInput
                        style={styles.amountInput}
                        value={draftMaxAmountInput}
                        onChangeText={(v) => handleAmountInputChange('max', v)}
                        placeholder="최대 1000억"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Category Filter */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  카테고리 {draftSelectedCategories.length > 0 && (
                    <Text style={{ color: colors.accentMint }}>({draftSelectedCategories.length})</Text>
                  )}
                </Text>
              </View>

              {/* Income Categories */}
              {(draftFilterType === 'ALL' || draftFilterType === 'INCOME') && categories.INCOME.length > 0 && (
                <View style={styles.categoryAccordion}>
                  <TouchableOpacity
                    style={styles.categoryAccordionHeader}
                    onPress={() => setIsIncomeCategoryOpen(!isIncomeCategoryOpen)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialIcons name="trending-up" size={16} color={colors.accentMint} style={{ marginRight: 6 }} />
                      <Text style={[styles.categoryAccordionTitle, { color: colors.accentMint }]}>
                        수입{' '}
                        <Text style={styles.categoryAccordionCount}>({categories.INCOME.length})</Text>
                      </Text>
                    </View>
                    <MaterialIcons
                      name={isIncomeCategoryOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                      size={18}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                  {isIncomeCategoryOpen && (
                    <View style={styles.categoryList}>
                      {categories.INCOME.map((cat, index) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.categoryItem,
                            index === categories.INCOME.length - 1 && styles.categoryItemLast,
                          ]}
                          onPress={() => toggleCategory(cat.id)}
                        >
                          <View
                            style={[
                              styles.categoryCheckbox,
                              draftSelectedCategories.includes(cat.id) && styles.categoryCheckboxActive,
                            ]}
                          >
                            {draftSelectedCategories.includes(cat.id) && (
                              <MaterialIcons name="check" size={14} color="#fff" />
                            )}
                          </View>
                          <MaterialIcons name={getIconName(cat.icon)} size={16} color={cat.color} style={{ marginRight: 8 }} />
                          <Text style={styles.categoryItemName}>{cat.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Expense Categories */}
              {(draftFilterType === 'ALL' || draftFilterType === 'EXPENSE') && categories.EXPENSE.length > 0 && (
                <View style={[styles.categoryAccordion, styles.categoryAccordionLast]}>
                  <TouchableOpacity
                    style={styles.categoryAccordionHeader}
                    onPress={() => setIsExpenseCategoryOpen(!isExpenseCategoryOpen)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialIcons name="trending-down" size={16} color={colors.accentCoral} style={{ marginRight: 6 }} />
                      <Text style={[styles.categoryAccordionTitle, { color: colors.accentCoral }]}>
                        지출{' '}
                        <Text style={styles.categoryAccordionCount}>({categories.EXPENSE.length})</Text>
                      </Text>
                    </View>
                    <MaterialIcons
                      name={isExpenseCategoryOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                      size={18}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                  {isExpenseCategoryOpen && (
                    <View style={styles.categoryList}>
                      {categories.EXPENSE.map((cat, index) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.categoryItem,
                            index === categories.EXPENSE.length - 1 && styles.categoryItemLast,
                          ]}
                          onPress={() => toggleCategory(cat.id)}
                        >
                          <View
                            style={[
                              styles.categoryCheckbox,
                              draftSelectedCategories.includes(cat.id) && styles.categoryCheckboxActive,
                            ]}
                          >
                            {draftSelectedCategories.includes(cat.id) && (
                              <MaterialIcons name="check" size={14} color="#fff" />
                            )}
                          </View>
                          <MaterialIcons name={getIconName(cat.icon)} size={16} color={cat.color} style={{ marginRight: 8 }} />
                          <Text style={styles.categoryItemName}>{cat.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>초기화</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <LinearGradient
                colors={['#34D399', '#60A5FA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.applyButtonGradient}
              >
                <Text style={styles.applyButtonText}>적용</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
