import { create } from 'zustand';

interface AuthState {
  userId: string | null;
  userName: string;
  userEmail: string;
  isLoading: boolean;
}

interface AuthActions {
  setAuth: (auth: Partial<AuthState>) => void;
  fetchSession: () => Promise<boolean>;
  logout: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  userId: null,
  userName: '',
  userEmail: '',
  isLoading: true,

  setAuth: (auth) => set((state) => ({ ...state, ...auth })),

  fetchSession: async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        set({ userId: null, userName: '', userEmail: '', isLoading: false });
        return false;
      }
      const { data } = await res.json();
      set({
        userId: data.user.id,
        userName: data.user.name || '',
        userEmail: data.user.email,
        isLoading: false,
      });
      return true;
    } catch {
      set({ userId: null, userName: '', userEmail: '', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    set({ userId: null, userName: '', userEmail: '', isLoading: false });
  },
}));
