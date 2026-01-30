import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
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

const ICON_LIST = Object.keys(CATEGORY_ICONS);

const COLOR_LIST = [
  { name: '빨강', value: '#EF4444' },
  { name: '주황', value: '#F97316' },
  { name: '노랑', value: '#FBBF24' },
  { name: '라임', value: '#84CC16' },
  { name: '초록', value: '#10B981' },
  { name: '청록', value: '#14B8A6' },
  { name: '하늘', value: '#06B6D4' },
  { name: '파랑', value: '#3B82F6' },
  { name: '남색', value: '#6366F1' },
  { name: '보라', value: '#A855F7' },
  { name: '분홍', value: '#EC4899' },
  { name: '회색', value: '#6B7280' },
];

export interface CategoryForEdit {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string | null;
  color: string | null;
  defaultBudget: number | null;
}

interface CategoryEditModalProps {
  visible: boolean;
  mode: 'add' | 'edit';
  categoryType: 'INCOME' | 'EXPENSE';
  category: CategoryForEdit | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    icon: string;
    color: string;
    defaultBudget: number | null;
  }) => void;
  onDelete: () => void;
  isSubmitting: boolean;
}

export function CategoryEditModal({
  visible,
  mode,
  categoryType,
  category,
  onClose,
  onSubmit,
  onDelete,
  isSubmitting,
}: CategoryEditModalProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('money');
  const [color, setColor] = useState('#6366F1');
  const [defaultBudget, setDefaultBudget] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && category) {
        setName(category.name);
        setIcon(category.icon || 'money');
        setColor(category.color || '#6366F1');
        setDefaultBudget(category.defaultBudget ? category.defaultBudget.toString() : '');
      } else {
        setName('');
        setIcon('money');
        setColor('#6366F1');
        setDefaultBudget('');
      }
      setShowDeleteConfirm(false);
    }
  }, [visible, mode, category]);

  const handleClose = () => {
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    const budgetNum = defaultBudget ? parseInt(defaultBudget.replace(/,/g, ''), 10) : null;
    onSubmit({
      name: name.trim(),
      icon,
      color,
      defaultBudget: budgetNum,
    });
  };

  const formatBudgetInput = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    if (!num) return '';
    return parseInt(num, 10).toLocaleString('ko-KR');
  };

  const renderCategoryIcon = (iconId: string, size: number = 20, iconColor: string = '#fff') => {
    const iconName = CATEGORY_ICONS[iconId] || CATEGORY_ICONS.money;
    return <MaterialIcons name={iconName} size={size} color={iconColor} />;
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    content: {
      width: '90%',
      maxWidth: 400,
      maxHeight: '85%',
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
    body: {
      maxHeight: 400,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    textInput: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButtonSelected: {
      backgroundColor: colors.accentMint,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    colorButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorButtonSelected: {
      borderWidth: 3,
      borderColor: '#fff',
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
    deleteConfirmBox: {
      backgroundColor: 'rgba(248, 113, 113, 0.1)',
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      borderWidth: 1,
      borderColor: '#F87171',
    },
    deleteConfirmText: {
      fontSize: 13,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 12,
      lineHeight: 20,
    },
    deleteConfirmButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    deleteConfirmCancel: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
    },
    deleteConfirmCancelText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    deleteConfirmDelete: {
      flex: 1,
      backgroundColor: '#F87171',
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
    },
    deleteConfirmDeleteText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'add' ? '카테고리 추가' : '카테고리 수정'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>카테고리 이름</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="예: 식비, 교통비"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>아이콘</Text>
            <View style={styles.iconGrid}>
              {ICON_LIST.map((iconId) => (
                <TouchableOpacity
                  key={iconId}
                  style={[
                    styles.iconButton,
                    icon === iconId && styles.iconButtonSelected,
                  ]}
                  onPress={() => setIcon(iconId)}
                >
                  {renderCategoryIcon(
                    iconId,
                    20,
                    icon === iconId ? colors.bgPrimary : colors.textSecondary
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>색상</Text>
            <View style={styles.colorGrid}>
              {COLOR_LIST.map((colorItem) => (
                <TouchableOpacity
                  key={colorItem.value}
                  style={[
                    styles.colorButton,
                    { backgroundColor: colorItem.value },
                    color === colorItem.value && styles.colorButtonSelected,
                  ]}
                  onPress={() => setColor(colorItem.value)}
                >
                  {color === colorItem.value && (
                    <MaterialIcons name="check" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {categoryType === 'EXPENSE' && (
              <>
                <Text style={styles.inputLabel}>기본 예산 (선택)</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>₩</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={defaultBudget}
                    onChangeText={(text) => setDefaultBudget(formatBudgetInput(text))}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
              </>
            )}

            {mode === 'edit' && !showDeleteConfirm && (
              <View style={styles.deleteConfirmBox}>
                <Text style={styles.deleteConfirmText}>
                  카테고리를 삭제하시겠습니까?
                </Text>
                <TouchableOpacity
                  style={styles.deleteConfirmDelete}
                  onPress={() => setShowDeleteConfirm(true)}
                >
                  <Text style={styles.deleteConfirmDeleteText}>삭제하기</Text>
                </TouchableOpacity>
              </View>
            )}

            {showDeleteConfirm && (
              <View style={styles.deleteConfirmBox}>
                <Text style={styles.deleteConfirmText}>
                  '{category?.name}' 카테고리를 삭제하시겠습니까?{'\n'}이 작업은 되돌릴 수 없습니다.
                </Text>
                <View style={styles.deleteConfirmButtons}>
                  <TouchableOpacity
                    style={styles.deleteConfirmCancel}
                    onPress={() => setShowDeleteConfirm(false)}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.deleteConfirmCancelText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteConfirmDelete, isSubmitting && styles.saveButtonDisabled]}
                    onPress={onDelete}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.deleteConfirmDeleteText}>
                      {isSubmitting ? '삭제 중...' : '삭제'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
              <Text style={styles.saveButtonText}>
                {isSubmitting ? '저장 중...' : '저장'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
