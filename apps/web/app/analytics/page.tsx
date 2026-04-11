'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import MainLayout from '@/components/layout/MainLayout';
import AnalyticsTab from '@/components/analytics/AnalyticsTab';

export default function AnalyticsPage() {
  const router = useRouter();
  const { userId, isLoading: isAuthLoading, initAuth } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initAuth();
    setIsInitialized(true);
  }, [initAuth]);

  useEffect(() => {
    if (isInitialized && !isAuthLoading && !userId) {
      router.push('/');
    }
  }, [isInitialized, isAuthLoading, userId, router]);

  if (!isInitialized || isAuthLoading || !userId) {
    return null;
  }

  return (
    <MainLayout>
      <AnalyticsTab />
    </MainLayout>
  );
}
