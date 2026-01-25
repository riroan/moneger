import { useModalStore } from '../useModalStore';
import type { TransactionWithCategory } from '@/types';

describe('useModalStore', () => {
  const mockTransaction: TransactionWithCategory = {
    id: 'tx-1',
    userId: 'user-1',
    type: 'EXPENSE',
    amount: 10000,
    description: '점심',
    date: new Date('2024-01-15'),
    categoryId: 'cat-1',
    savingsGoalId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    category: {
      id: 'cat-1',
      name: '식비',
      type: 'EXPENSE',
      color: '#EF4444',
      icon: '🍽️',
    },
  };

  beforeEach(() => {
    // Reset store state before each test
    useModalStore.setState({
      isTransactionModalOpen: false,
      isEditModalOpen: false,
      isDeleteConfirmOpen: false,
      isSavingsTransactionModalOpen: false,
      editingTransaction: null,
      isSubmitting: false,
    });
  });

  describe('Transaction Modal', () => {
    it('should open transaction modal', () => {
      useModalStore.getState().openTransactionModal();

      expect(useModalStore.getState().isTransactionModalOpen).toBe(true);
    });

    it('should close transaction modal', () => {
      useModalStore.setState({ isTransactionModalOpen: true });
      useModalStore.getState().closeTransactionModal();

      expect(useModalStore.getState().isTransactionModalOpen).toBe(false);
    });
  });

  describe('Edit Modal', () => {
    it('should open edit modal with transaction', () => {
      useModalStore.getState().openEditModal(mockTransaction);

      const state = useModalStore.getState();
      expect(state.isEditModalOpen).toBe(true);
      expect(state.editingTransaction).toEqual(mockTransaction);
    });

    it('should close edit modal and clear editing transaction', () => {
      useModalStore.setState({
        isEditModalOpen: true,
        editingTransaction: mockTransaction,
      });
      useModalStore.getState().closeEditModal();

      const state = useModalStore.getState();
      expect(state.isEditModalOpen).toBe(false);
      expect(state.editingTransaction).toBeNull();
    });
  });

  describe('Delete Confirm Modal', () => {
    it('should open delete confirm modal', () => {
      useModalStore.getState().openDeleteConfirm();

      expect(useModalStore.getState().isDeleteConfirmOpen).toBe(true);
    });

    it('should close delete confirm modal', () => {
      useModalStore.setState({ isDeleteConfirmOpen: true });
      useModalStore.getState().closeDeleteConfirm();

      expect(useModalStore.getState().isDeleteConfirmOpen).toBe(false);
    });
  });

  describe('Savings Transaction Modal', () => {
    it('should open savings transaction modal with transaction', () => {
      useModalStore.getState().openSavingsTransactionModal(mockTransaction);

      const state = useModalStore.getState();
      expect(state.isSavingsTransactionModalOpen).toBe(true);
      expect(state.editingTransaction).toEqual(mockTransaction);
    });

    it('should close savings transaction modal and clear editing transaction', () => {
      useModalStore.setState({
        isSavingsTransactionModalOpen: true,
        editingTransaction: mockTransaction,
      });
      useModalStore.getState().closeSavingsTransactionModal();

      const state = useModalStore.getState();
      expect(state.isSavingsTransactionModalOpen).toBe(false);
      expect(state.editingTransaction).toBeNull();
    });
  });

  describe('closeAllModals', () => {
    it('should close all modals and clear editing transaction', () => {
      useModalStore.setState({
        isTransactionModalOpen: true,
        isEditModalOpen: true,
        isDeleteConfirmOpen: true,
        isSavingsTransactionModalOpen: true,
        editingTransaction: mockTransaction,
      });

      useModalStore.getState().closeAllModals();

      const state = useModalStore.getState();
      expect(state.isTransactionModalOpen).toBe(false);
      expect(state.isEditModalOpen).toBe(false);
      expect(state.isDeleteConfirmOpen).toBe(false);
      expect(state.isSavingsTransactionModalOpen).toBe(false);
      expect(state.editingTransaction).toBeNull();
    });

    it('should not affect isSubmitting state', () => {
      useModalStore.setState({ isSubmitting: true });

      useModalStore.getState().closeAllModals();

      expect(useModalStore.getState().isSubmitting).toBe(true);
    });
  });

  describe('setEditingTransaction', () => {
    it('should set editing transaction', () => {
      useModalStore.getState().setEditingTransaction(mockTransaction);

      expect(useModalStore.getState().editingTransaction).toEqual(mockTransaction);
    });

    it('should clear editing transaction when set to null', () => {
      useModalStore.setState({ editingTransaction: mockTransaction });
      useModalStore.getState().setEditingTransaction(null);

      expect(useModalStore.getState().editingTransaction).toBeNull();
    });
  });

  describe('setSubmitting', () => {
    it('should set isSubmitting to true', () => {
      useModalStore.getState().setSubmitting(true);

      expect(useModalStore.getState().isSubmitting).toBe(true);
    });

    it('should set isSubmitting to false', () => {
      useModalStore.setState({ isSubmitting: true });
      useModalStore.getState().setSubmitting(false);

      expect(useModalStore.getState().isSubmitting).toBe(false);
    });
  });

  describe('State isolation', () => {
    it('should only affect specific modal when opening', () => {
      useModalStore.getState().openTransactionModal();

      const state = useModalStore.getState();
      expect(state.isTransactionModalOpen).toBe(true);
      expect(state.isEditModalOpen).toBe(false);
      expect(state.isDeleteConfirmOpen).toBe(false);
      expect(state.isSavingsTransactionModalOpen).toBe(false);
    });

    it('should preserve other modal states when closing one', () => {
      useModalStore.setState({
        isTransactionModalOpen: true,
        isDeleteConfirmOpen: true,
      });

      useModalStore.getState().closeTransactionModal();

      const state = useModalStore.getState();
      expect(state.isTransactionModalOpen).toBe(false);
      expect(state.isDeleteConfirmOpen).toBe(true);
    });
  });
});
