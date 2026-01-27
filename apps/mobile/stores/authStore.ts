import { create } from 'zustand';
import { storage } from '../lib/storage';
import { authApi } from '../lib/api';

interface AuthState {
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  userName: null,
  userEmail: null,
  isLoading: false,
  isInitialized: false,

  initAuth: async () => {
    try {
      const [userId, userName, userEmail] = await Promise.all([
        storage.getUserId(),
        storage.getUserName(),
        storage.getUserEmail(),
      ]);

      set({
        userId,
        userName,
        userEmail,
        isInitialized: true,
      });
    } catch (error) {
      console.error('Failed to init auth:', error);
      set({ isInitialized: true });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });

    try {
      const response = await authApi.login(email, password);

      if (!response.success || !response.data) {
        return { success: false, error: response.error || '로그인에 실패했습니다' };
      }

      const { user } = response.data;

      await Promise.all([
        storage.setUserId(user.id),
        storage.setUserName(user.name || ''),
        storage.setUserEmail(user.email),
      ]);

      set({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: '네트워크 오류가 발생했습니다' };
    } finally {
      set({ isLoading: false });
    }
  },

  signup: async (email: string, password: string, name: string) => {
    set({ isLoading: true });

    try {
      const response = await authApi.signup(email, password, name);

      if (!response.success) {
        return { success: false, error: response.error || '회원가입에 실패했습니다' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: '네트워크 오류가 발생했습니다' };
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await storage.clearUserData();
    set({
      userId: null,
      userName: null,
      userEmail: null,
    });
  },
}));
