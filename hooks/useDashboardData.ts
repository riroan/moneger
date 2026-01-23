'use client';

import { useEffect, useCallback } from 'react';
import { useAuthStore, useAppStore, useTransactionStore, useCategoryStore } from '@/stores';

export function useDashboardData() {
  const userId = useAuthStore((state) => state.userId);
  const currentDate = useAppStore((state) => state.currentDate);

  const {
    setRecentTransactions,
    setSummary,
    setTodaySummary,
    setLastMonthBalance,
    setOldestTransactionDate,
    setIsLoadingTransactions,
    setIsLoadingSummary,
    setIsLoadingTodaySummary,
  } = useTransactionStore();

  const { fetchCategories } = useCategoryStore();

  // Initial data loading
  useEffect(() => {
    if (!userId) return;

    const fetchInitialData = async () => {
      setIsLoadingTransactions(true);
      setIsLoadingTodaySummary(true);

      try {
        const [categoriesPromise, oldestDateRes, recentRes, todayRes] = await Promise.all([
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

        if (oldestDateData.success && oldestDateData.data.year && oldestDateData.data.month) {
          setOldestTransactionDate({
            year: oldestDateData.data.year,
            month: oldestDateData.data.month,
          });
        }

        if (recentData.success) {
          setRecentTransactions(recentData.data);
        }

        if (todayData.success) {
          setTodaySummary(todayData.data);
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      } finally {
        setIsLoadingTransactions(false);
        setIsLoadingTodaySummary(false);
      }
    };

    fetchInitialData();
  }, [userId, fetchCategories, setRecentTransactions, setTodaySummary, setOldestTransactionDate, setIsLoadingTransactions, setIsLoadingTodaySummary]);

  // Summary data loading (when month changes)
  useEffect(() => {
    if (!userId) return;

    const fetchSummary = async () => {
      setIsLoadingSummary(true);

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

        if (currentData.success) {
          setSummary(currentData.data);
        }

        if (lastData.success) {
          setLastMonthBalance(lastData.data.summary.balance || 0);
        }
      } catch (error) {
        console.error('Failed to fetch summary:', error);
      } finally {
        setIsLoadingSummary(false);
      }
    };

    fetchSummary();
  }, [userId, currentDate, setSummary, setLastMonthBalance, setIsLoadingSummary]);

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

    if (recentData.success) {
      setRecentTransactions(recentData.data);
    }

    if (summaryData.success) {
      setSummary(summaryData.data);
    }

    if (todayData.success) {
      setTodaySummary(todayData.data);
    }
  }, [userId, currentDate, setRecentTransactions, setSummary, setTodaySummary]);

  return { refreshData };
}
