import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/Colors';
import { transactionApi, categoryApi, Category } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { useRefreshStore } from '../../stores/refreshStore';
import { AMOUNT_LIMITS, formatAmountInput } from '@moneger/shared';
import { getIconName } from '../../constants/Icons';
import ModalContainer from './ModalContainer';

// Fallback mock categories (used when API fails or user is not logged in)
const FALLBACK_CATEGORIES = {
  EXPENSE: [
    { id: '1', name: '식비', icon: 'restaurant', color: '#ff6b6b', type: 'EXPENSE' as const },
    { id: '2', name: '교통', icon: 'car', color: '#60a5fa', type: 'EXPENSE' as const },
    { id: '3', name: '생활용품', icon: 'cart', color: '#a78bfa', type: 'EXPENSE' as const },
    { id: '4', name: '의료/건강', icon: 'hospital', color: '#34d399', type: 'EXPENSE' as const },
    { id: '5', name: '문화/여가', icon: 'movie', color: '#fbbf24', type: 'EXPENSE' as const },
    { id: '6', name: '기타', icon: 'box', color: '#9ca3af', type: 'EXPENSE' as const },
  ],
  INCOME: [
    { id: '7', name: '급여', icon: 'money', color: '#4ade80', type: 'INCOME' as const },
    { id: '8', name: '부수입', icon: 'star', color: '#fbbf24', type: 'INCOME' as const },
    { id: '9', name: '용돈', icon: 'gift', color: '#f472b6', type: 'INCOME' as const },
    { id: '10', name: '기타', icon: 'box', color: '#9ca3af', type: 'INCOME' as const },
  ],
};

interface TransactionAddModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function TransactionAddModal({
  visible,
  onClose,
}: TransactionAddModalProps) {
  const { theme } = useThemeStore();
  const { userId } = useAuthStore();
  const { showToast } = useToast();
  const { triggerRefresh } = useRefreshStore();
  const colors = Colors[theme];

  // Form state
  const [transactionType, setTransactionType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountExceeded, setAmountExceeded] = useState(false);

  // Categories from API
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);

  // Fetch categories from API
  const fetchCategories = useCallback(async () => {
    if (!userId) return;

    setIsCategoriesLoading(true);
    const result = await categoryApi.getAll(userId);
    if (result.success && result.data) {
      setAllCategories(result.data);
    }
    setIsCategoriesLoading(false);
  }, [userId]);

  // Fetch categories when modal opens
  useEffect(() => {
    if (visible && userId) {
      fetchCategories();
    }
  }, [visible, userId, fetchCategories]);

  const resetForm = () => {
    setTransactionType('EXPENSE');
    setDescription('');
    setAmount('');
    setSelectedCategory(null);
    setIsCategoryDropdownOpen(false);
    setAmountExceeded(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!userId) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    // Parse amount (remove commas)
    const numericAmount = parseInt(amount.replace(/,/g, ''), 10);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showToast('올바른 금액을 입력해주세요.', 'error');
      return;
    }

    setIsSubmitting(true);

    // 현재 시간을 ISO 형식으로 (날짜 + 시간 포함)
    const now = new Date();

    const requestData = {
      userId,
      amount: numericAmount,
      type: transactionType,
      description: description.trim() || undefined,
      date: now.toISOString(),
      categoryId: selectedCategory || undefined,
    };

    const result = await transactionApi.create(requestData);

    setIsSubmitting(false);

    if (result.success) {
      handleClose();
      showToast('내역이 추가되었습니다.', 'success');
      triggerRefresh();
    } else {
      showToast(result.error || '내역 추가에 실패했습니다.', 'error');
    }
  };

  const handleAmountChange = (text: string) => {
    const result = formatAmountInput(text, AMOUNT_LIMITS.TRANSACTION_MAX);
    setAmount(result.value);
    setAmountExceeded(result.exceeded);
  };

  // Use API categories if available, otherwise fallback to mock
  const expenseCategories = allCategories.filter(c => c.type === 'EXPENSE');
  const incomeCategories = allCategories.filter(c => c.type === 'INCOME');
  const categories = transactionType === 'EXPENSE'
    ? (expenseCategories.length > 0 ? expenseCategories : FALLBACK_CATEGORIES.EXPENSE)
    : (incomeCategories.length > 0 ? incomeCategories : FALLBACK_CATEGORIES.INCOME);

  const isFormValid = description.trim() && amount && selectedCategory;

  const styles = StyleSheet.create({
    // Type toggle
    typeToggle: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    typeButton: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    typeButtonInner: {
      flexDirection: 'row',
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      gap: 6,
    },
    typeButtonGradient: {
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },
    typeButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    typeButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    typeButtonTextActive: {
      color: '#fff',
    },
    // Form fields
    fieldContainer: {
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
    },
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
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    currencySymbol: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textMuted,
      marginRight: 8,
    },
    amountInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    amountInputContainerExceeded: {
      borderColor: '#F87171',
      borderWidth: 2,
    },
    amountExceededText: {
      fontSize: 12,
      color: '#F87171',
      marginTop: 6,
    },
    // Category Dropdown
    categoryDropdown: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryDropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    categoryDropdownTriggerText: {
      fontSize: 15,
      color: colors.textMuted,
    },
    categoryDropdownSelected: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    categoryDropdownSelectedText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    categoryDropdownList: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      maxHeight: 200,
    },
    categoryDropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    categoryDropdownItemSelected: {
      backgroundColor: 'rgba(52, 211, 153, 0.1)',
    },
    categoryDropdownItemText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    categoryDropdownItemTextSelected: {
      color: colors.accentMint,
      fontWeight: '500',
    },
    // Action buttons
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    submitButton: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    submitButtonGradient: {
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
  });

  const footer = (
    <View style={styles.actionButtons}>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleClose}
        disabled={isSubmitting}
      >
        <Text style={styles.cancelButtonText}>취소</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.submitButton,
          (!isFormValid || isSubmitting) && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!isFormValid || isSubmitting}
      >
        <LinearGradient
          colors={transactionType === 'EXPENSE'
            ? ['#F87171', '#FBBF24']
            : ['#34D399', '#60A5FA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.submitButtonGradient}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>추가</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <ModalContainer
      visible={visible}
      onClose={handleClose}
      title="내역 추가"
      footer={footer}
    >
      {/* Type Toggle */}
      <View style={styles.typeToggle}>
        <TouchableOpacity
          style={styles.typeButton}
          onPress={() => {
            setTransactionType('EXPENSE');
            setSelectedCategory(null);
          }}
        >
          {transactionType === 'EXPENSE' ? (
            <LinearGradient
              colors={['#F87171', '#FBBF24']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.typeButtonGradient}
            >
              <View style={styles.typeButtonContent}>
                <MaterialIcons name="trending-down" size={18} color="#fff" />
                <Text style={[styles.typeButtonText, styles.typeButtonTextActive]}>
                  지출
                </Text>
              </View>
            </LinearGradient>
          ) : (
            <View style={styles.typeButtonInner}>
              <MaterialIcons name="trending-down" size={18} color={colors.textSecondary} />
              <Text style={styles.typeButtonText}>지출</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.typeButton}
          onPress={() => {
            setTransactionType('INCOME');
            setSelectedCategory(null);
          }}
        >
          {transactionType === 'INCOME' ? (
            <LinearGradient
              colors={['#34D399', '#60A5FA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.typeButtonGradient}
            >
              <View style={styles.typeButtonContent}>
                <MaterialIcons name="trending-up" size={18} color="#fff" />
                <Text style={[styles.typeButtonText, styles.typeButtonTextActive]}>
                  수입
                </Text>
              </View>
            </LinearGradient>
          ) : (
            <View style={styles.typeButtonInner}>
              <MaterialIcons name="trending-up" size={18} color={colors.textSecondary} />
              <Text style={styles.typeButtonText}>수입</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Description */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>내용</Text>
        <TextInput
          style={styles.textInput}
          placeholder="예: 점심 식사, 월급 등"
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
        />
      </View>

      {/* Amount */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>금액</Text>
        <View style={[styles.amountInputContainer, amountExceeded && styles.amountInputContainerExceeded]}>
          <Text style={styles.currencySymbol}>₩</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            value={amount}
            onChangeText={handleAmountChange}
            keyboardType="numeric"
          />
        </View>
        {amountExceeded && (
          <Text style={styles.amountExceededText}>
            1000억 원을 초과할 수 없습니다.
          </Text>
        )}
      </View>

      {/* Category Dropdown */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>카테고리</Text>
        <View style={styles.categoryDropdown}>
          <TouchableOpacity
            style={styles.categoryDropdownTrigger}
            onPress={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            disabled={isCategoriesLoading}
          >
            {isCategoriesLoading ? (
              <View style={styles.categoryDropdownSelected}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={[styles.categoryDropdownTriggerText, { marginLeft: 8 }]}>
                  로딩 중...
                </Text>
              </View>
            ) : selectedCategory ? (
              <View style={styles.categoryDropdownSelected}>
                <MaterialIcons
                  name={getIconName(categories.find(c => c.id === selectedCategory)?.icon)}
                  size={18}
                  color={categories.find(c => c.id === selectedCategory)?.color || colors.textPrimary}
                />
                <Text style={styles.categoryDropdownSelectedText}>
                  {categories.find(c => c.id === selectedCategory)?.name}
                </Text>
              </View>
            ) : (
              <Text style={styles.categoryDropdownTriggerText}>
                카테고리 선택
              </Text>
            )}
            <MaterialIcons
              name={isCategoryDropdownOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
          {isCategoryDropdownOpen && !isCategoriesLoading && (
            <ScrollView style={styles.categoryDropdownList} nestedScrollEnabled>
              {categories.map((cat, index) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryDropdownItem,
                    selectedCategory === cat.id && styles.categoryDropdownItemSelected,
                    index === categories.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat.id);
                    setIsCategoryDropdownOpen(false);
                  }}
                >
                  <MaterialIcons name={getIconName(cat.icon)} size={20} color={cat.color} />
                  <Text
                    style={[
                      styles.categoryDropdownItemText,
                      selectedCategory === cat.id && styles.categoryDropdownItemTextSelected,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </ModalContainer>
  );
}
