'use client';

import { useCallback } from 'react';
import { useAppStore, useTransactionStore } from '@/stores';

export function useFilterHandlers() {
  const currentDate = useAppStore((state) => state.currentDate);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
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
    setActiveTab('transactions');
  }, [currentDate, setFilters, setActiveTab]);

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
    setActiveTab('transactions');
  }, [currentDate, setFilters, setActiveTab]);

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
    setActiveTab('transactions');
  }, [currentDate, setFilters, setActiveTab]);

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
    setActiveTab('transactions');
  }, [currentDate, setFilters, setActiveTab]);

  const handleSavingsClick = useCallback(() => {
    setActiveTab('savings');
  }, [setActiveTab]);

  return {
    handleCategoryClick,
    handleIncomeClick,
    handleExpenseClick,
    handleBalanceClick,
    handleSavingsClick,
  };
}
