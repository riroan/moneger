import { useCategoryStore } from '../useCategoryStore';

// Mock fetch
global.fetch = jest.fn();

describe('useCategoryStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCategoryStore.setState({
      categories: [],
      isLoading: false,
    });
    jest.clearAllMocks();
  });

  describe('setCategories', () => {
    it('should set categories', () => {
      const categories = [
        { id: 'cat-1', name: '식비', type: 'EXPENSE' as const, color: '#EF4444', icon: '🍽️', userId: 'user-1', defaultBudget: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: 'cat-2', name: '교통비', type: 'EXPENSE' as const, color: '#3B82F6', icon: '🚗', userId: 'user-1', defaultBudget: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
      ];

      useCategoryStore.getState().setCategories(categories);

      expect(useCategoryStore.getState().categories).toEqual(categories);
    });

    it('should replace existing categories', () => {
      const initialCategories = [
        { id: 'cat-1', name: '식비', type: 'EXPENSE' as const, color: '#EF4444', icon: '🍽️', userId: 'user-1', defaultBudget: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
      ];
      const newCategories = [
        { id: 'cat-2', name: '교통비', type: 'EXPENSE' as const, color: '#3B82F6', icon: '🚗', userId: 'user-1', defaultBudget: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
      ];

      useCategoryStore.setState({ categories: initialCategories });
      useCategoryStore.getState().setCategories(newCategories);

      expect(useCategoryStore.getState().categories).toEqual(newCategories);
    });
  });

  describe('setIsLoading', () => {
    it('should set isLoading to true', () => {
      useCategoryStore.getState().setIsLoading(true);

      expect(useCategoryStore.getState().isLoading).toBe(true);
    });

    it('should set isLoading to false', () => {
      useCategoryStore.setState({ isLoading: true });
      useCategoryStore.getState().setIsLoading(false);

      expect(useCategoryStore.getState().isLoading).toBe(false);
    });
  });

  describe('fetchCategories', () => {
    it('should fetch and set categories when API returns data', async () => {
      const mockCategories = [
        { id: 'cat-1', name: '식비', type: 'EXPENSE', color: '#EF4444', icon: '🍽️' },
        { id: 'cat-2', name: '급여', type: 'INCOME', color: '#10B981', icon: '💰' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockCategories }),
      });

      await useCategoryStore.getState().fetchCategories('user-1');

      expect(global.fetch).toHaveBeenCalledWith('/api/categories?userId=user-1');
      expect(useCategoryStore.getState().categories).toEqual(mockCategories);
      expect(useCategoryStore.getState().isLoading).toBe(false);
    });

    it('should set isLoading to true during fetch', async () => {
      let loadingDuringFetch = false;

      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        loadingDuringFetch = useCategoryStore.getState().isLoading;
        return { json: async () => ({ success: true, data: [] }) };
      });

      await useCategoryStore.getState().fetchCategories('user-1');

      expect(loadingDuringFetch).toBe(true);
    });

    it('should seed categories when API returns empty data', async () => {
      const mockSeedCategories = [
        { id: 'cat-1', name: '식비', type: 'EXPENSE', color: '#EF4444', icon: '🍽️' },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: [] }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: mockSeedCategories }),
        });

      await useCategoryStore.getState().fetchCategories('user-1');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/categories/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-1' }),
      });
      expect(useCategoryStore.getState().categories).toEqual(mockSeedCategories);
    });

    it('should seed categories when API returns success: false', async () => {
      const mockSeedCategories = [
        { id: 'cat-1', name: '식비', type: 'EXPENSE', color: '#EF4444', icon: '🍽️' },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({ success: false, data: null }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: mockSeedCategories }),
        });

      await useCategoryStore.getState().fetchCategories('user-1');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(useCategoryStore.getState().categories).toEqual(mockSeedCategories);
    });

    it('should handle fetch error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await useCategoryStore.getState().fetchCategories('user-1');

      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch categories:', 'Network error');
      expect(useCategoryStore.getState().isLoading).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should set isLoading to false even on error', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await useCategoryStore.getState().fetchCategories('user-1');

      expect(useCategoryStore.getState().isLoading).toBe(false);
    });

    it('should handle seed failure gracefully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: [] }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ success: false }),
        });

      await useCategoryStore.getState().fetchCategories('user-1');

      // Categories should remain empty when seed fails
      expect(useCategoryStore.getState().categories).toEqual([]);
      expect(useCategoryStore.getState().isLoading).toBe(false);
    });
  });
});
