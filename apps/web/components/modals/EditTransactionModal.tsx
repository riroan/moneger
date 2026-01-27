'use client';

import ModalOverlay from './ModalOverlay';
import TransactionForm from '@/components/forms/TransactionForm';
import type { Category, TransactionWithCategory } from '@/types';
import type { TransactionFormData } from '@/hooks/useTransactionForm';

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: TransactionWithCategory | null;
  onClose: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onDelete: () => void;
  categories: Category[];
  isSubmitting: boolean;
}

export default function EditTransactionModal({
  isOpen,
  transaction,
  onClose,
  onSubmit,
  onDelete,
  categories,
  isSubmitting,
}: EditTransactionModalProps) {
  if (!isOpen || !transaction) return null;

  return (
    <ModalOverlay onClose={onClose} title="내역 수정">
      <TransactionForm
        mode="edit"
        initialTransaction={transaction}
        categories={categories}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
        onCancel={onClose}
        onDelete={onDelete}
      />
    </ModalOverlay>
  );
}
