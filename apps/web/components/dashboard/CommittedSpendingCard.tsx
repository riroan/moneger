'use client';

import { memo, useState, useEffect, useCallback } from 'react';
import { formatNumber } from '@/utils/formatters';
import { MdEventRepeat } from 'react-icons/md';
import { useAuthStore } from '@/stores';

interface CategoryBreakdown {
  name: string;
  color: string | null;
  amount: number;
  percentage: number;
}

interface RecurringSummaryData {
  balance: number;
  remainingTotal: number;
  disposableAmount: number;
  totalMonthly: number;
  activeCount: number;
  categoryBreakdown: CategoryBreakdown[];
  alerts: {
    id: string;
    description: string;
    amount: number;
    nextDueDate: string;
    category: { name: string; color: string | null } | null;
  }[];
}

interface CommittedSpendingCardProps {
  onManage?: () => void;
}

function CommittedSpendingCard({ onManage }: CommittedSpendingCardProps) {
  const userId = useAuthStore((state) => state.userId);
  const [data, setData] = useState<RecurringSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/recurring/summary?userId=${userId}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
      // 에러 시 카드 미표시
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (isLoading) {
    return (
      <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] animate-pulse p-4">
        <div className="h-5 bg-bg-secondary rounded w-1/3 mb-3" />
        <div className="h-8 bg-bg-secondary rounded w-2/3 mb-2" />
        <div className="h-4 bg-bg-secondary rounded w-1/2" />
      </div>
    );
  }

  if (!data || data.activeCount === 0) {
    return (
      <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <MdEventRepeat className="text-lg sm:text-xl text-accent-coral" /> 정기 지출
          </h2>
          {onManage && (
            <button
              onClick={onManage}
              className="text-xs sm:text-sm text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
            >
              전체보기 →
            </button>
          )}
        </div>
        <div className="bg-bg-secondary rounded-[12px] text-center text-text-muted text-sm p-5">
          정기 지출을 등록해주세요
        </div>
      </div>
    );
  }

  // 가장 가까운 다음 지출
  const nextAlert = data.alerts[0] || null;
  const nextAlertDays = (() => {
    if (!nextAlert) return null;
    const dueDate = new Date(nextAlert.nextDueDate);
    const today = new Date();
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((dueDateOnly.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24));
  })();

  return (
    <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] animate-[fadeIn_0.6s_ease-out_0.3s_backwards] p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <MdEventRepeat className="text-lg sm:text-xl text-accent-coral" /> 정기 지출
        </h2>
        {onManage && (
          <button
            onClick={onManage}
            className="text-xs sm:text-sm text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
          >
            전체보기 →
          </button>
        )}
      </div>

      {/* 메인 카드 — 저축 카드와 유사한 형태 */}
      <div className="bg-bg-secondary rounded-[12px] p-4 mb-3">
        {/* 상단: 아이콘 + 정보 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-lg bg-accent-coral/15 text-accent-coral">
            <MdEventRepeat />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">월 정기 지출</p>
            <p className="text-xs text-text-muted">{data.activeCount}건 등록</p>
          </div>
        </div>

        {/* 중앙: 총액 */}
        <div className="text-right mb-3">
          <div className="sm:hidden">
            <p className="text-lg font-bold text-accent-coral">
              <span className="mr-0.5">₩</span>{formatNumber(data.totalMonthly)}
            </p>
            <p className="text-xs font-normal text-text-muted">
              이번 달 남은 지출 <span className="mr-px">₩</span>{formatNumber(data.remainingTotal)}
            </p>
          </div>
          <p className="hidden sm:block text-xl font-bold text-accent-coral">
            <span className="mr-0.5">₩</span>{formatNumber(data.totalMonthly)}
            <span className="text-sm font-normal text-text-muted ml-2">
              /월
            </span>
          </p>
        </div>
      </div>

      {/* 카테고리별 분석 */}
      {data.categoryBreakdown.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
          {data.categoryBreakdown.slice(0, 4).map((cat, i) => (
            <span key={cat.name} className="text-[10px] text-text-muted flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: cat.color || `hsl(${i * 60 + 200}, 50%, 55%)` }}
              />
              {cat.name} {cat.percentage}%
            </span>
          ))}
        </div>
      )}

      {/* 다가오는 결제 — 1건만 간결하게 */}
      {nextAlert && (
        <div className="text-xs text-text-muted">
          다음 지출: {nextAlert.description} ₩{formatNumber(nextAlert.amount)}
          <span className="text-accent-coral font-medium ml-1">
            {nextAlertDays !== null && nextAlertDays <= 0 ? '오늘' : `${nextAlertDays}일 후`}
          </span>
        </div>
      )}
    </div>
  );
}

export default memo(CommittedSpendingCard);
