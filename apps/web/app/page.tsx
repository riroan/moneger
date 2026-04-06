'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useModalStore } from '@/stores';
import MainLayout from '@/components/layout/MainLayout';
import DashboardTab from '@/components/tabs/DashboardTab';
import LandingPage from '@/components/LandingPage';
import { useAuthStore } from '@/stores';
import type { TransactionWithCategory } from '@/types';

export default function Home() {
  const router = useRouter();
  const { userId, isLoading: isAuthLoading, initAuth } = useAuthStore();
  const { openEditModal, openSavingsTransactionModal } = useModalStore();
  const [isInitialized, setIsInitialized] = useState(false);

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
    router.push('/transactions');
  };

  const handleViewSavings = () => {
    router.push('/savings');
  };

  const handleViewGroups = () => {
    router.push('/groups');
  };

  if (!isInitialized || isAuthLoading) {
    return null;
  }

  if (!userId) {
    return <LandingPage />;
  }

  return (
    <MainLayout>
      <DashboardTab
        onTransactionClick={handleTransactionClick}
        onViewAllTransactions={handleViewAllTransactions}
        onViewSavings={handleViewSavings}
        onViewGroups={handleViewGroups}
      />
    </MainLayout>
  );
}
