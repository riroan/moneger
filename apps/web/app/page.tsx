'use client';

import { useEffect, useState } from 'react';
import { useAppStore, useModalStore } from '@/stores';
import { useDashboardData } from '@/hooks/useDashboardData';
import MainLayout from '@/components/layout/MainLayout';
import DashboardTab from '@/components/tabs/DashboardTab';
import TransactionsTab from '@/components/tabs/TransactionsTab';
import SavingsTab from '@/components/savings/SavingsTab';
import LandingPage from '@/components/LandingPage';
import { useAuthStore } from '@/stores';
import type { TransactionWithCategory } from '@/types';

export default function Home() {
  const { activeTab, setActiveTab } = useAppStore();
  const { userId, isLoading: isAuthLoading, initAuth } = useAuthStore();
  const { openEditModal, openSavingsTransactionModal } = useModalStore();
  const { refreshData } = useDashboardData();
  const [isInitialized, setIsInitialized] = useState(false);

  // 인증 상태 초기화
  useEffect(() => {
    initAuth();
    setIsInitialized(true);
  }, [initAuth]);

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

  // 초기화 중이거나 인증 로딩 중이면 아무것도 표시하지 않음
  if (!isInitialized || isAuthLoading) {
    return null;
  }

  // 로그인하지 않은 경우 랜딩 페이지 표시
  if (!userId) {
    return <LandingPage />;
  }

  // 로그인한 경우 대시보드 표시
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
