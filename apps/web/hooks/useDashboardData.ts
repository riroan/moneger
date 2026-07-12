'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore, useAppStore, useTransactionStore, useCategoryStore } from '@/stores';

export function useDashboardData() {
  const userId = useAuthStore((state) => state.userId);
  const currentDate = useAppStore((state) => state.currentDate);
  const setCategories = useCategoryStore((state) => state.setCategories);
  const summaryDataKeyRef = useRef<string | null>(null);
  const summaryInFlightKeyRef = useRef<string | null>(null);

  const getSummaryKey = useCallback((date: Date) => {
    return `${useAuthStore.getState().userId}:${date.getFullYear()}-${date.getMonth() + 1}`;
  }, []);

  const isActiveSummaryKey = useCallback((summaryKey: string) => {
    return getSummaryKey(useAppStore.getState().currentDate) === summaryKey;
  }, [getSummaryKey]);

  // Initial data loading
  useEffect(() => {
    if (!userId) {
      summaryDataKeyRef.current = null;
      summaryInFlightKeyRef.current = null;
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
    summaryInFlightKeyRef.current = summaryKey;
    let cancelled = false;

    const fetchInitialData = async () => {
      try {
        const response = await fetch(`/api/dashboard/bootstrap?year=${year}&month=${month}&recentLimit=10`);
        const bootstrapData = response.ok ? await response.json() : null;
        if (cancelled) return;
        if (!bootstrapData?.success) {
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

        if (isActiveSummaryKey(summaryKey)) {
          s.setSummary(bootstrapData.data.summary);
          s.setLastMonthBalance(bootstrapData.data.lastMonthBalance || 0);
          summaryDataKeyRef.current = summaryKey;
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        if (cancelled) return;
        const shouldClearSummaryLoading = summaryInFlightKeyRef.current === summaryKey;
        if (summaryInFlightKeyRef.current === summaryKey) {
          summaryInFlightKeyRef.current = null;
        }
        const s = useTransactionStore.getState();
        s.setIsLoadingTransactions(false);
        s.setIsLoadingTodaySummary(false);
        if (shouldClearSummaryLoading) {
          s.setIsLoadingSummary(false);
        }
      }
    };

    fetchInitialData();
    return () => {
      cancelled = true;
    };
  }, [userId, setCategories, isActiveSummaryKey]);

  // Summary data loading (when month changes)
  useEffect(() => {
    if (!userId) return;

    const fetchSummary = async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const summaryKey = `${userId}:${year}-${month}`;
      if (summaryDataKeyRef.current === summaryKey || summaryInFlightKeyRef.current === summaryKey) return;

      summaryInFlightKeyRef.current = summaryKey;
      useTransactionStore.getState().setIsLoadingSummary(true);

      try {
        const lastMonth = new Date(currentDate);
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const [currentRes, lastRes] = await Promise.all([
          fetch(`/api/transactions/summary?year=${year}&month=${month}`),
          fetch(`/api/transactions/summary?year=${lastMonth.getFullYear()}&month=${lastMonth.getMonth() + 1}`),
        ]);

        const [currentData, lastData] = await Promise.all([
          currentRes.ok ? currentRes.json() : null,
          lastRes.ok ? lastRes.json() : null,
        ]);

        const s = useTransactionStore.getState();
        if (currentData?.success && isActiveSummaryKey(summaryKey)) {
          s.setSummary(currentData.data);
          summaryDataKeyRef.current = summaryKey;
        }

        if (lastData?.success && isActiveSummaryKey(summaryKey)) {
          s.setLastMonthBalance(lastData.data.summary.balance || 0);
        }
      } catch (error) {
        console.error('Failed to fetch summary:', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        if (summaryInFlightKeyRef.current === summaryKey) {
          summaryInFlightKeyRef.current = null;
          useTransactionStore.getState().setIsLoadingSummary(false);
        }
      }
    };

    fetchSummary();
  }, [userId, currentDate, isActiveSummaryKey]);

  // Refresh data function
  const refreshData = useCallback(async () => {
    if (!userId) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    try {
      const [recentRes, summaryRes, todayRes] = await Promise.all([
        fetch(`/api/transactions/recent?limit=10`),
        fetch(`/api/transactions/summary?year=${year}&month=${month}`),
        fetch(`/api/transactions/today`),
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
