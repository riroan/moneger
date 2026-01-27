import { create } from 'zustand';

interface AuthState {
  userId: string | null;
  userName: string;
  userEmail: string;
  isLoading: boolean;
}

interface AuthActions {
  setAuth: (auth: Partial<AuthState>) => void;
  initAuth: () => boolean;
  logout: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  userId: null,
  userName: '',
  userEmail: '',
  isLoading: true,

  setAuth: (auth) => set((state) => ({ ...state, ...auth })),

  initAuth: () => {
    if (typeof window === 'undefined') return false;

    const storedUserId = localStorage.getItem('userId');
    const storedUserName = localStorage.getItem('userName');
    const storedUserEmail = localStorage.getItem('userEmail');

    if (!storedUserId) {
      set({ isLoading: false });
      return false;
    }

    set({
      userId: storedUserId,
      userName: storedUserName || '',
      userEmail: storedUserEmail || '',
      isLoading: false,
    });
    return true;
  },

  logout: () => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');

    set({
      userId: null,
      userName: '',
      userEmail: '',
      isLoading: false,
    });
  },
}));
