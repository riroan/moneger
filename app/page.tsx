'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTransactions } from '@/hooks/useTransactions';
import Header from '@/components/layout/Header';
import SummaryCards from '@/components/dashboard/SummaryCards';
import CategoryChart from '@/components/dashboard/CategoryChart';
import TransactionItem from '@/components/transactions/TransactionItem';
import TransactionList from '@/components/transactions/TransactionList';
import FilterPanel, { DateRange } from '@/components/transactions/FilterPanel';
import TransactionModal from '@/components/modals/TransactionModal';
import EditTransactionModal from '@/components/modals/EditTransactionModal';
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal';

export default function Home() {
  const { userId, userName, userEmail, isLoading: isAuthLoading, logout } = useAuth();

  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions'>('dashboard');

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 필터 상태
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest' | 'expensive' | 'cheapest'>('recent');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  // 데이터 상태
  const [categories, setCategories] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [lastMonthBalance, setLastMonthBalance] = useState(0);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [oldestTransactionDate, setOldestTransactionDate] = useState<{ year: number; month: number } | null>(null);

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
  });

  // 모달 열림 시 스크롤 비활성화
  useEffect(() => {
    document.body.style.overflow = (isModalOpen || isEditModalOpen || isDeleteConfirmOpen) ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isModalOpen, isEditModalOpen, isDeleteConfirmOpen]);

  // 카테고리 데이터
  useEffect(() => {
    if (!userId) return;
    const fetchCategories = async () => {
      try {
        const response = await fetch(`/api/categories?userId=${userId}`);
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          setCategories(data.data);
        } else {
          const seedResponse = await fetch('/api/categories/seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          });
          const seedData = await seedResponse.json();
          if (seedData.success) setCategories(seedData.data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, [userId]);

  // 가장 오래된 거래 날짜 조회
  useEffect(() => {
    if (!userId) return;
    const fetchOldestDate = async () => {
      try {
        const response = await fetch(`/api/transactions/oldest-date?userId=${userId}`);
        const data = await response.json();
        if (data.success && data.data.year && data.data.month) {
          setOldestTransactionDate({ year: data.data.year, month: data.data.month });
        }
      } catch (error) {
        console.error('Failed to fetch oldest transaction date:', error);
      }
    };
    fetchOldestDate();
  }, [userId]);

  // 요약 데이터
  useEffect(() => {
    if (!userId) return;
    const fetchSummary = async () => {
      setIsLoadingSummary(true);
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const response = await fetch(`/api/transactions/summary?userId=${userId}&year=${year}&month=${month}`);
        const data = await response.json();
        if (data.success) setSummary(data.data);

        const lastMonth = new Date(currentDate);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastResponse = await fetch(`/api/transactions/summary?userId=${userId}&year=${lastMonth.getFullYear()}&month=${lastMonth.getMonth() + 1}`);
        const lastData = await lastResponse.json();
        if (lastData.success) setLastMonthBalance(lastData.data.summary.balance || 0);
      } catch (error) {
        console.error('Failed to fetch summary:', error);
      } finally {
        setIsLoadingSummary(false);
      }
    };
    fetchSummary();
  }, [userId, currentDate]);

  // 최근 거래
  useEffect(() => {
    if (!userId) return;
    const fetchRecent = async () => {
      setIsLoadingTransactions(true);
      try {
        const response = await fetch(`/api/transactions/recent?userId=${userId}&limit=10`);
        const data = await response.json();
        if (data.success) setRecentTransactions(data.data);
      } catch (error) {
        console.error('Failed to fetch recent transactions:', error);
      } finally {
        setIsLoadingTransactions(false);
      }
    };
    fetchRecent();
  }, [userId]);

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
    const [recentRes, summaryRes] = await Promise.all([
      fetch(`/api/transactions/recent?userId=${userId}&limit=10`),
      fetch(`/api/transactions/summary?userId=${userId}&year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}`),
    ]);
    const [recentData, summaryData] = await Promise.all([recentRes.json(), summaryRes.json()]);
    if (recentData.success) setRecentTransactions(recentData.data);
    if (summaryData.success) setSummary(summaryData.data);
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
      alert(error instanceof Error ? error.message : '거래 추가에 실패했습니다');
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
      alert(error instanceof Error ? error.message : '거래 수정에 실패했습니다');
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
      alert(error instanceof Error ? error.message : '거래 삭제에 실패했습니다');
    } finally {
      setIsSubmitting(false);
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

  // 카테고리 클릭 핸들러
  const handleCategoryClick = (categoryId: string) => {
    setFilterType('EXPENSE');
    setFilterCategories([categoryId]);
    setSortOrder('recent');
    setSearchKeyword('');
    setActiveTab('transactions');
  };

  // 데이터 가공
  const totalIncome = summary?.summary?.totalIncome || 0;
  const totalExpense = summary?.summary?.totalExpense || 0;
  const balance = summary?.summary?.netAmount || 0;
  const categoryList = (summary?.categories || []).map((cat: any, index: number) => ({
    ...cat,
    colorIndex: index % 6,
    amount: cat.total,
  }));

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
        />

        {/* Tab Bar */}
        <div className="animate-[fadeInUp_0.5s_ease-out]" style={{ marginBottom: '24px' }}>
          <nav className="flex gap-2 bg-bg-card border border-[var(--border)] rounded-[12px] p-1 w-full sm:w-fit">
            {(['dashboard', 'transactions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-[10px] transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                style={{ padding: '12px 20px' }}
              >
                <span className="text-base">{tab === 'dashboard' ? '📊' : '📝'}</span>
                <span className="font-medium text-sm">{tab === 'dashboard' ? '대시보드' : '전체 내역'}</span>
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'dashboard' && (
          <>
            <SummaryCards
              totalIncome={totalIncome}
              totalExpense={totalExpense}
              balance={balance}
              lastMonthBalance={lastMonthBalance}
              incomeCount={summary?.transactionCount?.income || 0}
              expenseCount={summary?.transactionCount?.expense || 0}
              onIncomeClick={() => {
                const month = currentDate.getMonth(); // 0-based
                const year = currentDate.getFullYear();
                setFilterType('INCOME');
                setFilterCategories([]);
                setSearchKeyword('');
                setSortOrder('recent');
                setDateRange({ startYear: year, startMonth: month, endYear: year, endMonth: month });
                setActiveTab('transactions');
              }}
              onExpenseClick={() => {
                const month = currentDate.getMonth(); // 0-based
                const year = currentDate.getFullYear();
                setFilterType('EXPENSE');
                setFilterCategories([]);
                setSearchKeyword('');
                setSortOrder('recent');
                setDateRange({ startYear: year, startMonth: month, endYear: year, endMonth: month });
                setActiveTab('transactions');
              }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px]" style={{ gap: '16px' }}>
              <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] animate-[fadeIn_0.6s_ease-out_0.3s_backwards] order-2 lg:order-1" style={{ padding: '16px' }}>
                <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2" style={{ marginBottom: '16px' }}>
                  <span className="text-lg sm:text-xl">📊</span> 카테고리별 지출
                </h2>
                <CategoryChart
                  categories={categoryList}
                  totalExpense={totalExpense}
                  isLoading={isLoadingSummary}
                  onCategoryClick={handleCategoryClick}
                />
              </div>

              <div className="flex flex-col order-1 lg:order-2" style={{ gap: '16px' }}>
                <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] animate-[fadeIn_0.6s_ease-out_0.3s_backwards]" style={{ padding: '16px' }}>
                  <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2" style={{ marginBottom: '16px' }}>
                    <span className="text-lg sm:text-xl">📝</span> 최근 내역
                  </h2>
                  <div className="flex flex-col" style={{ gap: '8px' }}>
                    {isLoadingTransactions ? (
                      <div className="text-center text-text-muted py-6">로딩 중...</div>
                    ) : recentTransactions.length > 0 ? (
                      recentTransactions.map((tx) => (
                        <TransactionItem
                          key={tx.id}
                          transaction={tx}
                          onClick={() => { setEditingTransaction(tx); setIsEditModalOpen(true); }}
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
            />

            <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px]" style={{ padding: '16px' }}>
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2" style={{ marginBottom: '16px' }}>
                <span className="text-lg sm:text-xl">📝</span> 전체 거래 내역
                {allTransactions.length > 0 && <span className="text-sm text-text-muted font-normal">({allTransactions.length}건)</span>}
              </h2>
              <TransactionList
                ref={transactionsEndRef}
                transactions={allTransactions}
                isLoading={isLoadingAllTransactions}
                hasMore={hasMoreTransactions}
                emptyMessage={searchKeyword || filterType !== 'ALL' || filterCategories.length > 0 ? '검색 결과가 없습니다' : '거래 내역이 없습니다'}
                onTransactionClick={(tx) => { setEditingTransaction(tx); setIsEditModalOpen(true); }}
              />
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-14 h-14 sm:w-20 sm:h-20 rounded-[14px] sm:rounded-[18px] bg-gradient-to-br from-accent-mint to-accent-blue border-none text-bg-primary text-[28px] sm:text-[36px] font-light leading-none cursor-pointer shadow-[0_8px_32px_var(--glow-mint)] transition-all hover:scale-110 hover:rotate-90 hover:shadow-[0_12px_48px_var(--glow-mint)] z-[100] flex items-center justify-center"
      >
        +
      </button>

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
    </>
  );
}
