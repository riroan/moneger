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
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { formatNumber, formatAmountInput, AMOUNT_LIMITS } from '@moneger/shared';
import type { MaterialIconName } from '../../constants/Icons';

const GOAL_ICONS: Record<string, MaterialIconName> = {
  home: 'home',
  car: 'directions-car',
  school: 'school',
  travel: 'flight',
  device: 'devices',
  gift: 'card-giftcard',
  health: 'favorite',
  savings: 'savings',
};

export interface SavingsGoalForEdit {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  targetDate: string;
}

interface EditGoalModalProps {
  visible: boolean;
  goal: SavingsGoalForEdit | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    icon: string;
    targetAmount: number;
    targetYear: number;
    targetMonth: number;
  }) => void;
  onDelete: () => void;
  isSubmitting: boolean;
}

const parseTargetDate = (targetDate: string): { year: number; month: number } => {
  const match = targetDate.match(/(\d{4})년\s*(\d{1,2})월/);
  if (match) {
    return { year: parseInt(match[1], 10), month: parseInt(match[2], 10) };
  }
  return { year: new Date().getFullYear() + 1, month: 12 };
};

export function EditGoalModal({
  visible,
  goal,
  onClose,
  onSubmit,
  onDelete,
  isSubmitting,
}: EditGoalModalProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const now = new Date();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('savings');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetYear, setTargetYear] = useState(now.getFullYear() + 1);
  const [targetMonth, setTargetMonth] = useState(12);
  const [targetAmountExceeded, setTargetAmountExceeded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setIcon(goal.icon);
      setTargetAmount(formatNumber(goal.targetAmount));
      const { year, month } = parseTargetDate(goal.targetDate);
      setTargetYear(year);
      setTargetMonth(month);
      setShowDeleteConfirm(false);
      setTargetAmountExceeded(false);
    }
  }, [goal]);

  const handleClose = () => {
    setShowDeleteConfirm(false);
    setTargetAmountExceeded(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const targetNum = parseInt(targetAmount.replace(/,/g, '') || '0', 10);
    if (targetNum <= 0) return;

    onSubmit({
      name: name.trim(),
      icon,
      targetAmount: targetNum,
      targetYear,
      targetMonth,
    });
  };

  const renderGoalIcon = (iconId: string, size: number, color: string) => {
    const iconKey = GOAL_ICONS[iconId] || GOAL_ICONS.savings;
    return <MaterialIcons name={iconKey} size={size} color={color} />;
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
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
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    closeButton: {
      padding: 4,
    },
    body: {
      padding: 20,
    },
    label: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
      marginTop: 16,
    },
    labelFirst: {
      marginTop: 0,
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
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconButtonSelected: {
      backgroundColor: colors.accentMint,
      borderColor: colors.accentMint,
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
    exceededText: {
      fontSize: 12,
      color: '#F87171',
      marginTop: 6,
    },
    dateRow: {
      flexDirection: 'row',
      gap: 12,
    },
    datePickerContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateButton: {
      padding: 4,
    },
    dateText: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '500',
    },
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
      backgroundColor: colors.accentMint,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    deleteButton: {
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.accentCoral,
      alignItems: 'center',
      marginHorizontal: 20,
      marginBottom: 20,
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
      marginHorizontal: 20,
      marginBottom: 20,
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

  if (!goal) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>저축 목표 수정</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, styles.labelFirst]}>목표 이름</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="예: 내 집 마련, 여행 자금"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>아이콘</Text>
            <View style={styles.iconGrid}>
              {Object.keys(GOAL_ICONS).map((iconId) => (
                <TouchableOpacity
                  key={iconId}
                  style={[styles.iconButton, icon === iconId && styles.iconButtonSelected]}
                  onPress={() => setIcon(iconId)}
                >
                  {renderGoalIcon(iconId, 24, icon === iconId ? '#fff' : colors.textSecondary)}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>목표 금액</Text>
            <View style={[styles.amountContainer, targetAmountExceeded && styles.amountContainerExceeded]}>
              <Text style={styles.currencySymbol}>₩</Text>
              <TextInput
                style={styles.amountInput}
                value={targetAmount}
                onChangeText={(text) => {
                  const result = formatAmountInput(text, AMOUNT_LIMITS.MAX);
                  setTargetAmount(result.value);
                  setTargetAmountExceeded(result.exceeded);
                }}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
            {targetAmountExceeded && (
              <Text style={styles.exceededText}>100조 원을 초과할 수 없습니다.</Text>
            )}

            <Text style={styles.label}>목표 날짜</Text>
            <View style={styles.dateRow}>
              <View style={styles.datePickerContainer}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setTargetYear(Math.max(now.getFullYear(), targetYear - 1))}
                >
                  <MaterialIcons name="chevron-left" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.dateText}>{targetYear}년</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setTargetYear(Math.min(now.getFullYear() + 10, targetYear + 1))}
                >
                  <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContainer}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setTargetMonth(targetMonth > 1 ? targetMonth - 1 : 12)}
                >
                  <MaterialIcons name="chevron-left" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.dateText}>{targetMonth}월</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setTargetMonth(targetMonth < 12 ? targetMonth + 1 : 1)}
                >
                  <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose} disabled={isSubmitting}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.saveButtonText}>{isSubmitting ? '저장 중...' : '저장'}</Text>
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
                정말로 이 저축 목표를 삭제하시겠습니까?{'\n'}저축 내역도 함께 삭제됩니다.
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
      </KeyboardAvoidingView>
    </Modal>
  );
}
