'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import MainLayout from '@/components/layout/MainLayout';
import AssetsTab from '@/components/assets/AssetsTab';

export default function AssetsPage() {
  const router = useRouter();
  const { userId, isLoading: isAuthLoading, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isAuthLoading && !userId) {
      router.push('/');
    }
  }, [isAuthLoading, userId, router]);

  if (isAuthLoading || !userId) return null;

  return (
    <MainLayout>
      <AssetsTab userId={userId} />
    </MainLayout>
  );
}
