import { create } from 'zustand';
import { storage } from '../lib/storage';
import { Appearance } from 'react-native';

type ThemeType = 'dark' | 'light';

interface ThemeState {
  theme: ThemeType;
  isInitialized: boolean;

  initTheme: () => Promise<void>;
  toggleTheme: () => Promise<void>;
  setTheme: (theme: ThemeType) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  isInitialized: false,

  initTheme: async () => {
    try {
      const savedTheme = await storage.getTheme();
      if (savedTheme) {
        set({ theme: savedTheme, isInitialized: true });
      } else {
        // Use system preference
        const systemTheme = Appearance.getColorScheme() || 'dark';
        set({ theme: systemTheme, isInitialized: true });
      }
    } catch (error) {
      console.error('Failed to init theme:', error);
      set({ isInitialized: true });
    }
  },

  toggleTheme: async () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    await storage.setTheme(newTheme);
    set({ theme: newTheme });
  },

  setTheme: async (theme: ThemeType) => {
    await storage.setTheme(theme);
    set({ theme });
  },
}));
