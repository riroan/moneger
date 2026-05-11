'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TransactionWithCategory } from '@/types';

interface DateRange {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

interface AmountRange {
  minAmount: number | null;
  maxAmount: number | null;
}

interface UseTransactionsProps {
  userId: string | null;
  filterType: 'ALL' | 'INCOME' | 'EXPENSE' | 'SAVINGS';
  filterCategories: string[];
  searchKeyword: string;
  sortOrder: 'recent' | 'oldest' | 'expensive' | 'cheapest';
  activeTab: 'dashboard' | 'transactions' | 'savings';
  dateRange: DateRange | null;
  amountRange: AmountRange | null;
  recurringFilter?: 'all' | 'only' | 'none';
}

export function useTransactions({
  userId,
  filterType,
  filterCategories,
  searchKeyword,
  sortOrder,
  activeTab,
  dateRange,
  amountRange,
  recurringFilter = 'all',
}: UseTransactionsProps) {
  const [allTransactions, setAllTransactions] = useState<TransactionWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingRef = useRef(false);

  const fetchTransactions = useCallback(async (cursor?: string | null, reset?: boolean) => {
    if (!userId) return;
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const params = new URLSearchParams({ userId, limit: '20' });

      if (cursor && !reset) {
        params.append('cursor', cursor);
      }

      if (filterType === 'SAVINGS') {
        params.append('savingsOnly', 'true');
      } else if (filterType !== 'ALL') {
        params.append('type', filterType);
      }

      if (filterCategories.length > 0) {
        filterCategories.forEach(catId => params.append('categoryId', catId));
      }

      if (searchKeyword.trim()) {
        params.append('search', searchKeyword.trim());
      }

      params.append('sort', sortOrder);

      if (dateRange) {
        params.append('startYear', dateRange.startYear.toString());
        params.append('startMonth', (dateRange.startMonth + 1).toString()); // 0-based to 1-based
        params.append('endYear', dateRange.endYear.toString());
        params.append('endMonth', (dateRange.endMonth + 1).toString()); // 0-based to 1-based
      }

      if (amountRange) {
        if (amountRange.minAmount !== null) {
          params.append('minAmount', amountRange.minAmount.toString());
        }
        if (amountRange.maxAmount !== null) {
          params.append('maxAmount', amountRange.maxAmount.toString());
        }
      }

      if (recurringFilter !== 'all') {
        params.append('recurring', recurringFilter);
      }

      const response = await fetch(`/api/transactions?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        if (reset) {
          setAllTransactions(data.data);
        } else {
          setAllTransactions(prev => [...prev, ...data.data]);
        }
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [userId, filterType, filterCategories, searchKeyword, sortOrder, dateRange, amountRange, recurringFilter]);

  const resetAndFetch = useCallback(() => {
    setNextCursor(null);
    setHasMore(true);
    fetchTransactions(null, true);
  }, [fetchTransactions]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading && nextCursor) {
      fetchTransactions(nextCursor);
    }
  }, [hasMore, isLoading, nextCursor, fetchTransactions]);

  // 탭 활성화 시 초기 로드 — fires only when tab/user changes, not when list grows
  useEffect(() => {
    if (activeTab === 'transactions' && userId && allTransactions.length === 0) {
      fetchTransactions(null, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userId]);

  // 필터 변경 시 리셋 — only react to filter prop changes, not callback identity
  useEffect(() => {
    if (activeTab === 'transactions' && userId) {
      resetAndFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterCategories, sortOrder, dateRange, amountRange, recurringFilter]);

  // 검색어 디바운스 — debounce on search input, ignore callback identity
  useEffect(() => {
    if (activeTab !== 'transactions' || !userId) return;

    const timer = setTimeout(() => {
      resetAndFetch();
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKeyword]);

  return {
    transactions: allTransactions,
    isLoading,
    hasMore,
    loadMore,
    refresh: resetAndFetch,
  };
}
