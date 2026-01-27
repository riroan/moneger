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
    // Clear localStorage
    localStorage.clear();
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

  describe('initAuth', () => {
    it('should return false when no userId in localStorage', () => {
      const result = useAuthStore.getState().initAuth();

      expect(result).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should initialize auth from localStorage', () => {
      localStorage.setItem('userId', 'user-1');
      localStorage.setItem('userName', '테스트');
      localStorage.setItem('userEmail', 'test@example.com');

      const result = useAuthStore.getState().initAuth();

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      expect(state.userId).toBe('user-1');
      expect(state.userName).toBe('테스트');
      expect(state.userEmail).toBe('test@example.com');
      expect(state.isLoading).toBe(false);
    });

    it('should handle missing userName and userEmail', () => {
      localStorage.setItem('userId', 'user-1');

      const result = useAuthStore.getState().initAuth();

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      expect(state.userId).toBe('user-1');
      expect(state.userName).toBe('');
      expect(state.userEmail).toBe('');
    });
  });

  describe('logout', () => {
    it('should clear auth state and localStorage', () => {
      // Set initial auth state
      localStorage.setItem('userId', 'user-1');
      localStorage.setItem('userName', '테스트');
      localStorage.setItem('userEmail', 'test@example.com');
      useAuthStore.setState({
        userId: 'user-1',
        userName: '테스트',
        userEmail: 'test@example.com',
        isLoading: false,
      });

      useAuthStore.getState().logout();

      // Check state is cleared
      const state = useAuthStore.getState();
      expect(state.userId).toBeNull();
      expect(state.userName).toBe('');
      expect(state.userEmail).toBe('');
      expect(state.isLoading).toBe(false);

      // Check localStorage is cleared
      expect(localStorage.getItem('userId')).toBeNull();
      expect(localStorage.getItem('userName')).toBeNull();
      expect(localStorage.getItem('userEmail')).toBeNull();
    });
  });
});
