'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import MainLayout from '@/components/layout/MainLayout';
import AnalyticsTab from '@/components/analytics/AnalyticsTab';

export default function AnalyticsPage() {
  const router = useRouter();
  const { userId, isLoading: isAuthLoading, fetchSession } = useAuthStore();

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
    <MainLayout requiredFeature="ANALYTICS">
      <AnalyticsTab />
    </MainLayout>
  );
}
