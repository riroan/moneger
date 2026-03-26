'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useModalStore } from '@/stores';
import { useDashboardData } from '@/hooks/useDashboardData';
import MainLayout from '@/components/layout/MainLayout';
import TransactionsTab from '@/components/tabs/TransactionsTab';
import type { TransactionWithCategory } from '@/types';

export default function TransactionsPage() {
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

  if (!isInitialized || isAuthLoading) {
    return null;
  }

  if (!userId) {
    router.push('/');
    return null;
  }

  return (
    <MainLayout>
      <TransactionsTab onTransactionClick={handleTransactionClick} />
    </MainLayout>
  );
}
