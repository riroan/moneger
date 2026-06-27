'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore, useAppStore, useTransactionStore, useCategoryStore } from '@/stores';

export function useDashboardData() {
  const userId = useAuthStore((state) => state.userId);
  const currentDate = useAppStore((state) => state.currentDate);
  const setCategories = useCategoryStore((state) => state.setCategories);
  const bootstrapSummaryKeyRef = useRef<string | null>(null);

  // Initial data loading
  useEffect(() => {
    if (!userId) {
      bootstrapSummaryKeyRef.current = null;
      return;
    }

    const store = useTransactionStore.getState();
    store.setIsLoadingTransactions(true);
    store.setIsLoadingTodaySummary(true);
    store.setIsLoadingSummary(true);

    const initialDate = useAppStore.getState().currentDate;
    const year = initialDate.getFullYear();
    const month = initialDate.getMonth() + 1;
    const summaryKey = `${userId}:${year}-${month}`;
    bootstrapSummaryKeyRef.current = summaryKey;
    let cancelled = false;

    const fetchInitialData = async () => {
      try {
        const response = await fetch(`/api/dashboard/bootstrap?userId=${userId}&year=${year}&month=${month}&recentLimit=10`);
        const bootstrapData = response.ok ? await response.json() : null;
        if (cancelled) return;
        if (!bootstrapData?.success) {
          bootstrapSummaryKeyRef.current = null;
          return;
        }

        const s = useTransactionStore.getState();
        setCategories(bootstrapData.data.categories);

        if (bootstrapData.data.oldestTransactionDate?.year && bootstrapData.data.oldestTransactionDate?.month) {
          s.setOldestTransactionDate({
            year: bootstrapData.data.oldestTransactionDate.year,
            month: bootstrapData.data.oldestTransactionDate.month,
          });
        }

        s.setRecentTransactions(bootstrapData.data.recentTransactions);
        s.setTodaySummary(bootstrapData.data.todaySummary);
        s.setSummary(bootstrapData.data.summary);
        s.setLastMonthBalance(bootstrapData.data.lastMonthBalance || 0);
      } catch (error) {
        bootstrapSummaryKeyRef.current = null;
        console.error('Failed to fetch initial data:', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        if (cancelled) return;
        const s = useTransactionStore.getState();
        s.setIsLoadingTransactions(false);
        s.setIsLoadingTodaySummary(false);
        s.setIsLoadingSummary(false);
      }
    };

    fetchInitialData();
    return () => {
      cancelled = true;
    };
  }, [userId, setCategories]);

  // Summary data loading (when month changes)
  useEffect(() => {
    if (!userId) return;

    useTransactionStore.getState().setIsLoadingSummary(true);

    const fetchSummary = async () => {
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const summaryKey = `${userId}:${year}-${month}`;
        if (bootstrapSummaryKeyRef.current === summaryKey) return;

        const lastMonth = new Date(currentDate);
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const [currentRes, lastRes] = await Promise.all([
          fetch(`/api/transactions/summary?userId=${userId}&year=${year}&month=${month}`),
          fetch(`/api/transactions/summary?userId=${userId}&year=${lastMonth.getFullYear()}&month=${lastMonth.getMonth() + 1}`),
        ]);

        const [currentData, lastData] = await Promise.all([
          currentRes.ok ? currentRes.json() : null,
          lastRes.ok ? lastRes.json() : null,
        ]);

        const s = useTransactionStore.getState();
        if (currentData?.success) {
          s.setSummary(currentData.data);
        }

        if (lastData?.success) {
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

    try {
      const [recentRes, summaryRes, todayRes] = await Promise.all([
        fetch(`/api/transactions/recent?userId=${userId}&limit=10`),
        fetch(`/api/transactions/summary?userId=${userId}&year=${year}&month=${month}`),
        fetch(`/api/transactions/today?userId=${userId}`),
      ]);

      // Skip parsing failed responses; an HTML error page would throw inside .json()
      const [recentData, summaryData, todayData] = await Promise.all([
        recentRes.ok ? recentRes.json() : null,
        summaryRes.ok ? summaryRes.json() : null,
        todayRes.ok ? todayRes.json() : null,
      ]);

      const s = useTransactionStore.getState();
      if (recentData?.success) {
        s.setRecentTransactions(recentData.data);
      }

      if (summaryData?.success) {
        s.setSummary(summaryData.data);
      }

      if (todayData?.success) {
        s.setTodaySummary(todayData.data);
      }
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error instanceof Error ? error.message : 'Unknown error');
    }
  }, [userId, currentDate]);

  return { refreshData };
}
