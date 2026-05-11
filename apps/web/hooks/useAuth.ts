'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthState {
  userId: string | null;
  userName: string;
  userEmail: string;
  isLoading: boolean;
}

function readAuthFromStorage(): AuthState {
  if (typeof window === 'undefined') {
    return { userId: null, userName: '', userEmail: '', isLoading: true };
  }
  const storedUserId = localStorage.getItem('userId');
  return {
    userId: storedUserId,
    userName: localStorage.getItem('userName') || '',
    userEmail: localStorage.getItem('userEmail') || '',
    isLoading: false,
  };
}

export function useAuth() {
  const router = useRouter();
  const [authState] = useState<AuthState>(readAuthFromStorage);

  useEffect(() => {
    if (!authState.userId) {
      router.push('/');
    }
  }, [authState.userId, router]);

  const logout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    router.push('/');
  };

  return { ...authState, logout };
}
