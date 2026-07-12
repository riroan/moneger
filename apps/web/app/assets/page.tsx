'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import MainLayout from '@/components/layout/MainLayout';
import AssetsPage from '@/components/assets/AssetsPage';

export default function AssetsRoutePage() {
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
    <MainLayout requiredFeature="ASSETS">
      <AssetsPage userId={userId} />
    </MainLayout>
  );
}
