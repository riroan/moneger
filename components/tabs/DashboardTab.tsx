'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAppStore, useTransactionStore, useCategoryStore, useAuthStore } from '@/stores';
import { useFilterHandlers } from '@/hooks/useFilterHandlers';
import SummaryCards from '@/components/dashboard/SummaryCards';
import CategoryChart from '@/components/dashboard/CategoryChart';
import DailyCalendarView from '@/components/dashboard/DailyCalendarView';
import TodaySummaryCard from '@/components/dashboard/TodaySummaryCard';
import SavingsCard from '@/components/dashboard/SavingsCard';
import TransactionItem from '@/components/transactions/TransactionItem';
import { MdPieChart, MdHistory, MdCalendarMonth } from 'react-icons/md';
import type { TransactionWithCategory, CategoryChartData } from '@/types';

type ChartViewMode = 'category' | 'calendar';

interface DailyBalanceData {
  date: Date;
  income: number;
  expense: number;
  savings: number;
  balance: number;
}

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
  const currentDate = useAppStore((state) => state.currentDate);
  const userId = useAuthStore((state) => state.userId);
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

  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>('category');
  const [calendarData, setCalendarData] = useState<DailyBalanceData[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // 달력 데이터 미리 로드 (뷰 모드와 상관없이)
  useEffect(() => {
    if (userId) {
      setIsLoadingCalendar(true);
      fetch(`/api/daily-balance?userId=${userId}&year=${year}&month=${month}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            setCalendarData(
              data.data.map((d: { date: string; income: number; expense: number; savings: number; balance: number }) => ({
                ...d,
                date: new Date(d.date),
              }))
            );
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingCalendar(false));
    }
  }, [userId, year, month]);

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
          <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              {chartViewMode === 'category' ? (
                <>
                  <MdPieChart className="text-lg sm:text-xl text-accent-blue" /> 카테고리별 지출
                </>
              ) : (
                <>
                  <MdCalendarMonth className="text-lg sm:text-xl text-accent-mint" /> 일별 수입/지출
                </>
              )}
            </h2>
            <button
              onClick={() => setChartViewMode(chartViewMode === 'category' ? 'calendar' : 'category')}
              className="flex items-center gap-1 text-xs sm:text-sm text-text-muted hover:text-text-secondary bg-bg-secondary hover:bg-bg-card-hover rounded-lg transition-colors cursor-pointer"
              style={{ padding: '6px 10px' }}
            >
              {chartViewMode === 'category' ? (
                <>
                  <MdCalendarMonth className="text-sm sm:text-base" />
                  <span className="hidden sm:inline">달력</span>
                </>
              ) : (
                <>
                  <MdPieChart className="text-sm sm:text-base" />
                  <span className="hidden sm:inline">차트</span>
                </>
              )}
            </button>
          </div>
          {chartViewMode === 'category' ? (
            <CategoryChart
              categories={categoryList}
              totalExpense={totalExpense}
              isLoading={isLoadingSummary}
              onCategoryClick={handleCategoryClick}
            />
          ) : (
            <DailyCalendarView
              data={calendarData}
              year={year}
              month={month}
              isLoading={isLoadingCalendar}
              onTransactionClick={onTransactionClick}
            />
          )}
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
