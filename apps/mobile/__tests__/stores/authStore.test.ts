import { useAuthStore } from '../../stores/authStore';

// Mock the storage module
jest.mock('../../lib/storage', () => ({
  storage: {
    getUserId: jest.fn(),
    setUserId: jest.fn(),
    getUserName: jest.fn(),
    setUserName: jest.fn(),
    getUserEmail: jest.fn(),
    setUserEmail: jest.fn(),
    clearUserData: jest.fn(),
  },
}));

// Mock the api module
jest.mock('../../lib/api', () => ({
  authApi: {
    login: jest.fn(),
    signup: jest.fn(),
  },
}));

import { storage } from '../../lib/storage';
import { authApi } from '../../lib/api';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      userId: null,
      userName: null,
      userEmail: null,
      isLoading: false,
      isInitialized: false,
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have null user info by default', () => {
      const state = useAuthStore.getState();
      expect(state.userId).toBeNull();
      expect(state.userName).toBeNull();
      expect(state.userEmail).toBeNull();
    });

    it('should not be loading by default', () => {
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('should not be initialized by default', () => {
      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('initAuth', () => {
    it('should load user data from storage', async () => {
      (storage.getUserId as jest.Mock).mockResolvedValue('user-123');
      (storage.getUserName as jest.Mock).mockResolvedValue('Test User');
      (storage.getUserEmail as jest.Mock).mockResolvedValue('test@example.com');

      await useAuthStore.getState().initAuth();

      const state = useAuthStore.getState();
      expect(state.userId).toBe('user-123');
      expect(state.userName).toBe('Test User');
      expect(state.userEmail).toBe('test@example.com');
      expect(state.isInitialized).toBe(true);
    });

    it('should handle empty storage gracefully', async () => {
      (storage.getUserId as jest.Mock).mockResolvedValue(null);
      (storage.getUserName as jest.Mock).mockResolvedValue(null);
      (storage.getUserEmail as jest.Mock).mockResolvedValue(null);

      await useAuthStore.getState().initAuth();

      const state = useAuthStore.getState();
      expect(state.userId).toBeNull();
      expect(state.isInitialized).toBe(true);
    });

    it('should set isInitialized to true even on error', async () => {
      (storage.getUserId as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await useAuthStore.getState().initAuth();

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      (authApi.login as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          user: {
            id: 'user-123',
            name: 'Test User',
            email: 'test@example.com',
          },
        },
      });
      (storage.setUserId as jest.Mock).mockResolvedValue(undefined);
      (storage.setUserName as jest.Mock).mockResolvedValue(undefined);
      (storage.setUserEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await useAuthStore.getState().login('test@example.com', 'password');

      expect(result.success).toBe(true);
      expect(authApi.login).toHaveBeenCalledWith('test@example.com', 'password');

      const state = useAuthStore.getState();
      expect(state.userId).toBe('user-123');
      expect(state.userName).toBe('Test User');
      expect(state.userEmail).toBe('test@example.com');
      expect(state.isLoading).toBe(false);
    });

    it('should return error on failed login', async () => {
      (authApi.login as jest.Mock).mockResolvedValue({
        success: false,
        error: '이메일 또는 비밀번호가 일치하지 않습니다',
      });

      const result = await useAuthStore.getState().login('test@example.com', 'wrong-password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('이메일 또는 비밀번호가 일치하지 않습니다');

      const state = useAuthStore.getState();
      expect(state.userId).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should handle network error', async () => {
      (authApi.login as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await useAuthStore.getState().login('test@example.com', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('네트워크 오류가 발생했습니다');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should set isLoading during login process', async () => {
      let loadingDuringRequest = false;

      (authApi.login as jest.Mock).mockImplementation(async () => {
        loadingDuringRequest = useAuthStore.getState().isLoading;
        return {
          success: true,
          data: { user: { id: '1', name: 'Test', email: 'test@example.com' } },
        };
      });

      await useAuthStore.getState().login('test@example.com', 'password');

      expect(loadingDuringRequest).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('signup', () => {
    it('should signup successfully', async () => {
      (authApi.signup as jest.Mock).mockResolvedValue({
        success: true,
      });

      const result = await useAuthStore.getState().signup('test@example.com', 'password', 'Test User');

      expect(result.success).toBe(true);
      expect(authApi.signup).toHaveBeenCalledWith('test@example.com', 'password', 'Test User');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should return error on failed signup', async () => {
      (authApi.signup as jest.Mock).mockResolvedValue({
        success: false,
        error: '이미 사용 중인 이메일입니다',
      });

      const result = await useAuthStore.getState().signup('test@example.com', 'password', 'Test User');

      expect(result.success).toBe(false);
      expect(result.error).toBe('이미 사용 중인 이메일입니다');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should handle network error', async () => {
      (authApi.signup as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await useAuthStore.getState().signup('test@example.com', 'password', 'Test User');

      expect(result.success).toBe(false);
      expect(result.error).toBe('네트워크 오류가 발생했습니다');
    });
  });

  describe('logout', () => {
    it('should clear user data on logout', async () => {
      // Set initial authenticated state
      useAuthStore.setState({
        userId: 'user-123',
        userName: 'Test User',
        userEmail: 'test@example.com',
      });
      (storage.clearUserData as jest.Mock).mockResolvedValue(undefined);

      await useAuthStore.getState().logout();

      expect(storage.clearUserData).toHaveBeenCalled();

      const state = useAuthStore.getState();
      expect(state.userId).toBeNull();
      expect(state.userName).toBeNull();
      expect(state.userEmail).toBeNull();
    });
  });
});
