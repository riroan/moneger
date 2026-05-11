'use client';

import ModalOverlay from './ModalOverlay';
import TransactionForm from '@/components/forms/TransactionForm';
import { useModalStore } from '@/stores';
import type { Category, TransactionWithCategory } from '@/types';
import type { TransactionFormData } from '@/hooks/useTransactionForm';

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: TransactionWithCategory | null;
  onClose: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onDelete: () => void;
  categories: Category[];
  userId: string;
  isSubmitting: boolean;
}

export default function EditTransactionModal({
  isOpen,
  transaction,
  onClose,
  onSubmit,
  onDelete,
  categories,
  userId,
  isSubmitting,
}: EditTransactionModalProps) {
  const isDeleteConfirmOpen = useModalStore((s) => s.isDeleteConfirmOpen);
  if (!isOpen || !transaction) return null;

  return (
    <ModalOverlay onClose={onClose} title="내역 수정" escapeActive={!isDeleteConfirmOpen}>
      <TransactionForm
        mode="edit"
        initialTransaction={transaction}
        categories={categories}
        userId={userId}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
        onCancel={onClose}
        onDelete={onDelete}
      />
    </ModalOverlay>
  );
}
