import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '../../lib/storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiRemove: jest.fn(),
}));

describe('storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserId', () => {
    it('should return userId from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('user-123');

      const result = await storage.getUserId();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('userId');
      expect(result).toBe('user-123');
    });

    it('should return null when userId is not set', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await storage.getUserId();

      expect(result).toBeNull();
    });
  });

  describe('setUserId', () => {
    it('should save userId to AsyncStorage', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await storage.setUserId('user-123');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('userId', 'user-123');
    });
  });

  describe('getUserName', () => {
    it('should return userName from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('Test User');

      const result = await storage.getUserName();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('userName');
      expect(result).toBe('Test User');
    });
  });

  describe('setUserName', () => {
    it('should save userName to AsyncStorage', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await storage.setUserName('Test User');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('userName', 'Test User');
    });
  });

  describe('getUserEmail', () => {
    it('should return userEmail from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('test@example.com');

      const result = await storage.getUserEmail();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('userEmail');
      expect(result).toBe('test@example.com');
    });
  });

  describe('setUserEmail', () => {
    it('should save userEmail to AsyncStorage', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await storage.setUserEmail('test@example.com');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('userEmail', 'test@example.com');
    });
  });

  describe('getTheme', () => {
    it('should return dark theme from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');

      const result = await storage.getTheme();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('theme');
      expect(result).toBe('dark');
    });

    it('should return light theme from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('light');

      const result = await storage.getTheme();

      expect(result).toBe('light');
    });

    it('should return null when theme is not set', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await storage.getTheme();

      expect(result).toBeNull();
    });
  });

  describe('setTheme', () => {
    it('should save dark theme to AsyncStorage', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await storage.setTheme('dark');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    });

    it('should save light theme to AsyncStorage', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await storage.setTheme('light');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('theme', 'light');
    });
  });

  describe('clearUserData', () => {
    it('should remove all user data from AsyncStorage', async () => {
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

      await storage.clearUserData();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'userId',
        'userName',
        'userEmail',
      ]);
    });
  });
});
