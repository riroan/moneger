'use client';

import { useAppStore, useModalStore } from '@/stores';
import { useDashboardData } from '@/hooks/useDashboardData';
import MainLayout from '@/components/layout/MainLayout';
import DashboardTab from '@/components/tabs/DashboardTab';
import TransactionsTab from '@/components/tabs/TransactionsTab';
import SavingsTab from '@/components/savings/SavingsTab';
import { useAuthStore } from '@/stores';
import type { TransactionWithCategory } from '@/types';

export default function Home() {
  const { activeTab, setActiveTab } = useAppStore();
  const userId = useAuthStore((state) => state.userId);
  const { openEditModal, openSavingsTransactionModal } = useModalStore();
  const { refreshData } = useDashboardData();

  const handleTransactionClick = (tx: TransactionWithCategory) => {
    if (tx.savingsGoalId) {
      openSavingsTransactionModal(tx);
    } else {
      openEditModal(tx);
    }
  };

  const handleViewAllTransactions = () => {
    setActiveTab('transactions');
  };

  const handleViewSavings = () => {
    setActiveTab('savings');
  };

  return (
    <MainLayout>
      {activeTab === 'dashboard' && (
        <DashboardTab
          onTransactionClick={handleTransactionClick}
          onViewAllTransactions={handleViewAllTransactions}
          onViewSavings={handleViewSavings}
        />
      )}

      {activeTab === 'transactions' && (
        <TransactionsTab onTransactionClick={handleTransactionClick} />
      )}

      {activeTab === 'savings' && userId && (
        <SavingsTab userId={userId} onDataChange={refreshData} />
      )}
    </MainLayout>
  );
}
