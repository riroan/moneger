'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore, useTransactionStore } from '@/stores';

export function useFilterHandlers() {
  const router = useRouter();
  const currentDate = useAppStore((state) => state.currentDate);
  const setFilters = useTransactionStore((state) => state.setFilters);

  const handleCategoryClick = useCallback((categoryId: string) => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    setFilters({
      filterType: 'EXPENSE',
      filterCategories: [categoryId],
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
  }, [currentDate, setFilters, router]);

  const handleIncomeClick = useCallback(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    setFilters({
      filterType: 'INCOME',
      filterCategories: [],
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
  }, [currentDate, setFilters, router]);

  const handleExpenseClick = useCallback(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    setFilters({
      filterType: 'EXPENSE',
      filterCategories: [],
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
  }, [currentDate, setFilters, router]);

  const handleBalanceClick = useCallback(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    setFilters({
      filterType: 'ALL',
      filterCategories: [],
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
  }, [currentDate, setFilters, router]);

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
