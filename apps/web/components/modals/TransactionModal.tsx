'use client';

import ModalOverlay from './ModalOverlay';
import TransactionForm from '@/components/forms/TransactionForm';
import type { Category } from '@/types';
import type { TransactionFormData } from '@/hooks/useTransactionForm';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  categories: Category[];
  isSubmitting: boolean;
}

export default function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
  isSubmitting,
}: TransactionModalProps) {
  if (!isOpen) return null;

  return (
    <ModalOverlay onClose={onClose} title="내역 추가">
      <TransactionForm
        mode="add"
        categories={categories}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </ModalOverlay>
  );
}
