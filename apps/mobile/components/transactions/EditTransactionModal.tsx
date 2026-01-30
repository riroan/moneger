import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { getIconName } from '../../constants/Icons';
import { AMOUNT_LIMITS } from '@moneger/shared';
import { Category } from '../../lib/api';

interface TransactionData {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string | null;
  categoryId: string | null;
  category?: {
    name: string;
    icon: string | null;
    color: string | null;
  };
}

interface EditTransactionModalProps {
  visible: boolean;
  transaction: TransactionData | null;
  categories: Category[];
  isCategoriesLoading: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    categoryId: string | null;
  }) => void;
  onDelete: () => void;
}

export function EditTransactionModal({
  visible,
  transaction,
  categories,
  isCategoriesLoading,
  isSubmitting,
  onClose,
  onSubmit,
  onDelete,
}: EditTransactionModalProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;

  // Form state
  const [editType, setEditType] = React.useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [editDescription, setEditDescription] = React.useState('');
  const [editAmount, setEditAmount] = React.useState('');
  const [editAmountExceeded, setEditAmountExceeded] = React.useState(false);
  const [editCategoryId, setEditCategoryId] = React.useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  // Drag to dismiss
  const translateY = useRef(new Animated.Value(0)).current;
  const DISMISS_THRESHOLD = 120;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DISMISS_THRESHOLD) {
          Animated.timing(translateY, {
            toValue: screenHeight,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            handleClose();
            translateY.setValue(0);
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  // Initialize form when transaction changes
  React.useEffect(() => {
    if (transaction) {
      setEditType(transaction.type);
      setEditDescription(transaction.description || '');
      setEditAmount(transaction.amount.toLocaleString('ko-KR'));
      setEditAmountExceeded(false);
      setEditCategoryId(transaction.categoryId);
      setIsDropdownOpen(false);
      setShowDeleteConfirm(false);
    }
  }, [transaction]);

  const handleClose = () => {
    setShowDeleteConfirm(false);
    setEditAmountExceeded(false);
    translateY.setValue(0);
    onClose();
  };

  const handleAmountChange = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    if (!numericValue) {
      setEditAmount('');
      setEditAmountExceeded(false);
      return;
    }
    const num = Number(numericValue);
    if (num > AMOUNT_LIMITS.TRANSACTION_MAX) {
      setEditAmount(AMOUNT_LIMITS.TRANSACTION_MAX.toLocaleString('ko-KR'));
      setEditAmountExceeded(true);
    } else {
      setEditAmount(num.toLocaleString('ko-KR'));
      setEditAmountExceeded(false);
    }
  };

  const handleSubmit = () => {
    const numericAmount = parseInt(editAmount.replace(/,/g, ''), 10);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return;
    }
    onSubmit({
      type: editType,
      amount: numericAmount,
      description: editDescription.trim(),
      categoryId: editCategoryId,
    });
  };

  const editCategories = useMemo(() => {
    return categories.filter(c => c.type === editType);
  }, [categories, editType]);

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
      paddingBottom: insets.bottom + 20,
      width: '100%',
    },
    handleContainer: {
      width: '100%',
      alignItems: 'center',
      paddingVertical: 12,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    body: {
      paddingHorizontal: 20,
    },
    typeIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      marginBottom: 20,
    },
    typeText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
      marginLeft: 8,
    },
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
    amountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    amountContainerExceeded: {
      borderColor: '#F87171',
      borderWidth: 2,
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
    exceededText: {
      fontSize: 12,
      color: '#F87171',
      marginTop: 6,
    },
    dropdown: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    dropdownSelected: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dropdownTriggerText: {
      fontSize: 15,
      color: colors.textMuted,
    },
    dropdownSelectedText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    dropdownList: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      maxHeight: 200,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownItemSelected: {
      backgroundColor: 'rgba(52, 211, 153, 0.1)',
    },
    dropdownItemText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    dropdownItemTextSelected: {
      color: colors.accentMint,
      fontWeight: '500',
    },
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
    deleteButton: {
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.accentCoral,
      alignItems: 'center',
      marginTop: 12,
    },
    deleteButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.accentCoral,
    },
    deleteConfirmContainer: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderRadius: 12,
      padding: 16,
      marginTop: 12,
    },
    deleteConfirmText: {
      fontSize: 14,
      color: colors.accentCoral,
      textAlign: 'center',
      marginBottom: 12,
    },
    deleteConfirmButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    deleteConfirmCancel: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
    },
    deleteConfirmCancelText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    deleteConfirmDelete: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.accentCoral,
      alignItems: 'center',
    },
    deleteConfirmDeleteText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
  });

  if (!transaction) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <Animated.View
            style={[
              styles.content,
              { transform: [{ translateY }] },
            ]}
          >
            <View
              {...panResponder.panHandlers}
              style={styles.handleContainer}
            >
              <View style={styles.handle} />
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>내역 수정</Text>
              <TouchableOpacity onPress={handleClose}>
                <MaterialIcons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              {/* Type Indicator */}
              <LinearGradient
                colors={editType === 'EXPENSE' ? ['#F87171', '#FBBF24'] : ['#34D399', '#60A5FA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.typeIndicator}
              >
                <MaterialIcons
                  name={editType === 'EXPENSE' ? 'trending-down' : 'trending-up'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.typeText}>
                  {editType === 'EXPENSE' ? '지출' : '수입'}
                </Text>
              </LinearGradient>

              {/* Description */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>내용</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="예: 점심 식사, 월급 등"
                  placeholderTextColor={colors.textMuted}
                  value={editDescription}
                  onChangeText={setEditDescription}
                />
              </View>

              {/* Amount */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>금액</Text>
                <View style={[styles.amountContainer, editAmountExceeded && styles.amountContainerExceeded]}>
                  <Text style={styles.currencySymbol}>₩</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    value={editAmount}
                    onChangeText={handleAmountChange}
                    keyboardType="numeric"
                  />
                </View>
                {editAmountExceeded && (
                  <Text style={styles.exceededText}>
                    1000억 원을 초과할 수 없습니다.
                  </Text>
                )}
              </View>

              {/* Category Dropdown */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>카테고리</Text>
                <View style={styles.dropdown}>
                  <TouchableOpacity
                    style={styles.dropdownTrigger}
                    onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                    disabled={isCategoriesLoading}
                  >
                    {isCategoriesLoading ? (
                      <View style={styles.dropdownSelected}>
                        <ActivityIndicator size="small" color={colors.textMuted} />
                        <Text style={[styles.dropdownTriggerText, { marginLeft: 8 }]}>
                          로딩 중...
                        </Text>
                      </View>
                    ) : editCategoryId ? (
                      (() => {
                        const foundCategory = editCategories.find(c => c.id === editCategoryId);
                        const categoryInfo = foundCategory || transaction.category;
                        if (categoryInfo) {
                          return (
                            <View style={styles.dropdownSelected}>
                              <MaterialIcons
                                name={getIconName(categoryInfo.icon)}
                                size={18}
                                color={categoryInfo.color || colors.textPrimary}
                              />
                              <Text style={styles.dropdownSelectedText}>
                                {categoryInfo.name}
                              </Text>
                            </View>
                          );
                        }
                        return <Text style={styles.dropdownTriggerText}>카테고리 선택</Text>;
                      })()
                    ) : (
                      <Text style={styles.dropdownTriggerText}>카테고리 선택</Text>
                    )}
                    <MaterialIcons
                      name={isDropdownOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                  {isDropdownOpen && !isCategoriesLoading && (
                    <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                      {editCategories.map((cat, index) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.dropdownItem,
                            editCategoryId === cat.id && styles.dropdownItemSelected,
                            index === editCategories.length - 1 && { borderBottomWidth: 0 },
                          ]}
                          onPress={() => {
                            setEditCategoryId(cat.id);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <MaterialIcons name={getIconName(cat.icon)} size={20} color={cat.color} />
                          <Text
                            style={[
                              styles.dropdownItemText,
                              editCategoryId === cat.id && styles.dropdownItemTextSelected,
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

              {/* Action Buttons */}
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
                    isSubmitting && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  <LinearGradient
                    colors={editType === 'EXPENSE' ? ['#F87171', '#FBBF24'] : ['#34D399', '#60A5FA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.submitButtonGradient}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>수정</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Delete Button */}
              {!showDeleteConfirm ? (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => setShowDeleteConfirm(true)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.deleteConfirmContainer}>
                  <Text style={styles.deleteConfirmText}>
                    정말로 이 내역을 삭제하시겠습니까?
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
                      style={styles.deleteConfirmDelete}
                      onPress={onDelete}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.deleteConfirmDeleteText}>삭제</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}
