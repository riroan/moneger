'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { useDashboardData } from '@/hooks/useDashboardData';
import MainLayout from '@/components/layout/MainLayout';
import RecurringTab from '@/components/recurring/RecurringTab';

export default function RecurringPage() {
  const router = useRouter();
  const { userId, isLoading: isAuthLoading, initAuth } = useAuthStore();
  const { refreshData } = useDashboardData();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isAuthLoading && !userId) {
      router.push('/');
    }
  }, [isAuthLoading, userId, router]);

  if (isAuthLoading || !userId) {
    return null;
  }

  return (
    <MainLayout requiredFeature="RECURRING">
      <RecurringTab userId={userId} onDataChange={refreshData} />
    </MainLayout>
  );
}
