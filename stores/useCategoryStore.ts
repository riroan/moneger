import { create } from 'zustand';
import type { Category } from '@/types';

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
}

interface CategoryActions {
  setCategories: (categories: Category[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  fetchCategories: (userId: string) => Promise<void>;
}

type CategoryStore = CategoryState & CategoryActions;

export const useCategoryStore = create<CategoryStore>((set) => ({
  categories: [],
  isLoading: false,

  setCategories: (categories) => set({ categories }),
  setIsLoading: (isLoading) => set({ isLoading }),

  fetchCategories: async (userId: string) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`/api/categories?userId=${userId}`);
      const data = await response.json();

      if (data.success && data.data.length > 0) {
        set({ categories: data.data });
      } else {
        // 카테고리가 없으면 기본 카테고리 생성
        const seedResponse = await fetch('/api/categories/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        const seedData = await seedResponse.json();
        if (seedData.success) {
          set({ categories: seedData.data });
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      set({ isLoading: false });
    }
  },
}));
