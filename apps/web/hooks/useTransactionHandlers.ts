'use client';

import { useCallback } from 'react';
import { useAuthStore, useModalStore } from '@/stores';
import { useToast } from '@/contexts/ToastContext';
import type { TransactionFormData } from './useTransactionForm';

interface UseTransactionHandlersOptions {
  onSuccess?: () => Promise<void>;
  onAllTransactionsRefresh?: () => void;
}

export function useTransactionHandlers(options: UseTransactionHandlersOptions = {}) {
  const { onSuccess, onAllTransactionsRefresh } = options;

  const userId = useAuthStore((state) => state.userId);
  const { showToast } = useToast();
  const {
    editingTransaction,
    setSubmitting,
    closeTransactionModal,
    closeEditModal,
    closeDeleteConfirm,
    closeSavingsTransactionModal,
    notifyTransactionChange,
  } = useModalStore();

  const handleSubmitTransaction = useCallback(async (data: TransactionFormData) => {
    if (!userId) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...data }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      closeTransactionModal();
      notifyTransactionChange();
      if (onSuccess) await onSuccess();
      if (onAllTransactionsRefresh) onAllTransactionsRefresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '거래 추가에 실패했습니다', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [userId, setSubmitting, closeTransactionModal, notifyTransactionChange, onSuccess, onAllTransactionsRefresh, showToast]);

  const handleEditTransaction = useCallback(async (data: TransactionFormData) => {
    if (!userId || !editingTransaction) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...data }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      closeEditModal();
      notifyTransactionChange();
      if (onSuccess) await onSuccess();
      if (onAllTransactionsRefresh) onAllTransactionsRefresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '거래 수정에 실패했습니다', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [userId, editingTransaction, setSubmitting, closeEditModal, notifyTransactionChange, onSuccess, onAllTransactionsRefresh, showToast]);

  const handleDeleteTransaction = useCallback(async () => {
    if (!userId || !editingTransaction) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      closeDeleteConfirm();
      closeEditModal();
      notifyTransactionChange();
      if (onSuccess) await onSuccess();
      if (onAllTransactionsRefresh) onAllTransactionsRefresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '거래 삭제에 실패했습니다', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [userId, editingTransaction, setSubmitting, closeDeleteConfirm, closeEditModal, notifyTransactionChange, onSuccess, onAllTransactionsRefresh, showToast]);

  const handleDeleteSavingsTransaction = useCallback(async () => {
    if (!userId || !editingTransaction) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      closeSavingsTransactionModal();
      notifyTransactionChange();
      if (onSuccess) await onSuccess();
      if (onAllTransactionsRefresh) onAllTransactionsRefresh();
      showToast('저축 내역이 삭제되었습니다', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '저축 내역 삭제에 실패했습니다', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [userId, editingTransaction, setSubmitting, closeSavingsTransactionModal, notifyTransactionChange, onSuccess, onAllTransactionsRefresh, showToast]);

  return {
    handleSubmitTransaction,
    handleEditTransaction,
    handleDeleteTransaction,
    handleDeleteSavingsTransaction,
  };
}
