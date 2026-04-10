'use client';

import { useMemo, useState, useEffect, memo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore, useTransactionStore, useCategoryStore, useAuthStore } from '@/stores';
import { useFilterHandlers } from '@/hooks/useFilterHandlers';
import SummaryCards from '@/components/dashboard/SummaryCards';
import TodaySummaryCard from '@/components/dashboard/TodaySummaryCard';
import CommittedSpendingCard from '@/components/dashboard/CommittedSpendingCard';
import RecurringAlertBanner from '@/components/dashboard/RecurringAlertBanner';
import SavingsCard from '@/components/dashboard/SavingsCard';
import GroupsCard from '@/components/dashboard/GroupsCard';
import TransactionItem from '@/components/transactions/TransactionItem';
import { MdPieChart, MdHistory, MdCalendarMonth } from 'react-icons/md';
import type { TransactionWithCategory, CategoryChartData } from '@/types';

// 동적 임포트로 번들 최적화
const CategoryChart = dynamic(() => import('@/components/dashboard/CategoryChart'), {
  loading: () => <div className="text-center text-text-muted py-8">차트 로딩 중...</div>,
});

// DailyCalendarView 동적 임포트 및 프리로드
const dailyCalendarViewImport = () => import('@/components/dashboard/DailyCalendarView');
const DailyCalendarView = dynamic(dailyCalendarViewImport, {
  ssr: false,
});

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
  onViewGroups: () => void;
  onViewRecurring?: () => void;
}

export default function DashboardTab({
  onTransactionClick,
  onViewAllTransactions,
  onViewSavings,
  onViewGroups,
  onViewRecurring,
}: DashboardTabProps) {
  const isMobile = useAppStore((state) => state.isMobile);
  const currentDate = useAppStore((state) => state.currentDate);
  const userId = useAuthStore((state) => state.userId);

  // 개별 selector로 불필요한 리렌더 방지
  const summary = useTransactionStore((state) => state.summary);
  const todaySummary = useTransactionStore((state) => state.todaySummary);
  const recentTransactions = useTransactionStore((state) => state.recentTransactions);
  const isLoadingSummary = useTransactionStore((state) => state.isLoadingSummary);
  const isLoadingTransactions = useTransactionStore((state) => state.isLoadingTransactions);
  const isLoadingTodaySummary = useTransactionStore((state) => state.isLoadingTodaySummary);

  // 전월 마지막 날 잔액 (carryOverBalance)
  const lastMonthBalance = summary?.summary?.carryOverBalance || 0;

  const { handleCategoryClick, handleIncomeClick, handleExpenseClick, handleBalanceClick } = useFilterHandlers();

  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>('category');
  const [calendarData, setCalendarData] = useState<DailyBalanceData[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // DailyCalendarView 컴포넌트 프리로드 (대시보드 로드 시)
  useEffect(() => {
    dailyCalendarViewImport();
  }, []);

  // 달력 데이터 프리페치 (월 변경 시 자동 갱신)
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const showLoading = chartViewMode === 'calendar';
    if (showLoading) setIsLoadingCalendar(true);

    fetch(`/api/daily-balance?userId=${userId}&year=${year}&month=${month}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.data) {
          setCalendarData(
            data.data.map((d: { date: string; income: number; expense: number; savings: number; balance: number }) => ({
              ...d,
              date: new Date(d.date),
            }))
          );
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setIsLoadingCalendar(false);
      });

    return () => { cancelled = true; };
    // chartViewMode는 fetch 트리거가 아닌 로딩 표시 여부만 결정하므로 의존성에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      <RecurringAlertBanner />

      <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr_380px] gap-4">
        {/* 왼쪽: 요약 카드 */}
        <div className="flex flex-col order-1 gap-4">
          <TodaySummaryCard data={todaySummary} isLoading={isLoadingTodaySummary} />

          <CommittedSpendingCard onManage={onViewRecurring} />

          <SavingsCard
            savingsGoal={summary?.savings?.targetAmount || 0}
            currentSavings={summary?.savings?.totalAmount || 0}
            primaryGoal={summary?.savings?.primaryGoal}
            onViewAll={onViewSavings}
          />

          <GroupsCard userId={userId || ''} onViewAll={onViewGroups} />
        </div>

        {/* 가운데: 차트/캘린더 */}
        <div
          className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] animate-[fadeIn_0.6s_ease-out_0.3s_backwards] order-2 p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              {chartViewMode === 'category' ? (
                <>
                  <MdPieChart className="text-lg sm:text-xl text-accent-blue" /> 카테고리별 지출
                </>
              ) : (
                <>
                  <MdCalendarMonth className="text-lg sm:text-xl text-accent-mint" /> 일별 내역
                </>
              )}
            </h2>
            <button
              onClick={() => setChartViewMode(chartViewMode === 'category' ? 'calendar' : 'category')}
              className="flex items-center gap-1 text-xs sm:text-sm text-text-muted hover:text-text-secondary bg-bg-secondary hover:bg-bg-card-hover rounded-lg transition-colors cursor-pointer py-1.5 px-2.5"
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

        {/* 오른쪽: 최근 내역 */}
        <div
          className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] animate-[fadeIn_0.6s_ease-out_0.3s_backwards] order-3 self-start p-4"
        >
          <div className="flex items-center justify-between mb-4">
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
          <div className="flex flex-col gap-2">
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
    </>
  );
}
