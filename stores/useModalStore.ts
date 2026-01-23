import { create } from 'zustand';
import type { TransactionWithCategory } from '@/types';

interface ModalState {
  isTransactionModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteConfirmOpen: boolean;
  isSavingsTransactionModalOpen: boolean;
  editingTransaction: TransactionWithCategory | null;
  isSubmitting: boolean;
}

interface ModalActions {
  openTransactionModal: () => void;
  closeTransactionModal: () => void;
  openEditModal: (transaction: TransactionWithCategory) => void;
  closeEditModal: () => void;
  openDeleteConfirm: () => void;
  closeDeleteConfirm: () => void;
  openSavingsTransactionModal: (transaction: TransactionWithCategory) => void;
  closeSavingsTransactionModal: () => void;
  closeAllModals: () => void;
  setEditingTransaction: (transaction: TransactionWithCategory | null) => void;
  setSubmitting: (isSubmitting: boolean) => void;
}

type ModalStore = ModalState & ModalActions;

export const useModalStore = create<ModalStore>((set) => ({
  isTransactionModalOpen: false,
  isEditModalOpen: false,
  isDeleteConfirmOpen: false,
  isSavingsTransactionModalOpen: false,
  editingTransaction: null,
  isSubmitting: false,

  openTransactionModal: () => set({ isTransactionModalOpen: true }),
  closeTransactionModal: () => set({ isTransactionModalOpen: false }),

  openEditModal: (transaction) => set({
    isEditModalOpen: true,
    editingTransaction: transaction
  }),
  closeEditModal: () => set({
    isEditModalOpen: false,
    editingTransaction: null
  }),

  openDeleteConfirm: () => set({ isDeleteConfirmOpen: true }),
  closeDeleteConfirm: () => set({ isDeleteConfirmOpen: false }),

  openSavingsTransactionModal: (transaction) => set({
    isSavingsTransactionModalOpen: true,
    editingTransaction: transaction,
  }),
  closeSavingsTransactionModal: () => set({
    isSavingsTransactionModalOpen: false,
    editingTransaction: null,
  }),

  closeAllModals: () => set({
    isTransactionModalOpen: false,
    isEditModalOpen: false,
    isDeleteConfirmOpen: false,
    isSavingsTransactionModalOpen: false,
    editingTransaction: null,
  }),

  setEditingTransaction: (transaction) => set({ editingTransaction: transaction }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
}));
