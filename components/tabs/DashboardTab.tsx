'use client';

import { useMemo } from 'react';
import { useAppStore, useTransactionStore, useCategoryStore } from '@/stores';
import { useFilterHandlers } from '@/hooks/useFilterHandlers';
import SummaryCards from '@/components/dashboard/SummaryCards';
import CategoryChart from '@/components/dashboard/CategoryChart';
import TodaySummaryCard from '@/components/dashboard/TodaySummaryCard';
import SavingsCard from '@/components/dashboard/SavingsCard';
import TransactionItem from '@/components/transactions/TransactionItem';
import { MdPieChart, MdHistory } from 'react-icons/md';
import type { TransactionWithCategory, CategoryChartData } from '@/types';

interface DashboardTabProps {
  onTransactionClick: (tx: TransactionWithCategory) => void;
  onViewAllTransactions: () => void;
  onViewSavings: () => void;
}

export default function DashboardTab({
  onTransactionClick,
  onViewAllTransactions,
  onViewSavings,
}: DashboardTabProps) {
  const isMobile = useAppStore((state) => state.isMobile);
  const {
    summary,
    todaySummary,
    recentTransactions,
    lastMonthBalance,
    isLoadingSummary,
    isLoadingTransactions,
    isLoadingTodaySummary,
  } = useTransactionStore();

  const { handleCategoryClick, handleIncomeClick, handleExpenseClick, handleBalanceClick } = useFilterHandlers();

  const totalIncome = summary?.summary?.totalIncome || 0;
  const totalExpense = summary?.summary?.totalExpense || 0;

  const categories = useCategoryStore((state) => state.categories);

  const categoryList: CategoryChartData[] = useMemo(
    () =>
      (summary?.categories || []).map((cat) => {
        const fullCategory = categories.find((c) => c.id === cat.id);
        return {
          ...cat,
          amount: cat.total,
          color: fullCategory?.color || null,
        };
      }),
    [summary?.categories, categories]
  );

  return (
    <>
      <SummaryCards
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        balance={summary?.summary?.balance || 0}
        lastMonthBalance={lastMonthBalance}
        incomeCount={summary?.transactionCount?.income || 0}
        expenseCount={summary?.transactionCount?.expense || 0}
        totalSavings={summary?.savings?.totalAmount || 0}
        savingsCount={summary?.savings?.count || 0}
        onIncomeClick={handleIncomeClick}
        onExpenseClick={handleExpenseClick}
        onBalanceClick={handleBalanceClick}
        onSavingsClick={onViewSavings}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px]" style={{ gap: '16px' }}>
        <div
          className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] animate-[fadeIn_0.6s_ease-out_0.3s_backwards] order-2 lg:order-1"
          style={{ padding: '16px' }}
        >
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2" style={{ marginBottom: '16px' }}>
            <MdPieChart className="text-lg sm:text-xl text-accent-blue" /> 카테고리별 지출
          </h2>
          <CategoryChart
            categories={categoryList}
            totalExpense={totalExpense}
            isLoading={isLoadingSummary}
            onCategoryClick={handleCategoryClick}
          />
        </div>

        <div className="flex flex-col order-1 lg:order-2" style={{ gap: '16px' }}>
          <TodaySummaryCard data={todaySummary} isLoading={isLoadingTodaySummary} />

          <SavingsCard
            savingsGoal={summary?.savings?.targetAmount || 0}
            currentSavings={summary?.savings?.totalAmount || 0}
            primaryGoal={summary?.savings?.primaryGoal}
            onViewAll={onViewSavings}
          />

          <div
            className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] animate-[fadeIn_0.6s_ease-out_0.3s_backwards]"
            style={{ padding: '16px' }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <MdHistory className="text-lg sm:text-xl text-accent-mint" /> 최근 내역
              </h2>
              <button
                onClick={onViewAllTransactions}
                className="text-xs sm:text-sm text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
              >
                전체보기 →
              </button>
            </div>
            <div className="flex flex-col" style={{ gap: '8px' }}>
              {isLoadingTransactions ? (
                <div className="text-center text-text-muted py-6">로딩 중...</div>
              ) : recentTransactions.length > 0 ? (
                recentTransactions.slice(0, isMobile ? 5 : 10).map((tx) => (
                  <TransactionItem key={tx.id} transaction={tx} onClick={() => onTransactionClick(tx)} />
                ))
              ) : (
                <div className="text-center text-text-muted py-6">거래 내역이 없습니다</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
