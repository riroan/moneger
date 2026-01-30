import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { formatNumber } from '@moneger/shared';
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

export interface CategoryForBudget {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  defaultBudget: number | null;
}

interface BudgetEditModalProps {
  visible: boolean;
  category: CategoryForBudget | null;
  year: number;
  month: number;
  currentAmount: number;
  onClose: () => void;
  onSubmit: (amount: number) => void;
  isSubmitting: boolean;
}

export function BudgetEditModal({
  visible,
  category,
  year,
  month,
  currentAmount,
  onClose,
  onSubmit,
  isSubmitting,
}: BudgetEditModalProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (visible && category) {
      setAmount(currentAmount > 0 ? formatNumber(currentAmount) : '');
    }
  }, [visible, category, currentAmount]);

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const handleSubmit = () => {
    const amountNum = parseInt(amount.replace(/,/g, '') || '0', 10);
    onSubmit(amountNum);
  };

  const formatBudgetInput = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    if (!num) return '';
    return parseInt(num, 10).toLocaleString('ko-KR');
  };

  const applyDefaultBudget = () => {
    if (category?.defaultBudget) {
      setAmount(formatNumber(category.defaultBudget));
    }
  };

  const renderCategoryIcon = (iconId: string, size: number = 20, iconColor: string = '#fff') => {
    const iconName = CATEGORY_ICONS[iconId] || CATEGORY_ICONS.money;
    return <MaterialIcons name={iconName} size={size} color={iconColor} />;
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      width: '90%',
      maxWidth: 400,
      backgroundColor: colors.bgCard,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    closeButton: {
      padding: 4,
    },
    categoryCard: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    categoryIcon: {
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
    categoryDate: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    currencySymbol: {
      fontSize: 16,
      color: colors.textSecondary,
      marginRight: 4,
    },
    amountInput: {
      flex: 1,
      fontSize: 16,
      color: colors.textPrimary,
      paddingVertical: 14,
    },
    defaultBudgetButton: {
      backgroundColor: colors.accentMint,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignSelf: 'flex-start',
      marginTop: 8,
    },
    defaultBudgetButtonText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.bgPrimary,
    },
    buttons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    saveButton: {
      flex: 1,
      backgroundColor: colors.accentMint,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.bgPrimary,
    },
  });

  if (!category) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
              <View style={styles.content}>
                <View style={styles.header}>
                  <Text style={styles.title}>예산 설정</Text>
                  <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <View
                      style={[
                        styles.categoryIcon,
                        { backgroundColor: `${category.color || '#888'}20` },
                      ]}
                    >
                      {renderCategoryIcon(
                        category.icon || 'money',
                        20,
                        category.color || '#888'
                      )}
                    </View>
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      <Text style={styles.categoryDate}>
                        {year}년 {month}월 예산
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.inputLabel}>예산 금액</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>₩</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={(text) => setAmount(formatBudgetInput(text))}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>

                {category.defaultBudget && category.defaultBudget > 0 && (
                  <TouchableOpacity
                    style={styles.defaultBudgetButton}
                    onPress={applyDefaultBudget}
                  >
                    <Text style={styles.defaultBudgetButtonText}>
                      기본 예산 적용 (₩{formatNumber(category.defaultBudget)})
                    </Text>
                  </TouchableOpacity>
                )}

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
                    <Text style={styles.saveButtonText}>
                      {isSubmitting ? '저장 중...' : '저장'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}
