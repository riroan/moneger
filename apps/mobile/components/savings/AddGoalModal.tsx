import React, { useState } from 'react';
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

interface AddGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    icon: string;
    targetAmount: number;
    currentAmount: number;
    startYear: number;
    startMonth: number;
    targetYear: number;
    targetMonth: number;
  }) => void;
  isSubmitting: boolean;
}

export function AddGoalModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
}: AddGoalModalProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const now = new Date();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('savings');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [startYear, setStartYear] = useState(now.getFullYear());
  const [startMonth, setStartMonth] = useState(now.getMonth() + 1);
  const [targetYear, setTargetYear] = useState(now.getFullYear() + 1);
  const [targetMonth, setTargetMonth] = useState(12);
  const [targetAmountExceeded, setTargetAmountExceeded] = useState(false);
  const [currentAmountExceeded, setCurrentAmountExceeded] = useState(false);

  const resetForm = () => {
    setName('');
    setIcon('savings');
    setTargetAmount('');
    setCurrentAmount('');
    setStartYear(now.getFullYear());
    setStartMonth(now.getMonth() + 1);
    setTargetYear(now.getFullYear() + 1);
    setTargetMonth(12);
    setTargetAmountExceeded(false);
    setCurrentAmountExceeded(false);
  };

  const handleClose = () => {
    resetForm();
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
      currentAmount: parseInt(currentAmount.replace(/,/g, '') || '0', 10),
      startYear,
      startMonth,
      targetYear,
      targetMonth,
    });
  };

  const handleAmountChange = (
    text: string,
    setValue: (v: string) => void,
    setExceeded: (v: boolean) => void
  ) => {
    const result = formatAmountInput(text, AMOUNT_LIMITS.MAX);
    setValue(result.value);
    setExceeded(result.exceeded);
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
            <Text style={styles.title}>저축 목표 추가</Text>
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
                onChangeText={(text) => handleAmountChange(text, setTargetAmount, setTargetAmountExceeded)}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
            {targetAmountExceeded && (
              <Text style={styles.exceededText}>100조 원을 초과할 수 없습니다.</Text>
            )}

            <Text style={styles.label}>현재 저축액 (선택)</Text>
            <View style={[styles.amountContainer, currentAmountExceeded && styles.amountContainerExceeded]}>
              <Text style={styles.currencySymbol}>₩</Text>
              <TextInput
                style={styles.amountInput}
                value={currentAmount}
                onChangeText={(text) => handleAmountChange(text, setCurrentAmount, setCurrentAmountExceeded)}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
            {currentAmountExceeded && (
              <Text style={styles.exceededText}>100조 원을 초과할 수 없습니다.</Text>
            )}

            <Text style={styles.label}>시작 날짜</Text>
            <View style={styles.dateRow}>
              <View style={styles.datePickerContainer}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setStartYear(Math.max(2020, startYear - 1))}
                >
                  <MaterialIcons name="chevron-left" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.dateText}>{startYear}년</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setStartYear(Math.min(now.getFullYear(), startYear + 1))}
                >
                  <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContainer}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setStartMonth(startMonth > 1 ? startMonth - 1 : 12)}
                >
                  <MaterialIcons name="chevron-left" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.dateText}>{startMonth}월</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setStartMonth(startMonth < 12 ? startMonth + 1 : 1)}
                >
                  <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

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
              <Text style={styles.saveButtonText}>{isSubmitting ? '저장 중...' : '추가'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
