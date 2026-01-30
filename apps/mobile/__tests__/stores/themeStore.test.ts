import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { useThemeStore } from '../../stores/themeStore';

// Mock the storage module
jest.mock('../../lib/storage', () => ({
  storage: {
    getTheme: jest.fn(),
    setTheme: jest.fn(),
  },
}));

import { storage } from '../../lib/storage';

describe('themeStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useThemeStore.setState({ theme: 'dark', isInitialized: false });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have default theme as dark', () => {
      const state = useThemeStore.getState();
      expect(state.theme).toBe('dark');
    });

    it('should not be initialized by default', () => {
      const state = useThemeStore.getState();
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('initTheme', () => {
    it('should load saved theme from storage', async () => {
      (storage.getTheme as jest.Mock).mockResolvedValue('light');

      await useThemeStore.getState().initTheme();

      const state = useThemeStore.getState();
      expect(state.theme).toBe('light');
      expect(state.isInitialized).toBe(true);
    });

    it('should use system preference when no saved theme', async () => {
      (storage.getTheme as jest.Mock).mockResolvedValue(null);
      (Appearance.getColorScheme as jest.Mock).mockReturnValue('light');

      await useThemeStore.getState().initTheme();

      const state = useThemeStore.getState();
      expect(state.theme).toBe('light');
      expect(state.isInitialized).toBe(true);
    });

    it('should default to dark when system preference is null', async () => {
      (storage.getTheme as jest.Mock).mockResolvedValue(null);
      (Appearance.getColorScheme as jest.Mock).mockReturnValue(null);

      await useThemeStore.getState().initTheme();

      const state = useThemeStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.isInitialized).toBe(true);
    });

    it('should set isInitialized to true even on error', async () => {
      (storage.getTheme as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await useThemeStore.getState().initTheme();

      const state = useThemeStore.getState();
      expect(state.isInitialized).toBe(true);
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from dark to light', async () => {
      (storage.setTheme as jest.Mock).mockResolvedValue(undefined);
      useThemeStore.setState({ theme: 'dark' });

      await useThemeStore.getState().toggleTheme();

      const state = useThemeStore.getState();
      expect(state.theme).toBe('light');
      expect(storage.setTheme).toHaveBeenCalledWith('light');
    });

    it('should toggle from light to dark', async () => {
      (storage.setTheme as jest.Mock).mockResolvedValue(undefined);
      useThemeStore.setState({ theme: 'light' });

      await useThemeStore.getState().toggleTheme();

      const state = useThemeStore.getState();
      expect(state.theme).toBe('dark');
      expect(storage.setTheme).toHaveBeenCalledWith('dark');
    });
  });

  describe('setTheme', () => {
    it('should set theme to specified value', async () => {
      (storage.setTheme as jest.Mock).mockResolvedValue(undefined);

      await useThemeStore.getState().setTheme('light');

      const state = useThemeStore.getState();
      expect(state.theme).toBe('light');
      expect(storage.setTheme).toHaveBeenCalledWith('light');
    });
  });
});
