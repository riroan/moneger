'use client';

import { useEffect, useCallback } from 'react';
import { useAuthStore, useAppStore, useTransactionStore, useCategoryStore } from '@/stores';

export function useDashboardData() {
  const userId = useAuthStore((state) => state.userId);
  const currentDate = useAppStore((state) => state.currentDate);
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);

  // Initial data loading
  useEffect(() => {
    if (!userId) return;

    const store = useTransactionStore.getState();
    store.setIsLoadingTransactions(true);
    store.setIsLoadingTodaySummary(true);

    const fetchInitialData = async () => {
      try {
        const [, oldestDateRes, recentRes, todayRes] = await Promise.all([
          fetchCategories(userId),
          fetch(`/api/transactions/oldest-date?userId=${userId}`),
          fetch(`/api/transactions/recent?userId=${userId}&limit=10`),
          fetch(`/api/transactions/today?userId=${userId}`),
        ]);

        const [oldestDateData, recentData, todayData] = await Promise.all([
          oldestDateRes.json(),
          recentRes.json(),
          todayRes.json(),
        ]);

        const s = useTransactionStore.getState();
        if (oldestDateData.success && oldestDateData.data.year && oldestDateData.data.month) {
          s.setOldestTransactionDate({
            year: oldestDateData.data.year,
            month: oldestDateData.data.month,
          });
        }

        if (recentData.success) {
          s.setRecentTransactions(recentData.data);
        }

        if (todayData.success) {
          s.setTodaySummary(todayData.data);
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        const s = useTransactionStore.getState();
        s.setIsLoadingTransactions(false);
        s.setIsLoadingTodaySummary(false);
      }
    };

    fetchInitialData();
  }, [userId, fetchCategories]);

  // Summary data loading (when month changes)
  useEffect(() => {
    if (!userId) return;

    useTransactionStore.getState().setIsLoadingSummary(true);

    const fetchSummary = async () => {
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const lastMonth = new Date(currentDate);
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const [currentRes, lastRes] = await Promise.all([
          fetch(`/api/transactions/summary?userId=${userId}&year=${year}&month=${month}`),
          fetch(`/api/transactions/summary?userId=${userId}&year=${lastMonth.getFullYear()}&month=${lastMonth.getMonth() + 1}`),
        ]);

        const [currentData, lastData] = await Promise.all([
          currentRes.json(),
          lastRes.json(),
        ]);

        const s = useTransactionStore.getState();
        if (currentData.success) {
          s.setSummary(currentData.data);
        }

        if (lastData.success) {
          s.setLastMonthBalance(lastData.data.summary.balance || 0);
        }
      } catch (error) {
        console.error('Failed to fetch summary:', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        useTransactionStore.getState().setIsLoadingSummary(false);
      }
    };

    fetchSummary();
  }, [userId, currentDate]);

  // Refresh data function
  const refreshData = useCallback(async () => {
    if (!userId) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    const [recentRes, summaryRes, todayRes] = await Promise.all([
      fetch(`/api/transactions/recent?userId=${userId}&limit=10`),
      fetch(`/api/transactions/summary?userId=${userId}&year=${year}&month=${month}`),
      fetch(`/api/transactions/today?userId=${userId}`),
    ]);

    const [recentData, summaryData, todayData] = await Promise.all([
      recentRes.json(),
      summaryRes.json(),
      todayRes.json(),
    ]);

    const s = useTransactionStore.getState();
    if (recentData.success) {
      s.setRecentTransactions(recentData.data);
    }

    if (summaryData.success) {
      s.setSummary(summaryData.data);
    }

    if (todayData.success) {
      s.setTodaySummary(todayData.data);
    }
  }, [userId, currentDate]);

  return { refreshData };
}
