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

const QUICK_AMOUNTS = [10000, 50000, 100000, 500000];

export interface SavingsGoalForDeposit {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  currentAmount: number;
  progressPercent: number;
}

interface DepositModalProps {
  visible: boolean;
  goal: SavingsGoalForDeposit | null;
  onClose: () => void;
  onSubmit: (amount: number) => void;
  isSubmitting: boolean;
}

export function DepositModal({
  visible,
  goal,
  onClose,
  onSubmit,
  isSubmitting,
}: DepositModalProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const [depositAmount, setDepositAmount] = useState('');
  const [amountExceeded, setAmountExceeded] = useState(false);

  useEffect(() => {
    if (visible) {
      setDepositAmount('');
      setAmountExceeded(false);
    }
  }, [visible]);

  const handleClose = () => {
    setDepositAmount('');
    setAmountExceeded(false);
    onClose();
  };

  const handleSubmit = () => {
    const amount = parseInt(depositAmount.replace(/,/g, '') || '0', 10);
    if (amount > 0) {
      onSubmit(amount);
    }
  };

  const handleQuickAmount = (amount: number) => {
    const current = parseInt(depositAmount.replace(/,/g, '') || '0', 10);
    const newAmount = current + amount;
    if (newAmount > AMOUNT_LIMITS.TRANSACTION_MAX) {
      setAmountExceeded(true);
      setDepositAmount(formatNumber(AMOUNT_LIMITS.TRANSACTION_MAX));
    } else {
      setAmountExceeded(false);
      setDepositAmount(formatNumber(newAmount));
    }
  };

  const handleFullAmount = () => {
    if (!goal) return;
    const remainingAmount = goal.targetAmount - goal.currentAmount;
    if (remainingAmount > AMOUNT_LIMITS.TRANSACTION_MAX) {
      setAmountExceeded(true);
      setDepositAmount(formatNumber(AMOUNT_LIMITS.TRANSACTION_MAX));
    } else {
      setAmountExceeded(false);
      setDepositAmount(formatNumber(remainingAmount));
    }
  };

  const renderGoalIcon = (iconName: string, size: number, color: string) => {
    const iconKey = GOAL_ICONS[iconName] || GOAL_ICONS.savings;
    return <MaterialIcons name={iconKey} size={size} color={color} />;
  };

  const depositNum = parseInt(depositAmount.replace(/,/g, '') || '0', 10);
  const afterDepositAmount = goal ? goal.currentAmount + depositNum : 0;
  const afterDepositPercent = goal
    ? Math.min(Math.round((afterDepositAmount / goal.targetAmount) * 100), 100)
    : 0;

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
    goalInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    goalIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: 'rgba(251, 191, 36, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    goalDetails: {
      flex: 1,
    },
    goalName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    goalProgress: {
      fontSize: 12,
      color: colors.textMuted,
    },
    goalPercent: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.accentMint,
    },
    remainingBox: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      alignItems: 'center',
    },
    remainingLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 4,
    },
    remainingValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    label: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
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
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    exceededText: {
      fontSize: 12,
      color: '#F87171',
      marginTop: 6,
    },
    quickAmountsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    quickAmountButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
    },
    quickAmountText: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.accentMint,
    },
    fullAmountButton: {
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.accentMint + '20',
      alignItems: 'center',
      marginTop: 12,
    },
    fullAmountText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.accentMint,
    },
    preview: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 16,
      marginTop: 20,
    },
    previewLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 8,
    },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    previewAmount: {
      flex: 1,
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginRight: 8,
    },
    previewPercent: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.accentMint,
    },
    previewBar: {
      height: 8,
      backgroundColor: colors.bgCard,
      borderRadius: 4,
      overflow: 'hidden',
    },
    previewBarFill: {
      height: '100%',
      backgroundColor: colors.accentMint,
      borderRadius: 4,
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
            <Text style={styles.title}>저축하기</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Goal Info */}
            <View style={styles.goalInfo}>
              <View style={styles.goalIcon}>
                {renderGoalIcon(goal.icon, 24, '#FBBF24')}
              </View>
              <View style={styles.goalDetails}>
                <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
                <Text style={styles.goalProgress} numberOfLines={1} adjustsFontSizeToFit>
                  현재 ₩{formatNumber(goal.currentAmount)}
                </Text>
                <Text style={styles.goalProgress} numberOfLines={1} adjustsFontSizeToFit>
                  목표 ₩{formatNumber(goal.targetAmount)}
                </Text>
              </View>
              <Text style={styles.goalPercent}>{goal.progressPercent}%</Text>
            </View>

            {/* Remaining Amount */}
            <View style={styles.remainingBox}>
              <Text style={styles.remainingLabel}>목표까지 남은 금액</Text>
              <Text style={styles.remainingValue} numberOfLines={1} adjustsFontSizeToFit>
                ₩{formatNumber(Math.max(goal.targetAmount - goal.currentAmount, 0))}
              </Text>
            </View>

            {/* Deposit Amount */}
            <Text style={styles.label}>저축 금액</Text>
            <View style={[styles.amountContainer, amountExceeded && styles.amountContainerExceeded]}>
              <Text style={styles.currencySymbol}>₩</Text>
              <TextInput
                style={styles.amountInput}
                value={depositAmount}
                onChangeText={(text) => {
                  const result = formatAmountInput(text, AMOUNT_LIMITS.TRANSACTION_MAX);
                  setDepositAmount(result.value);
                  setAmountExceeded(result.exceeded);
                }}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                autoFocus
              />
            </View>
            {amountExceeded && (
              <Text style={styles.exceededText}>1000억 원을 초과할 수 없습니다.</Text>
            )}

            {/* Quick Amount Buttons */}
            <View style={styles.quickAmountsRow}>
              {QUICK_AMOUNTS.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmountButton}
                  onPress={() => handleQuickAmount(amount)}
                >
                  <Text style={styles.quickAmountText} numberOfLines={1} adjustsFontSizeToFit>
                    +{formatNumber(amount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Full Amount Button */}
            {goal.targetAmount - goal.currentAmount > 0 && (
              <TouchableOpacity style={styles.fullAmountButton} onPress={handleFullAmount}>
                <Text style={styles.fullAmountText} numberOfLines={1} adjustsFontSizeToFit>
                  전액 (₩{formatNumber(Math.min(goal.targetAmount - goal.currentAmount, AMOUNT_LIMITS.TRANSACTION_MAX))})
                </Text>
              </TouchableOpacity>
            )}

            {/* Preview */}
            {depositNum > 0 && (
              <View style={styles.preview}>
                <Text style={styles.previewLabel}>저축 후 예상</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewAmount} numberOfLines={1} adjustsFontSizeToFit>
                    ₩{formatNumber(afterDepositAmount)}
                  </Text>
                  <Text style={styles.previewPercent}>{afterDepositPercent}%</Text>
                </View>
                <View style={styles.previewBar}>
                  <View style={[styles.previewBarFill, { width: `${afterDepositPercent}%` }]} />
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose} disabled={isSubmitting}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting || depositNum <= 0}
            >
              <Text style={styles.saveButtonText}>{isSubmitting ? '저축 중...' : '저축하기'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
