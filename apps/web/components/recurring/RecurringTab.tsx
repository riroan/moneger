'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { formatNumber } from '@/utils/formatters';
import { FaPlus } from 'react-icons/fa';
import { MdEventRepeat, MdEdit, MdDelete, MdHistory, MdTrendingDown } from 'react-icons/md';

const AddRecurringModal = dynamic(() => import('./AddRecurringModal'), { ssr: false });
const EditRecurringModal = dynamic(() => import('./EditRecurringModal'), { ssr: false });

interface RecurringExpense {
  id: string;
  amount: number;
  description: string;
  type: string;
  dayOfMonth: number;
  nextDueDate: string;
  isActive: boolean;
  category: { id: string; name: string; type: string; color: string | null; icon: string | null } | null;
  history: { id: string; previousAmount: number; newAmount: number; changedAt: string }[];
}

interface RecurringSummary {
  balance: number;
  remainingTotal: number;
  disposableAmount: number;
  totalMonthly: number;
  activeCount: number;
  processedThisMonth: number;
  categoryBreakdown: { name: string; color: string | null; amount: number; percentage: number }[];
}

interface RecurringTabProps {
  userId: string;
  onDataChange?: () => void;
}

export default function RecurringTab({ userId, onDataChange }: RecurringTabProps) {
  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [summary, setSummary] = useState<RecurringSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<RecurringExpense | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [deleteTargetExpense, setDeleteTargetExpense] = useState<RecurringExpense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [expensesRes, summaryRes] = await Promise.all([
        fetch(`/api/recurring?userId=${userId}`),
        fetch(`/api/recurring/summary?userId=${userId}`),
      ]);
      const expensesJson = await expensesRes.json();
      const summaryJson = await summaryRes.json();
      if (expensesJson.success) setExpenses(expensesJson.data);
      if (summaryJson.success) setSummary(summaryJson.data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/recurring/${id}?userId=${userId}`, { method: 'DELETE' });
    fetchData();
    onDataChange?.();
  };

  const handleToggleActive = async (expense: RecurringExpense) => {
    await fetch(`/api/recurring/${expense.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, isActive: !expense.isActive }),
    });
    fetchData();
    onDataChange?.();
  };

  const totalMonthly = summary?.totalMonthly || 0;
  const activeCount = summary?.activeCount || 0;
  const processedThisMonth = summary?.processedThisMonth || 0;

  return (
    <div className="animate-[fadeIn_0.5s_ease-out]">
      {/* 상단 요약 카드 3개 — 저축 페이지와 동일한 레이아웃 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* 월 정기 지출 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-5">
          <p className="text-xs sm:text-sm text-text-secondary mb-1.5">월 정기 지출</p>
          <p className="text-2xl sm:text-3xl font-bold text-accent-coral">
            <span className="mr-0.5">₩</span>{formatNumber(totalMonthly)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {activeCount}개 항목
          </p>
        </div>

        {/* 이번 달 처리 현황 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] sm:col-span-2 lg:col-span-1 p-5">
          <p className="text-xs sm:text-sm text-text-secondary mb-1.5">이번 달 처리 현황</p>
          <p className="text-2xl sm:text-3xl font-bold text-accent-blue">
            {processedThisMonth}<span className="text-base sm:text-lg font-normal text-text-muted">건 처리됨</span>
          </p>
          <p className="text-xs text-text-muted mt-1">
            {activeCount}건 중
          </p>
          <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                activeCount > 0 && processedThisMonth >= activeCount
                  ? 'bg-accent-mint'
                  : 'bg-gradient-to-r from-accent-coral to-accent-yellow'
              }`}
              style={{ width: `${activeCount > 0 ? Math.min(Math.round((processedThisMonth / activeCount) * 100), 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* 하단 2칸럼 — 저축 페이지와 동일한 구조 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 왼쪽: 정기 지출 목록 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <MdEventRepeat className="text-lg sm:text-xl text-accent-coral" /> 정기 지출
              <span className="text-xs sm:text-sm text-text-muted font-normal">({expenses.length}/10)</span>
            </h2>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="text-xs sm:text-sm text-text-muted hover:text-text-secondary transition-colors cursor-pointer flex items-center gap-1"
            >
              <FaPlus className="text-xs" /> 추가
            </button>
          </div>

          {isLoading ? (
            <div className="text-center text-text-muted py-8 text-sm">로딩 중...</div>
          ) : expenses.length > 0 ? (
            <div className="flex flex-col gap-3">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className={`bg-bg-secondary rounded-[12px] sm:rounded-[14px] transition-all p-4 ${
                    !expense.isActive ? 'opacity-50' : ''
                  }`}
                >
                  {/* 상단: 카테고리 아이콘 + 이름/상태 */}
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => handleToggleActive(expense)}
                      className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-lg cursor-pointer transition-all hover:scale-105 ${
                        expense.isActive
                          ? 'bg-accent-coral/15 text-accent-coral'
                          : 'bg-gray-400/15 text-gray-400'
                      }`}
                      title={expense.isActive ? '중지하기' : '활성화하기'}
                    >
                      <MdEventRepeat />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm sm:text-base font-medium truncate">{expense.description}</p>
                        {expense.category && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap"
                            style={{
                              backgroundColor: `${expense.category.color || '#666'}20`,
                              color: expense.category.color || '#666',
                            }}
                          >
                            {expense.category.name}
                          </span>
                        )}
                        {!expense.isActive && (
                          <span className="text-[10px] text-text-muted bg-bg-card px-1.5 py-0.5 rounded-full">중지</span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">
                        매월 {expense.dayOfMonth}일 · 다음: {new Date(expense.nextDueDate).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>

                  {/* 금액 */}
                  <div className="text-right mb-3">
                    <div className="sm:hidden">
                      <p className="text-xl font-bold text-accent-coral">
                        <span className="mr-0.5">₩</span>{formatNumber(expense.amount)}
                      </p>
                    </div>
                    <p className="hidden sm:block text-2xl font-bold text-accent-coral">
                      <span className="mr-0.5">₩</span>{formatNumber(expense.amount)}
                    </p>
                  </div>

                  {/* 하단: 액션 버튼 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {expense.history.length > 0 && (
                        <button
                          onClick={() => setExpandedHistoryId(expandedHistoryId === expense.id ? null : expense.id)}
                          className="text-xs sm:text-sm text-accent-blue rounded-[8px] hover:opacity-80 transition-colors cursor-pointer flex items-center gap-1 py-2 px-3 bg-blue-400/15"
                        >
                          <MdHistory className="text-sm" /> 이력
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedExpense(expense);
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                      >
                        <MdEdit className="text-lg" />
                      </button>
                      <button
                        onClick={() => setDeleteTargetExpense(expense)}
                        className="p-2 text-text-muted hover:text-accent-coral transition-colors cursor-pointer"
                      >
                        <MdDelete className="text-lg" />
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-text-muted">
                      {expense.isActive ? '활성' : '중지됨'}
                    </p>
                  </div>

                  {/* 금액 변경 이력 (확장) */}
                  {expandedHistoryId === expense.id && expense.history.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)]">
                      <p className="text-xs text-text-muted mb-2">금액 변경 이력</p>
                      {expense.history.map((h) => (
                        <div key={h.id} className="flex items-center justify-between text-xs py-1">
                          <span className="text-text-muted">
                            {new Date(h.changedAt).toLocaleDateString('ko-KR')}
                          </span>
                          <span className="text-text-secondary">
                            ₩{formatNumber(h.previousAmount)} → ₩{formatNumber(h.newAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-text-muted py-8 text-sm">
              정기 지출이 없습니다
            </div>
          )}
        </div>

        {/* 오른쪽: 카테고리별 현황 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <MdTrendingDown className="text-lg sm:text-xl text-accent-coral" /> 지출 현황
            </h2>
          </div>

          {summary && summary.categoryBreakdown.length > 0 ? (
            <div className="flex flex-col gap-2">
              {summary.categoryBreakdown.map((cat, i) => (
                <div
                  key={cat.name}
                  className="flex items-center justify-between bg-bg-secondary rounded-[12px] p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-[8px] flex items-center justify-center text-sm"
                      style={{
                        backgroundColor: `${cat.color || `hsl(${i * 60 + 200}, 50%, 55%)`}20`,
                        color: cat.color || `hsl(${i * 60 + 200}, 50%, 55%)`,
                      }}
                    >
                      <MdEventRepeat />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{cat.name}</p>
                      <p className="text-xs text-text-muted">₩{formatNumber(cat.amount)}/월</p>
                    </div>
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-accent-coral">
                    {cat.percentage}%
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-text-muted py-8 text-sm">
              정기 지출을 추가해주세요
            </div>
          )}
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {deleteTargetExpense && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setDeleteTargetExpense(null)}
        >
          <div
            className="bg-bg-card border border-[var(--border)] rounded-[20px] w-full max-w-sm animate-[fadeInUp_0.3s_ease-out] p-6 m-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-text-primary mb-3">
              정기 지출 삭제
            </h3>
            <p className="text-sm text-text-secondary mb-5">
              &apos;{deleteTargetExpense.description}&apos;을(를) 삭제하시겠습니까?<br />
              이미 생성된 거래 내역은 유지됩니다.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetExpense(null)}
                className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer p-3"
                disabled={isDeleting}
              >
                취소
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await handleDelete(deleteTargetExpense.id);
                    setDeleteTargetExpense(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="flex-1 bg-accent-coral text-white rounded-[12px] font-medium hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed p-3"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모달 */}
      <AddRecurringModal
        isOpen={isAddModalOpen}
        userId={userId}
        onClose={() => setIsAddModalOpen(false)}
        onSave={() => { fetchData(); onDataChange?.(); }}
      />

      <EditRecurringModal
        isOpen={isEditModalOpen}
        userId={userId}
        expense={selectedExpense}
        onClose={() => { setIsEditModalOpen(false); setSelectedExpense(null); }}
        onSave={() => { fetchData(); onDataChange?.(); }}
        onDelete={(id) => { handleDelete(id); setIsEditModalOpen(false); setSelectedExpense(null); }}
      />
    </div>
  );
}
