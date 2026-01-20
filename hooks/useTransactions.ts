'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTransactionsProps {
  userId: string | null;
  filterType: 'ALL' | 'INCOME' | 'EXPENSE';
  filterCategories: string[];
  searchKeyword: string;
  sortOrder: 'recent' | 'oldest' | 'expensive' | 'cheapest';
  activeTab: 'dashboard' | 'transactions';
}

export function useTransactions({
  userId,
  filterType,
  filterCategories,
  searchKeyword,
  sortOrder,
  activeTab,
}: UseTransactionsProps) {
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
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

      if (filterType !== 'ALL') {
        params.append('type', filterType);
      }

      if (filterCategories.length > 0) {
        filterCategories.forEach(catId => params.append('categoryId', catId));
      }

      if (searchKeyword.trim()) {
        params.append('search', searchKeyword.trim());
      }

      params.append('sort', sortOrder);

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
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [userId, filterType, filterCategories, searchKeyword, sortOrder]);

  const resetAndFetch = useCallback(() => {
    setAllTransactions([]);
    setNextCursor(null);
    setHasMore(true);
    fetchTransactions(null, true);
  }, [fetchTransactions]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading && nextCursor) {
      fetchTransactions(nextCursor);
    }
  }, [hasMore, isLoading, nextCursor, fetchTransactions]);

  // 탭 활성화 시 초기 로드
  useEffect(() => {
    if (activeTab === 'transactions' && userId && allTransactions.length === 0) {
      fetchTransactions(null, true);
    }
  }, [activeTab, userId]);

  // 필터 변경 시 리셋
  useEffect(() => {
    if (activeTab === 'transactions' && userId) {
      resetAndFetch();
    }
  }, [filterType, filterCategories, sortOrder]);

  // 검색어 디바운스
  useEffect(() => {
    if (activeTab !== 'transactions' || !userId) return;

    const timer = setTimeout(() => {
      resetAndFetch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchKeyword]);

  return {
    transactions: allTransactions,
    isLoading,
    hasMore,
    loadMore,
    refresh: resetAndFetch,
  };
}
