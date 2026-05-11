'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useModalStore } from '@/stores';
import MainLayout from '@/components/layout/MainLayout';
import TransactionsTab from '@/components/tabs/TransactionsTab';
import type { TransactionWithCategory } from '@/types';

export default function TransactionsPage() {
  const router = useRouter();
  const { userId, isLoading: isAuthLoading, initAuth } = useAuthStore();
  const { openEditModal, openSavingsTransactionModal } = useModalStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isAuthLoading && !userId) {
      router.push('/');
    }
  }, [isAuthLoading, userId, router]);

  const handleTransactionClick = (tx: TransactionWithCategory) => {
    if (tx.savingsGoalId) {
      openSavingsTransactionModal(tx);
    } else {
      openEditModal(tx);
    }
  };

  if (isAuthLoading || !userId) {
    return null;
  }

  return (
    <MainLayout>
      <TransactionsTab onTransactionClick={handleTransactionClick} />
    </MainLayout>
  );
}
