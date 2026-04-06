'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { useDashboardData } from '@/hooks/useDashboardData';
import MainLayout from '@/components/layout/MainLayout';
import GroupsTab from '@/components/groups/GroupsTab';

export default function GroupsPage() {
  const router = useRouter();
  const { userId, isLoading: isAuthLoading, initAuth } = useAuthStore();
  const { refreshData } = useDashboardData();
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
      <GroupsTab userId={userId} onDataChange={refreshData} />
    </MainLayout>
  );
}
