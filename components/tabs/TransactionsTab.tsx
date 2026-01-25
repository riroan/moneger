'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useAuthStore, useTransactionStore, useCategoryStore } from '@/stores';
import { useTransactions } from '@/hooks/useTransactions';
import FilterPanel from '@/components/transactions/FilterPanel';
import TransactionList from '@/components/transactions/TransactionList';
import { MdReceipt } from 'react-icons/md';
import type { TransactionWithCategory } from '@/types';

interface TransactionsTabProps {
  onTransactionClick: (tx: TransactionWithCategory) => void;
  onRefresh?: () => void;
}

export default function TransactionsTab({ onTransactionClick, onRefresh }: TransactionsTabProps) {
  const userId = useAuthStore((state) => state.userId);
  const categories = useCategoryStore((state) => state.categories);
  const {
    filterType,
    setFilterType,
    filterCategories,
    setFilterCategories,
    searchKeyword,
    setSearchKeyword,
    sortOrder,
    setSortOrder,
    isFilterOpen,
    setIsFilterOpen,
    dateRange,
    setDateRange,
    amountRange,
    setAmountRange,
    oldestTransactionDate,
  } = useTransactionStore();

  const transactionsEndRef = useRef<HTMLDivElement>(null);

  const {
    transactions: allTransactions,
    isLoading: isLoadingAllTransactions,
    hasMore: hasMoreTransactions,
    loadMore: loadMoreTransactions,
    refresh: refreshAllTransactions,
  } = useTransactions({
    userId,
    filterType,
    filterCategories,
    searchKeyword,
    sortOrder,
    activeTab: 'transactions',
    dateRange,
    amountRange,
  });

  // Infinite scroll
  useEffect(() => {
    if (!transactionsEndRef.current || !hasMoreTransactions) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreTransactions && !isLoadingAllTransactions) {
          loadMoreTransactions();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(transactionsEndRef.current);
    return () => observer.disconnect();
  }, [hasMoreTransactions, isLoadingAllTransactions, loadMoreTransactions]);

  // Summary calculation
  const allTransactionsSummary = useMemo(() => {
    const income = allTransactions
      .filter((tx) => tx.type === 'INCOME')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const savings = allTransactions
      .filter((tx) => tx.type === 'EXPENSE' && (tx.savingsGoalId || tx.category?.name === '저축'))
      .reduce((sum, tx) => sum + tx.amount, 0);

    const expense = allTransactions
      .filter((tx) => tx.type === 'EXPENSE' && !tx.savingsGoalId && tx.category?.name !== '저축')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      totalIncome: income,
      totalExpense: expense,
      totalSavings: savings,
      balance: income - expense - savings,
    };
  }, [allTransactions]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] animate-[fadeIn_0.5s_ease-out] gap-4">
      <FilterPanel
        filterType={filterType}
        setFilterType={setFilterType}
        filterCategories={filterCategories}
        setFilterCategories={setFilterCategories}
        searchKeyword={searchKeyword}
        setSearchKeyword={setSearchKeyword}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        categories={categories}
        isFilterOpen={isFilterOpen}
        setIsFilterOpen={setIsFilterOpen}
        dateRange={dateRange}
        setDateRange={setDateRange}
        oldestDate={oldestTransactionDate}
        amountRange={amountRange}
        setAmountRange={setAmountRange}
      />

      <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-4">
          <MdReceipt className="text-lg sm:text-xl text-accent-purple" /> 전체 내역
          {allTransactions.length > 0 && (
            <span className="text-sm text-text-muted font-normal">({allTransactions.length}건)</span>
          )}
        </h2>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div
            className="bg-bg-secondary rounded-[12px] border border-[var(--border)] text-right p-3"
          >
            <p className="text-xs text-text-muted mb-1">
              수입
            </p>
            <p className="text-sm sm:text-base font-bold text-accent-mint">
              +₩{allTransactionsSummary.totalIncome.toLocaleString()}
            </p>
          </div>
          <div
            className="bg-bg-secondary rounded-[12px] border border-[var(--border)] text-right p-3"
          >
            <p className="text-xs text-text-muted mb-1">
              지출
            </p>
            <p className="text-sm sm:text-base font-bold text-accent-coral">
              -₩{allTransactionsSummary.totalExpense.toLocaleString()}
            </p>
          </div>
          <div
            className="bg-bg-secondary rounded-[12px] border border-[var(--border)] text-right p-3"
          >
            <p className="text-xs text-text-muted mb-1">
              저축
            </p>
            <p className="text-sm sm:text-base font-bold text-accent-blue">
              ₩{allTransactionsSummary.totalSavings.toLocaleString()}
            </p>
          </div>
          <div
            className="bg-bg-secondary rounded-[12px] border border-[var(--border)] text-right p-3"
          >
            <p className="text-xs text-text-muted mb-1">
              합계
            </p>
            <p className="text-sm sm:text-base font-bold text-accent-purple">
              {allTransactionsSummary.balance >= 0 ? '+' : '-'}₩
              {Math.abs(allTransactionsSummary.balance).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border)] my-4" />

        <TransactionList
          ref={transactionsEndRef}
          transactions={allTransactions}
          isLoading={isLoadingAllTransactions}
          hasMore={hasMoreTransactions}
          emptyMessage={
            searchKeyword || filterType !== 'ALL' || filterCategories.length > 0 || amountRange !== null
              ? '검색 결과가 없습니다'
              : '거래 내역이 없습니다'
          }
          onTransactionClick={onTransactionClick}
        />
      </div>
    </div>
  );
}
