'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatNumber } from '@/utils/formatters';
import { FaPlus } from 'react-icons/fa';
import { MdEventRepeat, MdEdit, MdDelete, MdHistory, MdPieChart, MdSchedule } from 'react-icons/md';

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

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalMonthly = summary?.totalMonthly || 0;
  const activeCount = summary?.activeCount || 0;
  const processedThisMonth = summary?.processedThisMonth || 0;

  return (
    <div className="animate-[fadeIn_0.5s_ease-out]">
      {/* 상단 요약 카드 3개 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {/* 월 고정비 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-5">
          <p className="text-xs sm:text-sm text-text-secondary mb-1.5">월 고정비</p>
          <p className="text-2xl sm:text-3xl font-bold text-accent-coral">
            <span className="mr-0.5">₩</span>{formatNumber(totalMonthly)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {activeCount}개 항목
          </p>
        </div>

        {/* 이번 달 처리 현황 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-5">
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

        {/* 남은 고정비 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] sm:col-span-2 lg:col-span-1 p-5">
          <p className="text-xs sm:text-sm text-text-secondary mb-1.5">남은 고정비</p>
          {(summary?.remainingTotal ?? 0) === 0 ? (
            <p className="text-2xl sm:text-3xl font-bold text-accent-mint">
              모두 처리!
            </p>
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-text-primary">
              <span className="mr-0.5">₩</span>{formatNumber(summary?.remainingTotal ?? 0)}
            </p>
          )}
          <p className="text-xs text-text-muted mt-1">
            이번 달 미처리 금액
          </p>
        </div>
      </div>

      {/* 하단 2칸럼 — 저축 페이지와 동일한 구조 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 왼쪽: 고정비 목록 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4 self-start">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <MdEventRepeat className="text-lg sm:text-xl text-accent-coral" /> 고정비
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
                  className={`bg-bg-secondary hover:bg-bg-card-hover rounded-[14px] transition-colors p-4 ${
                    !expense.isActive ? 'opacity-50' : ''
                  }`}
                >
                  {/* 상단: 토글 + 이름/메타 + 금액 */}
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleActive(expense)}
                      className={`w-11 h-11 rounded-[10px] flex items-center justify-center text-lg cursor-pointer transition-all hover:scale-105 shrink-0 ${
                        expense.isActive
                          ? 'bg-accent-coral/15 text-accent-coral'
                          : 'bg-gray-400/15 text-gray-400'
                      }`}
                      title={expense.isActive ? '중지하기' : '활성화하기'}
                    >
                      <MdEventRepeat />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
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
                      <p className="text-xs text-text-muted mt-0.5">
                        매월 {expense.dayOfMonth}일 · 다음 {new Date(expense.nextDueDate).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-accent-coral shrink-0 tabular-nums">
                      <span className="mr-0.5">₩</span>{formatNumber(expense.amount)}
                    </p>
                  </div>

                  {/* 하단: 액션 버튼 (통일된 ghost 스타일) */}
                  <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-[var(--border)]">
                    {expense.history.length > 0 && (
                      <button
                        onClick={() => setExpandedHistoryId(expandedHistoryId === expense.id ? null : expense.id)}
                        className="flex items-center gap-1 text-xs text-text-muted hover:text-accent-blue transition-colors cursor-pointer py-1.5 px-2 rounded-[8px]"
                      >
                        <MdHistory className="text-sm" /> 이력
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedExpense(expense);
                        setIsEditModalOpen(true);
                      }}
                      className="p-1.5 rounded-[8px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                      title="편집"
                    >
                      <MdEdit className="text-base" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetExpense(expense)}
                      className="p-1.5 rounded-[8px] text-text-muted hover:text-accent-coral transition-colors cursor-pointer"
                      title="삭제"
                    >
                      <MdDelete className="text-base" />
                    </button>
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
                          <span className="text-text-secondary tabular-nums">
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
              고정비가 없습니다
            </div>
          )}
        </div>

        {/* 오른쪽 컬럼: 카테고리 현황 + 다가오는 지출 */}
        <div className="flex flex-col gap-4">
          {/* 항목별 비중 */}
          <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <MdPieChart className="text-lg sm:text-xl text-accent-coral" /> 항목별 비중
              </h2>
            </div>

            {(() => {
              const activeExpenses = expenses.filter((e) => e.isActive).sort((a, b) => b.amount - a.amount);
              const itemTotal = activeExpenses.reduce((sum, e) => sum + e.amount, 0);

              if (activeExpenses.length === 0) {
                return (
                  <div className="text-center text-text-muted py-8 text-sm">
                    고정비를 추가해주세요
                  </div>
                );
              }

              return (
                <>
                  {/* Donut Chart */}
                  <div className="flex justify-center items-center relative mb-4 h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart style={{ outline: 'none' }}>
                        <Pie
                          data={activeExpenses.map((e, i) => ({
                            name: e.description,
                            value: e.amount,
                            color: e.category?.color || `hsl(${i * 47 + 180}, 50%, 55%)`,
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={hoveredIndex !== null ? 42 : 45}
                          outerRadius={75}
                          paddingAngle={2}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                          isAnimationActive={false}
                          onMouseEnter={(_, index) => setHoveredIndex(index)}
                          onMouseLeave={() => setHoveredIndex(null)}
                        >
                          {activeExpenses.map((e, i) => (
                            <Cell
                              key={e.id}
                              fill={e.category?.color || `hsl(${i * 47 + 180}, 50%, 55%)`}
                              opacity={hoveredIndex === null || hoveredIndex === i ? 0.9 : 0.4}
                              style={{
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                transform: hoveredIndex === i ? 'scale(1.05)' : 'scale(1)',
                                transformOrigin: 'center',
                              }}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                      {hoveredIndex !== null && activeExpenses[hoveredIndex] ? (
                        <>
                          <div className="font-bold text-text-primary text-sm sm:text-base">
                            ₩{formatNumber(activeExpenses[hoveredIndex].amount)}
                          </div>
                          <div className="text-[10px] sm:text-xs text-text-muted mt-0.5 max-w-[80px] text-center truncate">
                            {activeExpenses[hoveredIndex].description}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-bold text-text-primary text-sm sm:text-base">
                            ₩{formatNumber(itemTotal)}
                          </div>
                          <div className="text-[10px] sm:text-xs text-text-muted mt-0.5">
                            월 합계
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Item List */}
                  <div className="flex flex-col gap-2">
                    {activeExpenses.map((e, i) => {
                      const pct = itemTotal > 0 ? Math.round((e.amount / itemTotal) * 100) : 0;
                      const color = e.category?.color || `hsl(${i * 47 + 180}, 50%, 55%)`;
                      return (
                        <div
                          key={e.id}
                          className={`flex items-center justify-between rounded-[12px] p-3 transition-all cursor-pointer ${
                            hoveredIndex === i ? 'bg-bg-card-hover translate-x-1' : 'bg-bg-secondary hover:bg-bg-card-hover hover:translate-x-1'
                          }`}
                          onMouseEnter={() => setHoveredIndex(i)}
                          onMouseLeave={() => setHoveredIndex(null)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-3 h-3 rounded-full shrink-0 transition-transform ${hoveredIndex === i ? 'scale-150' : ''}`}
                              style={{ backgroundColor: color }}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{e.description}</p>
                              <p className="text-xs text-text-muted">₩{formatNumber(e.amount)}/월</p>
                            </div>
                          </div>
                          <p className="text-sm sm:text-base font-semibold text-accent-coral ml-2 shrink-0">
                            {pct}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>

          {/* 다가오는 지출 일정 */}
          <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <MdSchedule className="text-lg sm:text-xl text-accent-blue" /> 다가오는 지출
              </h2>
            </div>

            {(() => {
              const activeExpenses = expenses
                .filter((e) => e.isActive)
                .map((e) => {
                  const now = new Date();
                  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
                  const todayStr = kstNow.toISOString().split('T')[0];
                  const dueDate = e.nextDueDate.split('T')[0];
                  const diffMs = new Date(dueDate).getTime() - new Date(todayStr).getTime();
                  const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));
                  return { ...e, daysLeft };
                })
                .sort((a, b) => a.daysLeft - b.daysLeft);

              if (activeExpenses.length === 0) {
                return (
                  <div className="text-center text-text-muted py-8 text-sm">
                    고정비를 추가해주세요
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-2">
                  {activeExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between bg-bg-secondary rounded-[12px] p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`min-w-[44px] text-center text-xs font-medium rounded-[8px] py-1.5 px-2 ${
                          expense.daysLeft <= 0
                            ? 'bg-accent-coral/15 text-accent-coral'
                            : expense.daysLeft <= 3
                            ? 'bg-accent-yellow/15 text-accent-yellow'
                            : 'bg-accent-blue/15 text-accent-blue'
                        }`}>
                          {expense.daysLeft <= 0 ? '오늘' : `${expense.daysLeft}일 후`}
                        </div>
                        <p className="text-sm font-medium truncate">{expense.description}</p>
                      </div>
                      <p className="text-sm font-semibold text-accent-coral whitespace-nowrap ml-2">
                        ₩{formatNumber(expense.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
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
              고정비 삭제
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
