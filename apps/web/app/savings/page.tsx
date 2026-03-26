'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { useDashboardData } from '@/hooks/useDashboardData';
import MainLayout from '@/components/layout/MainLayout';
import SavingsTab from '@/components/savings/SavingsTab';

export default function SavingsPage() {
  const router = useRouter();
  const { userId, isLoading: isAuthLoading, initAuth } = useAuthStore();
  const { refreshData } = useDashboardData();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initAuth();
    setIsInitialized(true);
  }, [initAuth]);

  if (!isInitialized || isAuthLoading) {
    return null;
  }

  if (!userId) {
    router.push('/');
    return null;
  }

  return (
    <MainLayout>
      <SavingsTab userId={userId} onDataChange={refreshData} />
    </MainLayout>
  );
}
