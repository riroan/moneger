'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore, useTransactionStore, type FilterType } from '@/stores';

export function useFilterHandlers() {
  const router = useRouter();
  const currentDate = useAppStore((state) => state.currentDate);
  const setFilters = useTransactionStore((state) => state.setFilters);

  const navigateWithFilter = useCallback(
    (filterType: FilterType, filterCategories: string[] = []) => {
      const month = currentDate.getMonth();
      const year = currentDate.getFullYear();

      setFilters({
        filterType,
        filterCategories,
        sortOrder: 'recent',
        searchKeyword: '',
        dateRange: {
          startYear: year,
          startMonth: month,
          endYear: year,
          endMonth: month,
        },
      });
      router.push('/transactions');
    },
    [currentDate, setFilters, router]
  );

  const handleCategoryClick = useCallback(
    (categoryId: string) => navigateWithFilter('EXPENSE', [categoryId]),
    [navigateWithFilter]
  );

  const handleIncomeClick = useCallback(
    () => navigateWithFilter('INCOME'),
    [navigateWithFilter]
  );

  const handleExpenseClick = useCallback(
    () => navigateWithFilter('EXPENSE'),
    [navigateWithFilter]
  );

  const handleBalanceClick = useCallback(
    () => navigateWithFilter('ALL'),
    [navigateWithFilter]
  );

  const handleSavingsClick = useCallback(() => {
    router.push('/savings');
  }, [router]);

  return {
    handleCategoryClick,
    handleIncomeClick,
    handleExpenseClick,
    handleBalanceClick,
    handleSavingsClick,
  };
}
