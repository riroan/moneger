import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { formatNumber, formatDate } from '@moneger/shared';

export interface SavingsTransactionForEdit {
  id: string;
  amount: number;
  description: string;
  date: string;
  savingsGoalId: string;
}

interface EditSavingsTransactionModalProps {
  visible: boolean;
  transaction: SavingsTransactionForEdit | null;
  onClose: () => void;
  onDelete: () => void;
  isSubmitting: boolean;
}

export function EditSavingsTransactionModal({
  visible,
  transaction,
  onClose,
  onDelete,
  isSubmitting,
}: EditSavingsTransactionModalProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShowDeleteConfirm(false);
    }
  }, [visible]);

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    onDelete();
  };

  const handleClose = () => {
    setShowDeleteConfirm(false);
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    content: {
      backgroundColor: colors.bgCard,
      borderRadius: 24,
      width: '90%',
      maxWidth: 400,
      padding: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    closeButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    iconBox: {
      width: 64,
      height: 64,
      borderRadius: 16,
      backgroundColor: 'rgba(96, 165, 250, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    amountContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    amount: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.accentBlue,
    },
    date: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 8,
    },
    descriptionContainer: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    descriptionLabel: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 4,
    },
    descriptionText: {
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    noticeContainer: {
      backgroundColor: 'rgba(96, 165, 250, 0.1)',
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    },
    noticeText: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    buttons: {
      flexDirection: 'row',
      gap: 12,
    },
    closeButtonAction: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
    },
    closeButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    deleteButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.bgSecondary,
      borderWidth: 1,
      borderColor: colors.accentCoral,
      alignItems: 'center',
    },
    deleteButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.accentCoral,
    },
    // Delete confirmation styles
    confirmOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    confirmContent: {
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      width: '85%',
      maxWidth: 360,
      padding: 20,
    },
    confirmTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    confirmText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 20,
    },
    confirmButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    confirmCancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
    },
    confirmCancelText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    confirmDeleteButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.accentCoral,
      alignItems: 'center',
    },
    confirmDeleteText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
  });

  if (!transaction) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>저축 내역</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.iconContainer}>
            <View style={styles.iconBox}>
              <MaterialIcons name="savings" size={32} color={colors.accentBlue} />
            </View>
          </View>

          <View style={styles.amountContainer}>
            <Text style={styles.amount}>₩{formatNumber(transaction.amount)}</Text>
            <Text style={styles.date}>{formatDate(transaction.date)}</Text>
          </View>

          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionLabel}>내용</Text>
            <Text style={styles.descriptionText}>
              {transaction.description || '저축'}
            </Text>
          </View>

          <View style={styles.noticeContainer}>
            <Text style={styles.noticeText}>
              저축 내역은 수정할 수 없습니다.{'\n'}
              삭제 시 저축 목표의 금액이 차감됩니다.
            </Text>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.closeButtonAction}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={isSubmitting}
            >
              <Text style={styles.deleteButtonText}>삭제</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <View style={styles.confirmOverlay}>
            <TouchableOpacity
              style={styles.backdrop}
              activeOpacity={1}
              onPress={() => setShowDeleteConfirm(false)}
            />
            <View style={styles.confirmContent}>
              <Text style={styles.confirmTitle}>저축 내역 삭제</Text>
              <Text style={styles.confirmText}>
                이 저축 내역을 삭제하시겠습니까?{'\n'}
                저축 목표의 금액에서 {formatNumber(transaction.amount)}원이 차감됩니다.
              </Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={styles.confirmCancelButton}
                  onPress={() => setShowDeleteConfirm(false)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.confirmCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmDeleteButton}
                  onPress={handleDeleteConfirm}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmDeleteText}>삭제</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
