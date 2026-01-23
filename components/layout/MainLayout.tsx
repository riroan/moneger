'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuthStore, useAppStore, useModalStore, useCategoryStore } from '@/stores';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useTransactionHandlers } from '@/hooks/useTransactionHandlers';
import { useTransactions } from '@/hooks/useTransactions';
import { useTransactionStore } from '@/stores';
import Header from '@/components/layout/Header';
import FAB from '@/components/layout/FAB';

const TransactionModal = dynamic(() => import('@/components/modals/TransactionModal'), { ssr: false });
const EditTransactionModal = dynamic(() => import('@/components/modals/EditTransactionModal'), { ssr: false });
const DeleteConfirmModal = dynamic(() => import('@/components/modals/DeleteConfirmModal'), { ssr: false });
const EditSavingsTransactionModal = dynamic(() => import('@/components/savings/EditSavingsTransactionModal'), { ssr: false });

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter();

  // Auth store
  const { userId, userName, userEmail, isLoading: isAuthLoading, initAuth, logout } = useAuthStore();

  // App store
  const { currentDate, activeTab, goToPreviousMonth, goToNextMonth, goToMonth, setIsMobile } = useAppStore();

  // Transaction store
  const { oldestTransactionDate, filterType, filterCategories, searchKeyword, sortOrder, dateRange, amountRange } =
    useTransactionStore();

  // Modal store
  const {
    isTransactionModalOpen,
    isEditModalOpen,
    isDeleteConfirmOpen,
    isSavingsTransactionModalOpen,
    editingTransaction,
    isSubmitting,
    openTransactionModal,
    openDeleteConfirm,
  } = useModalStore();

  // Category store
  const categories = useCategoryStore((state) => state.categories);

  // Hooks
  const { refreshData } = useDashboardData();

  const { refresh: refreshAllTransactions } = useTransactions({
    userId,
    filterType,
    filterCategories,
    searchKeyword,
    sortOrder,
    activeTab,
    dateRange,
    amountRange,
  });

  const { handleSubmitTransaction, handleEditTransaction, handleDeleteTransaction, handleDeleteSavingsTransaction } =
    useTransactionHandlers({
      onSuccess: refreshData,
      onAllTransactionsRefresh: activeTab === 'transactions' ? refreshAllTransactions : undefined,
    });

  // Initialize auth on mount
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Check mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  // Disable body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow =
      isTransactionModalOpen || isEditModalOpen || isDeleteConfirmOpen || isSavingsTransactionModalOpen
        ? 'hidden'
        : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isTransactionModalOpen, isEditModalOpen, isDeleteConfirmOpen, isSavingsTransactionModalOpen]);

  if (isAuthLoading) return null;
  if (!userId) return null;

  return (
    <>
      <div className="noise-overlay" />
      <div className="gradient-orb orb-1" />
      <div className="gradient-orb orb-2" />

      <div className="relative z-10" style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>
        <Header
          userName={userName}
          userEmail={userEmail}
          currentDate={currentDate}
          onPreviousMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
          onMonthSelect={goToMonth}
          onLogout={logout}
          oldestDate={oldestTransactionDate}
          showDatePicker={false}
        />

        {children}
      </div>

      <FAB onClick={openTransactionModal} visible={activeTab !== 'savings'} />

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={useModalStore.getState().closeTransactionModal}
        onSubmit={handleSubmitTransaction}
        categories={categories}
        isSubmitting={isSubmitting}
      />

      <EditTransactionModal
        isOpen={isEditModalOpen}
        transaction={editingTransaction}
        onClose={useModalStore.getState().closeEditModal}
        onSubmit={handleEditTransaction}
        onDelete={openDeleteConfirm}
        categories={categories}
        isSubmitting={isSubmitting}
      />

      <DeleteConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={useModalStore.getState().closeDeleteConfirm}
        onConfirm={handleDeleteTransaction}
        isSubmitting={isSubmitting}
      />

      <EditSavingsTransactionModal
        isOpen={isSavingsTransactionModalOpen}
        transaction={editingTransaction}
        onClose={useModalStore.getState().closeSavingsTransactionModal}
        onDelete={handleDeleteSavingsTransaction}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
