import { useAuthStore } from '../useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      userId: null,
      userName: '',
      userEmail: '',
      isLoading: true,
    });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('setAuth', () => {
    it('should update auth state partially', () => {
      useAuthStore.getState().setAuth({ userId: 'user-1', userName: '테스트' });

      const state = useAuthStore.getState();
      expect(state.userId).toBe('user-1');
      expect(state.userName).toBe('테스트');
      expect(state.userEmail).toBe(''); // unchanged
    });

    it('should update all auth fields', () => {
      useAuthStore.getState().setAuth({
        userId: 'user-1',
        userName: '테스트',
        userEmail: 'test@example.com',
        isLoading: false,
      });

      const state = useAuthStore.getState();
      expect(state.userId).toBe('user-1');
      expect(state.userName).toBe('테스트');
      expect(state.userEmail).toBe('test@example.com');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('fetchSession', () => {
    it('should return false when no valid session exists', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      const result = await useAuthStore.getState().fetchSession();

      expect(result).toBe(false);
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/me');
      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().userId).toBeNull();
    });

    it('should populate auth state from a valid session', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: { id: 'user-1', name: '테스트', email: 'test@example.com' } },
        }),
      });

      const result = await useAuthStore.getState().fetchSession();

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      expect(state.userId).toBe('user-1');
      expect(state.userName).toBe('테스트');
      expect(state.userEmail).toBe('test@example.com');
      expect(state.isLoading).toBe(false);
    });

    it('should handle missing name gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: { id: 'user-1', name: null, email: 'test@example.com' } },
        }),
      });

      const result = await useAuthStore.getState().fetchSession();

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      expect(state.userId).toBe('user-1');
      expect(state.userName).toBe('');
    });

    it('should clear auth state when the request throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network error'));

      const result = await useAuthStore.getState().fetchSession();

      expect(result).toBe(false);
      const state = useAuthStore.getState();
      expect(state.userId).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should call the logout endpoint and clear auth state', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      useAuthStore.setState({
        userId: 'user-1',
        userName: '테스트',
        userEmail: 'test@example.com',
        isLoading: false,
      });

      await useAuthStore.getState().logout();

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
      const state = useAuthStore.getState();
      expect(state.userId).toBeNull();
      expect(state.userName).toBe('');
      expect(state.userEmail).toBe('');
      expect(state.isLoading).toBe(false);
    });

    it('should clear auth state even when the request fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network error'));
      useAuthStore.setState({
        userId: 'user-1',
        userName: '테스트',
        userEmail: 'test@example.com',
        isLoading: false,
      });

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.userId).toBeNull();
    });
  });
});
