'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { useDashboardData } from '@/hooks/useDashboardData';
import MainLayout from '@/components/layout/MainLayout';
import SavingsTab from '@/components/savings/SavingsTab';

export default function SavingsPage() {
  const router = useRouter();
  const { userId, isLoading: isAuthLoading, fetchSession } = useAuthStore();
  const { refreshData } = useDashboardData();

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!isAuthLoading && !userId) {
      router.push('/');
    }
  }, [isAuthLoading, userId, router]);

  if (isAuthLoading || !userId) {
    return null;
  }

  return (
    <MainLayout requiredFeature="SAVINGS">
      <SavingsTab userId={userId} onDataChange={refreshData} />
    </MainLayout>
  );
}
