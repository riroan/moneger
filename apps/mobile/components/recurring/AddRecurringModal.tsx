import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { formatAmountInput, AMOUNT_LIMITS } from '@moneger/shared';
import CategoryDropdown from '../common/CategoryDropdown';
import { categoryApi, type CategoryWithBudget } from '../../lib/api';

interface AddRecurringModalProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onSubmit: (data: {
    description: string;
    amount: number;
    dayOfMonth: number;
    categoryId: string | null;
  }) => void;
  isSubmitting: boolean;
}

export function AddRecurringModal({
  visible,
  userId,
  onClose,
  onSubmit,
  isSubmitting,
}: AddRecurringModalProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryWithBudget[]>([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isDayPickerOpen, setIsDayPickerOpen] = useState(false);
  const [exceeded, setExceeded] = useState(false);
  const [descriptionError, setDescriptionError] = useState('');
  const [amountError, setAmountError] = useState('');

  useEffect(() => {
    if (!visible || !userId) return;
    categoryApi.getAll(userId).then((res) => {
      if (res.success && res.data) setCategories(res.data);
    });
  }, [visible, userId]);

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setDayOfMonth(1);
    setCategoryId(null);
    setExceeded(false);
    setDescriptionError('');
    setAmountError('');
    setIsCategoryDropdownOpen(false);
    setIsDayPickerOpen(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    let hasError = false;
    if (!description.trim()) {
      setDescriptionError('설명을 입력해주세요');
      hasError = true;
    }
    const parsed = parseInt(amount.replace(/,/g, '') || '0', 10);
    if (parsed <= 0) {
      setAmountError('금액을 입력해주세요');
      hasError = true;
    }
    if (hasError) return;

    onSubmit({
      description: description.trim(),
      amount: parsed,
      dayOfMonth,
      categoryId,
    });
  };

  const handleAmountChange = (text: string) => {
    const result = formatAmountInput(text, AMOUNT_LIMITS.TRANSACTION_MAX);
    setAmount(result.value);
    setExceeded(result.exceeded);
    if (result.value && parseInt(result.value, 10) > 0) setAmountError('');
  };

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    backdrop: { ...StyleSheet.absoluteFillObject },
    content: {
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      width: '90%',
      maxWidth: 400,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
    closeButton: { padding: 4 },
    body: { padding: 20 },
    label: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
      marginTop: 16,
    },
    labelFirst: { marginTop: 0 },
    textInput: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textInputError: { borderColor: colors.accentCoral },
    errorText: { fontSize: 12, color: colors.accentCoral, marginTop: 6 },
    amountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    amountContainerError: { borderColor: colors.accentCoral },
    currencySymbol: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textMuted,
      marginRight: 8,
    },
    amountInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.textPrimary,
    },
    daySelector: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    daySelectorText: { fontSize: 15, color: colors.textPrimary },
    dayList: {
      maxHeight: 200,
      marginTop: 8,
      borderRadius: 12,
      backgroundColor: colors.bgSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dayItem: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dayItemSelected: { backgroundColor: colors.bgCardHover },
    dayItemText: { fontSize: 14, color: colors.textPrimary },
    dayItemTextSelected: { color: colors.accentCoral, fontWeight: '600' },
    buttons: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
      paddingTop: 0,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    saveButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accentCoral,
      alignItems: 'center',
    },
    saveButtonDisabled: { opacity: 0.5 },
    saveButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>고정비 추가</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            <Text style={[styles.label, styles.labelFirst]}>설명</Text>
            <TextInput
              style={[styles.textInput, descriptionError ? styles.textInputError : null]}
              value={description}
              onChangeText={(t) => {
                setDescription(t);
                if (t.trim()) setDescriptionError('');
              }}
              placeholder="예: 월세, Netflix, 보험료"
              placeholderTextColor={colors.textMuted}
            />
            {!!descriptionError && <Text style={styles.errorText}>{descriptionError}</Text>}

            <Text style={styles.label}>금액</Text>
            <View
              style={[
                styles.amountContainer,
                (amountError || exceeded) && styles.amountContainerError,
              ]}
            >
              <Text style={styles.currencySymbol}>₩</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
            {!!amountError && <Text style={styles.errorText}>{amountError}</Text>}
            {exceeded && (
              <Text style={styles.errorText}>1000억 원을 초과할 수 없습니다.</Text>
            )}

            <Text style={styles.label}>지출일</Text>
            <TouchableOpacity
              style={styles.daySelector}
              onPress={() => setIsDayPickerOpen(!isDayPickerOpen)}
            >
              <Text style={styles.daySelectorText}>매월 {dayOfMonth}일</Text>
              <MaterialIcons
                name={isDayPickerOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            {isDayPickerOpen && (
              <ScrollView style={styles.dayList} nestedScrollEnabled>
                {days.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayItem, dayOfMonth === d && styles.dayItemSelected]}
                    onPress={() => {
                      setDayOfMonth(d);
                      setIsDayPickerOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dayItemText,
                        dayOfMonth === d && styles.dayItemTextSelected,
                      ]}
                    >
                      {d}일
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={styles.label}>카테고리 (선택)</Text>
            <CategoryDropdown
              categories={expenseCategories.map((c) => ({
                id: c.id,
                name: c.name,
                icon: c.icon,
                color: c.color,
                type: c.type,
              }))}
              selectedId={categoryId}
              onSelect={(id) => setCategoryId(id || null)}
              isOpen={isCategoryDropdownOpen}
              onToggle={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              placeholder="카테고리 선택 (선택)"
            />

            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.saveButtonText}>{isSubmitting ? '저장 중...' : '추가'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
