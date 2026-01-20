'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthState {
  userId: string | null;
  userName: string;
  userEmail: string;
  isLoading: boolean;
}

export function useAuth() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    userId: null,
    userName: '',
    userEmail: '',
    isLoading: true,
  });

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedUserName = localStorage.getItem('userName');
    const storedUserEmail = localStorage.getItem('userEmail');

    if (!storedUserId) {
      router.push('/login');
      return;
    }

    setAuthState({
      userId: storedUserId,
      userName: storedUserName || '',
      userEmail: storedUserEmail || '',
      isLoading: false,
    });
  }, [router]);

  const logout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    router.push('/login');
  };

  return { ...authState, logout };
}
