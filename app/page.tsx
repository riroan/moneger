'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { useTransactions } from '@/hooks/useTransactions';
import { useToast } from '@/contexts/ToastContext';
import Header from '@/components/layout/Header';
import SummaryCards from '@/components/dashboard/SummaryCards';
import CategoryChart from '@/components/dashboard/CategoryChart';
import TodaySummaryCard from '@/components/dashboard/TodaySummaryCard';
import SavingsCard from '@/components/dashboard/SavingsCard';
import TransactionItem from '@/components/transactions/TransactionItem';
import TransactionList from '@/components/transactions/TransactionList';
import FilterPanel, { DateRange, AmountRange } from '@/components/transactions/FilterPanel';
import type { Category, TransactionWithCategory, TransactionSummary, TodaySummary, CategoryChartData } from '@/types';
import { MdPieChart, MdHistory, MdReceipt } from 'react-icons/md';
import SavingsTab from '@/components/savings/SavingsTab';

// 모달 컴포넌트 동적 임포트 (코드 스플리팅)
const TransactionModal = dynamic(() => import('@/components/modals/TransactionModal'), { ssr: false });
const EditTransactionModal = dynamic(() => import('@/components/modals/EditTransactionModal'), { ssr: false });
const DeleteConfirmModal = dynamic(() => import('@/components/modals/DeleteConfirmModal'), { ssr: false });
const EditSavingsTransactionModal = dynamic(() => import('@/components/savings/EditSavingsTransactionModal'), { ssr: false });

export default function Home() {
  const { userId, userName, userEmail, isLoading: isAuthLoading, logout } = useAuth();
  const { showToast } = useToast();

  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'savings'>('dashboard');
  const [isMobile, setIsMobile] = useState(false);

  // 화면 크기 감지
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSavingsTransactionModalOpen, setIsSavingsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 필터 상태
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'SAVINGS'>('ALL');
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest' | 'expensive' | 'cheapest'>('recent');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [amountRange, setAmountRange] = useState<AmountRange | null>(null);

  // 데이터 상태
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithCategory[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [lastMonthBalance, setLastMonthBalance] = useState(0);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [oldestTransactionDate, setOldestTransactionDate] = useState<{ year: number; month: number } | null>(null);
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [isLoadingTodaySummary, setIsLoadingTodaySummary] = useState(false);

  const transactionsEndRef = useRef<HTMLDivElement>(null);

  // Custom hook for transactions
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
    activeTab,
    dateRange,
    amountRange,
  });

  // 모달 열림 시 스크롤 비활성화
  useEffect(() => {
    document.body.style.overflow = (isModalOpen || isEditModalOpen || isDeleteConfirmOpen || isSavingsTransactionModalOpen) ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isModalOpen, isEditModalOpen, isDeleteConfirmOpen, isSavingsTransactionModalOpen]);

  // 초기 데이터 병렬 로딩 (카테고리 + 가장 오래된 거래 날짜 + 최근 거래 + 오늘 요약)
  useEffect(() => {
    if (!userId) return;
    const fetchInitialData = async () => {
      setIsLoadingTransactions(true);
      setIsLoadingTodaySummary(true);
      try {
        const [categoriesRes, oldestDateRes, recentRes, todayRes] = await Promise.all([
          fetch(`/api/categories?userId=${userId}`),
          fetch(`/api/transactions/oldest-date?userId=${userId}`),
          fetch(`/api/transactions/recent?userId=${userId}&limit=10`),
          fetch(`/api/transactions/today?userId=${userId}`),
        ]);

        const [categoriesData, oldestDateData, recentData, todayData] = await Promise.all([
          categoriesRes.json(),
          oldestDateRes.json(),
          recentRes.json(),
          todayRes.json(),
        ]);

        // 카테고리 처리
        if (categoriesData.success && categoriesData.data.length > 0) {
          setCategories(categoriesData.data);
        } else {
          const seedResponse = await fetch('/api/categories/seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          });
          const seedData = await seedResponse.json();
          if (seedData.success) setCategories(seedData.data);
        }

        // 가장 오래된 날짜 처리
        if (oldestDateData.success && oldestDateData.data.year && oldestDateData.data.month) {
          setOldestTransactionDate({ year: oldestDateData.data.year, month: oldestDateData.data.month });
        }

        // 최근 거래 처리
        if (recentData.success) setRecentTransactions(recentData.data);

        // 오늘 요약 처리
        if (todayData.success) setTodaySummary(todayData.data);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      } finally {
        setIsLoadingTransactions(false);
        setIsLoadingTodaySummary(false);
      }
    };
    fetchInitialData();
  }, [userId]);

  // 요약 데이터 (현재 월 + 이전 월 병렬 조회)
  useEffect(() => {
    if (!userId) return;
    const fetchSummary = async () => {
      setIsLoadingSummary(true);
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const lastMonth = new Date(currentDate);
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        // 병렬 호출
        const [currentRes, lastRes] = await Promise.all([
          fetch(`/api/transactions/summary?userId=${userId}&year=${year}&month=${month}`),
          fetch(`/api/transactions/summary?userId=${userId}&year=${lastMonth.getFullYear()}&month=${lastMonth.getMonth() + 1}`),
        ]);

        const [currentData, lastData] = await Promise.all([currentRes.json(), lastRes.json()]);

        if (currentData.success) setSummary(currentData.data);
        if (lastData.success) setLastMonthBalance(lastData.data.summary.balance || 0);
      } catch (error) {
        console.error('Failed to fetch summary:', error);
      } finally {
        setIsLoadingSummary(false);
      }
    };
    fetchSummary();
  }, [userId, currentDate]);

  // 무한 스크롤
  useEffect(() => {
    if (activeTab !== 'transactions' || !transactionsEndRef.current || !hasMoreTransactions) return;
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
  }, [activeTab, hasMoreTransactions, isLoadingAllTransactions, loadMoreTransactions]);

  // 데이터 새로고침
  const refreshData = async () => {
    if (!userId) return;
    const [recentRes, summaryRes, todayRes] = await Promise.all([
      fetch(`/api/transactions/recent?userId=${userId}&limit=10`),
      fetch(`/api/transactions/summary?userId=${userId}&year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}`),
      fetch(`/api/transactions/today?userId=${userId}`),
    ]);
    const [recentData, summaryData, todayData] = await Promise.all([recentRes.json(), summaryRes.json(), todayRes.json()]);
    if (recentData.success) setRecentTransactions(recentData.data);
    if (summaryData.success) setSummary(summaryData.data);
    if (todayData.success) setTodaySummary(todayData.data);
    if (activeTab === 'transactions') refreshAllTransactions();
  };

  // 거래 핸들러
  const handleSubmitTransaction = async (data: { type: 'INCOME' | 'EXPENSE'; amount: number; description: string; categoryId: string }) => {
    if (!userId) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...data }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      setIsModalOpen(false);
      await refreshData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '거래 추가에 실패했습니다', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTransaction = async (data: { type: 'INCOME' | 'EXPENSE'; amount: number; description: string; categoryId: string }) => {
    if (!userId || !editingTransaction) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...data }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      setIsEditModalOpen(false);
      setEditingTransaction(null);
      await refreshData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '거래 수정에 실패했습니다', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!userId || !editingTransaction) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      setIsDeleteConfirmOpen(false);
      setIsEditModalOpen(false);
      setEditingTransaction(null);
      await refreshData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '거래 삭제에 실패했습니다', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSavingsTransaction = async () => {
    if (!userId || !editingTransaction) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      setIsSavingsTransactionModalOpen(false);
      setEditingTransaction(null);
      await refreshData();
      showToast('저축 내역이 삭제되었습니다', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '저축 내역 삭제에 실패했습니다', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 거래 클릭 핸들러
  const handleTransactionClick = (tx: TransactionWithCategory) => {
    setEditingTransaction(tx);
    if (tx.savingsGoalId) {
      setIsSavingsTransactionModalOpen(true);
    } else {
      setIsEditModalOpen(true);
    }
  };

  // 날짜 핸들러
  const handlePreviousMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const now = new Date();
    if (next <= new Date(now.getFullYear(), now.getMonth(), 1)) setCurrentDate(next);
  };
  const handleMonthSelect = (year: number, month: number) => setCurrentDate(new Date(year, month, 1));

  // 카테고리 클릭 핸들러 (useCallback으로 메모이제이션)
  const handleCategoryClick = useCallback((categoryId: string) => {
    setFilterType('EXPENSE');
    setFilterCategories([categoryId]);
    setSortOrder('recent');
    setSearchKeyword('');
    setDateRange({
      startYear: currentDate.getFullYear(),
      startMonth: currentDate.getMonth(),
      endYear: currentDate.getFullYear(),
      endMonth: currentDate.getMonth(),
    });
    setActiveTab('transactions');
  }, [currentDate]);

  // 수입/지출 클릭 핸들러 (useCallback으로 메모이제이션)
  const handleIncomeClick = useCallback(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    setFilterType('INCOME');
    setFilterCategories([]);
    setSearchKeyword('');
    setSortOrder('recent');
    setDateRange({ startYear: year, startMonth: month, endYear: year, endMonth: month });
    setActiveTab('transactions');
  }, [currentDate]);

  const handleExpenseClick = useCallback(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    setFilterType('EXPENSE');
    setFilterCategories([]);
    setSearchKeyword('');
    setSortOrder('recent');
    setDateRange({ startYear: year, startMonth: month, endYear: year, endMonth: month });
    setActiveTab('transactions');
  }, [currentDate]);

  const handleBalanceClick = useCallback(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    setFilterType('ALL');
    setFilterCategories([]);
    setSearchKeyword('');
    setSortOrder('recent');
    setDateRange({ startYear: year, startMonth: month, endYear: year, endMonth: month });
    setActiveTab('transactions');
  }, [currentDate]);

  // 데이터 가공 (useMemo로 메모이제이션)
  const totalIncome = summary?.summary?.totalIncome || 0;
  const totalExpense = summary?.summary?.totalExpense || 0;
  const categoryList: CategoryChartData[] = useMemo(() =>
    (summary?.categories || []).map((cat, index) => ({
      ...cat,
      colorIndex: index % 6,
      amount: cat.total,
    })),
    [summary?.categories]
  );

  // 전체 내역 탭용 요약 계산 (저축 거래 분리)
  const allTransactionsSummary = useMemo(() => {
    const income = allTransactions
      .filter(tx => tx.type === 'INCOME')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // 저축 거래 (savingsGoalId가 있거나 카테고리가 '저축'인 경우)
    const savings = allTransactions
      .filter(tx => tx.type === 'EXPENSE' && (tx.savingsGoalId || tx.category?.name === '저축'))
      .reduce((sum, tx) => sum + tx.amount, 0);

    // 일반 지출 (저축 제외)
    const expense = allTransactions
      .filter(tx => tx.type === 'EXPENSE' && !tx.savingsGoalId && tx.category?.name !== '저축')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      totalIncome: income,
      totalExpense: expense,
      totalSavings: savings,
      balance: income - expense - savings,
    };
  }, [allTransactions]);

  if (isAuthLoading) return null;

  return (
    <>
      <div className="noise-overlay" />
      <div className="gradient-orb orb-1" />
      <div className="gradient-orb orb-2" />

      <div className="relative z-10" style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>
        <Header
          userName={userName}
          userEmail={userEmail}
          currentDate={currentDate}
          onPreviousMonth={handlePreviousMonth}
          onNextMonth={handleNextMonth}
          onMonthSelect={handleMonthSelect}
          onLogout={logout}
          oldestDate={oldestTransactionDate}
          showDatePicker={false}
        />

        {activeTab === 'dashboard' && (
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
              onSavingsClick={() => setActiveTab('savings')}
            />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px]" style={{ gap: '16px' }}>
              <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] animate-[fadeIn_0.6s_ease-out_0.3s_backwards] order-2 lg:order-1" style={{ padding: '16px' }}>
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
                {/* 오늘의 지출 요약 */}
                <TodaySummaryCard data={todaySummary} isLoading={isLoadingTodaySummary} />

                {/* 저축 카드 */}
                <SavingsCard
                  savingsGoal={summary?.savings?.targetAmount || 0}
                  currentSavings={summary?.savings?.totalAmount || 0}
                  primaryGoal={summary?.savings?.primaryGoal}
                  onViewAll={() => setActiveTab('savings')}
                />

                <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] animate-[fadeIn_0.6s_ease-out_0.3s_backwards]" style={{ padding: '16px' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                    <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                      <MdHistory className="text-lg sm:text-xl text-accent-mint" /> 최근 내역
                    </h2>
                    <button
                      onClick={() => setActiveTab('transactions')}
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
                        <TransactionItem
                          key={tx.id}
                          transaction={tx}
                          onClick={() => handleTransactionClick(tx)}
                        />
                      ))
                    ) : (
                      <div className="text-center text-text-muted py-6">거래 내역이 없습니다</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'savings' && userId && <SavingsTab userId={userId} onDataChange={refreshData} />}

        {activeTab === 'transactions' && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] animate-[fadeIn_0.5s_ease-out]" style={{ gap: '16px' }}>
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

            <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px]" style={{ padding: '16px' }}>
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2" style={{ marginBottom: '16px' }}>
                <MdReceipt className="text-lg sm:text-xl text-accent-purple" /> 전체 내역
                {allTransactions.length > 0 && <span className="text-sm text-text-muted font-normal">({allTransactions.length}건)</span>}
              </h2>

              {/* 요약 카드 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-bg-secondary rounded-[12px] border border-[var(--border)] text-right" style={{ padding: '12px' }}>
                  <p className="text-xs text-text-muted" style={{ marginBottom: '4px' }}>수입</p>
                  <p className="text-sm sm:text-base font-bold text-accent-mint">
                    +₩{allTransactionsSummary.totalIncome.toLocaleString()}
                  </p>
                </div>
                <div className="bg-bg-secondary rounded-[12px] border border-[var(--border)] text-right" style={{ padding: '12px' }}>
                  <p className="text-xs text-text-muted" style={{ marginBottom: '4px' }}>지출</p>
                  <p className="text-sm sm:text-base font-bold text-accent-coral">
                    -₩{allTransactionsSummary.totalExpense.toLocaleString()}
                  </p>
                </div>
                <div className="bg-bg-secondary rounded-[12px] border border-[var(--border)] text-right" style={{ padding: '12px' }}>
                  <p className="text-xs text-text-muted" style={{ marginBottom: '4px' }}>저축</p>
                  <p className="text-sm sm:text-base font-bold text-accent-blue">
                    ₩{allTransactionsSummary.totalSavings.toLocaleString()}
                  </p>
                </div>
                <div className="bg-bg-secondary rounded-[12px] border border-[var(--border)] text-right" style={{ padding: '12px' }}>
                  <p className="text-xs text-text-muted" style={{ marginBottom: '4px' }}>합계</p>
                  <p className="text-sm sm:text-base font-bold text-accent-purple">
                    {allTransactionsSummary.balance >= 0 ? '+' : '-'}₩{Math.abs(allTransactionsSummary.balance).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* 구분선 */}
              <div className="border-t border-[var(--border)]" style={{ margin: '16px 0' }} />

              <TransactionList
                ref={transactionsEndRef}
                transactions={allTransactions}
                isLoading={isLoadingAllTransactions}
                hasMore={hasMoreTransactions}
                emptyMessage={searchKeyword || filterType !== 'ALL' || filterCategories.length > 0 || amountRange !== null ? '검색 결과가 없습니다' : '거래 내역이 없습니다'}
                onTransactionClick={handleTransactionClick}
              />
            </div>
          </div>
        )}
      </div>

      {activeTab !== 'savings' && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-14 h-14 sm:w-20 sm:h-20 rounded-[14px] sm:rounded-[18px] bg-gradient-to-br from-accent-mint to-accent-blue border-none text-bg-primary text-[28px] sm:text-[36px] font-light leading-none cursor-pointer shadow-[0_8px_32px_var(--glow-mint)] transition-all hover:scale-110 hover:rotate-90 hover:shadow-[0_12px_48px_var(--glow-mint)] z-[100] flex items-center justify-center"
        >
          +
        </button>
      )}

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitTransaction}
        categories={categories}
        isSubmitting={isSubmitting}
      />

      <EditTransactionModal
        isOpen={isEditModalOpen}
        transaction={editingTransaction}
        onClose={() => { setIsEditModalOpen(false); setEditingTransaction(null); }}
        onSubmit={handleEditTransaction}
        onDelete={() => setIsDeleteConfirmOpen(true)}
        categories={categories}
        isSubmitting={isSubmitting}
      />

      <DeleteConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteTransaction}
        isSubmitting={isSubmitting}
      />

      <EditSavingsTransactionModal
        isOpen={isSavingsTransactionModalOpen}
        transaction={editingTransaction}
        onClose={() => { setIsSavingsTransactionModalOpen(false); setEditingTransaction(null); }}
        onDelete={handleDeleteSavingsTransaction}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
