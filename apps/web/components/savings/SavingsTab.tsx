'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { formatNumber, formatDateOnly } from '@/utils/formatters';
import { formatCurrency } from '@moneger/shared';
import { pnlClass, pnlMark, signedCurrency, signedPercent } from '@/lib/utils/pnl';
import { useModalStore } from '@/stores';
import type { TransactionWithCategory } from '@/types';
import { MdExpandMore } from 'react-icons/md';
import { FaPlus, FaGift, FaHeartbeat, FaStar, FaRegStar } from 'react-icons/fa';
import { MdSavings, MdTrendingUp, MdHome, MdDirectionsCar, MdSchool, MdFlight, MdDevices, MdEdit, MdDelete, MdCalendarToday, MdCheckCircle } from 'react-icons/md';

const AddSavingsGoalModal = dynamic(() => import('./AddSavingsGoalModal'), { ssr: false });
const EditSavingsGoalModal = dynamic(() => import('./EditSavingsGoalModal'), { ssr: false });
const DepositModal = dynamic(() => import('./DepositModal'), { ssr: false });
const SavingsTrendChart = dynamic(() => import('./SavingsTrendChart'), { ssr: false });

const MAX_GOALS = 10;

interface SavingsGoal {
  id: string;
  name: string;
  icon: string;
  targetDate: string;
  currentAmount: number;
  targetAmount: number;
  progressPercent: number;
  monthlyRequired: number;
  monthlyTarget: number;
  thisMonthSavings: number;
  isPrimary: boolean;
  recentDeposits: TransactionWithCategory[];
  depositCount: number;
}

// 아코디언 "더보기"로 추가 로드된 입금 페이지 상태 (goalId별).
interface DepositPage {
  items: TransactionWithCategory[];
  cursor: string | null;
  hasMore: boolean;
  loading: boolean;
}

interface SavingsTabProps {
  userId: string;
  onDataChange?: () => void;
}

const GOAL_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  home: MdHome,
  car: MdDirectionsCar,
  school: MdSchool,
  travel: MdFlight,
  device: MdDevices,
  gift: FaGift,
  health: FaHeartbeat,
  savings: MdSavings,
};

export default function SavingsTab({ userId, onDataChange }: SavingsTabProps) {
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
  const [deleteTargetGoal, setDeleteTargetGoal] = useState<SavingsGoal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // 연결된 증권 계좌의 평가액(goalId → { 평가액 합, 유효 스냅샷 여부 }).
  // key가 있으면 "연결됨", hasValue=false면 "동기화 중"(아직 유효 스냅샷 없음).
  const [goalValuations, setGoalValuations] = useState<
    Record<string, { marketValueKrw: number; hasValue: boolean }>
  >({});
  // 입금 내역 아코디언: 펼친 목표 + "더보기"로 추가 로드된 페이지(goalId별).
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [moreByGoal, setMoreByGoal] = useState<Record<string, DepositPage>>({});
  // 전역 저축 입금 모달(조회/삭제). 아코디언 항목 탭 → 이 모달을 연다.
  const openSavingsTransactionModal = useModalStore((s) => s.openSavingsTransactionModal);
  const isSavingsTxModalOpen = useModalStore((s) => s.isSavingsTransactionModalOpen);

  const fetchSavingsGoals = useCallback(async () => {
    try {
      const response = await fetch(`/api/savings?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSavingsGoals(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch savings goals:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 증권 연동 평가액을 목표별로 집계. /api/brokerage/overview를 단일 소스로 재사용.
  const fetchGoalValuations = useCallback(async () => {
    try {
      const response = await fetch(`/api/brokerage/overview?userId=${userId}`);
      if (!response.ok) return;
      const data = await response.json();
      const accounts: Array<{ savingsGoalId: string | null; totalEquityKrw: string | null }> =
        (data.data?.connections ?? []).flatMap(
          (connection: { accounts?: Array<{ savingsGoalId: string | null; totalEquityKrw: string | null }> }) =>
            connection.accounts ?? []
        );
      const byGoal: Record<string, { marketValueKrw: number; hasValue: boolean }> = {};
      for (const account of accounts) {
        if (!account.savingsGoalId) continue;
        const equity = Number(account.totalEquityKrw ?? 0);
        const entry = byGoal[account.savingsGoalId] ?? { marketValueKrw: 0, hasValue: false };
        if (Number.isFinite(equity) && equity > 0) {
          entry.marketValueKrw += equity;
          entry.hasValue = true;
        }
        byGoal[account.savingsGoalId] = entry; // key 존재 = 연결됨
      }
      setGoalValuations(byGoal);
    } catch {
      // 평가액은 보조 정보 — 실패해도 목표 카드는 정상 표시.
    }
  }, [userId]);

  useEffect(() => {
    fetchSavingsGoals();
    fetchGoalValuations();
  }, [fetchSavingsGoals, fetchGoalValuations]);

  // 전역 저축 입금 모달이 닫히면(삭제 등 변경 가능) 목표·평가액을 다시 불러 동기화.
  // recentDeposits가 /api/savings에 embed돼 있어 이 한 번으로 모든 목표의 최근 입금·합계가 갱신된다.
  // 입금이 다른 목표로 이동/삭제된 경우, 다중 펼침, "닫힘 시점 펼친 목표≠편집 대상" 모두 처리.
  const prevModalOpenRef = useRef(false);
  useEffect(() => {
    if (prevModalOpenRef.current && !isSavingsTxModalOpen) {
      setMoreByGoal({}); // 페이징 리셋 → embed된 최근 입금부터 다시 표시
      fetchSavingsGoals();
      fetchGoalValuations();
    }
    prevModalOpenRef.current = isSavingsTxModalOpen;
  }, [isSavingsTxModalOpen, fetchSavingsGoals, fetchGoalValuations]);

  const toggleExpand = useCallback((goalId: string) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) next.delete(goalId);
      else next.add(goalId);
      return next;
    });
  }, []);

  // "더보기": 첫 클릭은 API 1페이지(최근 embed의 상위집합)로 교체, 이후 cursor로 append.
  const loadMore = useCallback(
    async (goalId: string) => {
      const prev = moreByGoal[goalId];
      if (prev?.loading) return;
      const cursor = prev?.cursor ?? null;
      setMoreByGoal((m) => ({
        ...m,
        [goalId]: { items: prev?.items ?? [], cursor, hasMore: prev?.hasMore ?? true, loading: true },
      }));
      try {
        const params = new URLSearchParams({ userId, savingsGoalId: goalId, limit: '20' });
        if (cursor) params.set('cursor', cursor);
        const res = await fetch(`/api/transactions?${params.toString()}`);
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        setMoreByGoal((m) => ({
          ...m,
          [goalId]: {
            items: [...(prev?.items ?? []), ...((json.data ?? []) as TransactionWithCategory[])],
            cursor: json.nextCursor ?? null,
            hasMore: !!json.hasMore,
            loading: false,
          },
        }));
      } catch {
        setMoreByGoal((m) => ({
          ...m,
          [goalId]: { items: prev?.items ?? [], cursor, hasMore: false, loading: false },
        }));
      }
    },
    [moreByGoal, userId]
  );

  const totalSavings = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalTarget = savingsGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  // 각 목표별 남은 금액의 합 (초과 달성 시 0)
  const totalMonthlyRemaining = savingsGoals.reduce(
    (sum, goal) => sum + Math.max(0, goal.monthlyTarget - goal.thisMonthSavings),
    0
  );

  const handleAddGoal = async (goalData: {
    name: string;
    icon: string;
    targetAmount: number;
    currentAmount: number;
    startYear: number;
    startMonth: number;
    targetYear: number;
    targetMonth: number;
  }) => {
    try {
      const response = await fetch('/api/savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...goalData }),
      });

      if (response.ok) {
        await fetchSavingsGoals();
        onDataChange?.();
      }
    } catch (error) {
      console.error('Failed to add savings goal:', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleEditGoal = async (goalData: {
    id: string;
    name: string;
    icon: string;
    targetAmount: number;
    targetYear: number;
    targetMonth: number;
    brokerageAccountIds: string[];
  }) => {
    try {
      const response = await fetch(`/api/savings/${goalData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...goalData }),
      });

      if (response.ok) {
        await Promise.all([fetchSavingsGoals(), fetchGoalValuations()]);
        onDataChange?.();
      }
    } catch (error) {
      console.error('Failed to update savings goal:', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      const response = await fetch(`/api/savings/${id}?userId=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchSavingsGoals();
        onDataChange?.();
      }
    } catch (error) {
      console.error('Failed to delete savings goal:', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleGoalClick = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setIsEditModalOpen(true);
  };

  const handleDepositClick = (e: React.MouseEvent, goal: SavingsGoal) => {
    e.stopPropagation();
    setDepositGoal(goal);
    setIsDepositModalOpen(true);
  };

  const handleDeposit = async (goalId: string, amount: number) => {
    try {
      const response = await fetch(`/api/savings/${goalId}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount,
        }),
      });

      if (response.ok) {
        await fetchSavingsGoals();
        onDataChange?.();
      }
    } catch (error) {
      console.error('Failed to deposit:', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleTogglePrimary = async (e: React.MouseEvent, goalId: string, currentIsPrimary: boolean) => {
    e.stopPropagation();

    try {
      const response = await fetch(`/api/savings/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          isPrimary: !currentIsPrimary,
        }),
      });

      if (response.ok) {
        await fetchSavingsGoals();
        onDataChange?.();
      }
    } catch (error) {
      console.error('Failed to toggle primary goal:', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const canAddGoal = savingsGoals.length < MAX_GOALS;

  const getIconComponent = (iconName: string) => {
    return GOAL_ICON_MAP[iconName] || MdSavings;
  };

  return (
    <div className="animate-[fadeIn_0.5s_ease-out]">
      {/* 저축 요약 카드 */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4"
      >
        {/* 총 저축액 */}
        <div
          className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-5"
        >
          <p className="text-xs sm:text-sm text-text-secondary mb-1.5">총 저축액</p>
          <p className="text-2xl sm:text-3xl font-bold text-text-primary">
            <span className="mr-0.5">₩</span>{formatNumber(totalSavings)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            목표 <span className="mr-px">₩</span>{formatNumber(totalTarget)}
          </p>
        </div>

        {/* 이번 달 저축 현황 */}
        <div
          className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-5"
        >
          <p className="text-xs sm:text-sm text-text-secondary mb-1.5">이번 달 저축</p>
          {totalMonthlyRemaining === 0 ? (
            <p className="text-2xl sm:text-3xl font-bold text-accent-mint">
              목표 달성!
            </p>
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-text-primary">
              ₩{formatNumber(totalMonthlyRemaining)}
              <span className="text-base sm:text-lg text-text-muted font-normal"> 더 필요</span>
            </p>
          )}
          <p className="text-xs text-text-muted mt-1">
            {savingsGoals.length}개 목표 기준
          </p>
        </div>

        {/* 전체 달성률 */}
        <div
          className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] sm:col-span-2 lg:col-span-1 p-5"
        >
          <p className="text-xs sm:text-sm text-text-secondary mb-1.5">전체 달성률</p>
          <p className="text-2xl sm:text-3xl font-bold text-accent-blue">
            {totalTarget > 0 ? Math.round((totalSavings / totalTarget) * 100) : 0}%
          </p>
          <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden mt-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-mint to-accent-blue transition-all duration-300"
              style={{ width: `${totalTarget > 0 ? Math.min(Math.round((totalSavings / totalTarget) * 100), 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 저축 목표 카드 */}
        <div
          className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <MdSavings className="text-lg sm:text-xl text-[#FBBF24]" /> 저축 목표
              <span className="text-xs sm:text-sm text-text-muted font-normal">({savingsGoals.length}/{MAX_GOALS})</span>
            </h2>
            {canAddGoal ? (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs sm:text-sm text-text-muted hover:text-text-secondary transition-colors cursor-pointer flex items-center gap-1"
              >
                <FaPlus className="text-xs" /> 목표 추가
              </button>
            ) : (
              <span className="text-xs sm:text-sm text-text-muted">최대 개수 도달</span>
            )}
          </div>

          {isLoading ? (
            <div className="text-center text-text-muted py-8 text-sm">
              로딩 중...
            </div>
          ) : savingsGoals.length > 0 ? (
            <div className="flex flex-col gap-3">
              {savingsGoals.map((goal) => {
                const IconComponent = getIconComponent(goal.icon);
                const valuation = goalValuations[goal.id];
                const isLinked = valuation != null;
                const hasValue = valuation?.hasValue ?? false;
                const marketValue = valuation?.marketValueKrw ?? 0;
                const pnl = marketValue - goal.currentAmount;
                const expanded = expandedGoals.has(goal.id);
                const more = moreByGoal[goal.id];
                const deposits = more?.items ?? goal.recentDeposits;
                const showLoadMore = more ? more.hasMore : goal.recentDeposits.length >= 5;
                return (
                  <div
                    key={goal.id}
                    className="bg-bg-secondary hover:bg-bg-card-hover rounded-[14px] transition-colors p-4"
                  >
                    {/* 상단: 아이콘 + 이름/배지/날짜 (이름은 길면 줄임, 배지는 항상 보임) */}
                    <div className="flex items-start gap-3 mb-2">
                      <button
                        onClick={(e) => handleTogglePrimary(e, goal.id, goal.isPrimary)}
                        className="w-11 h-11 rounded-[10px] flex items-center justify-center text-lg relative cursor-pointer transition-all hover:scale-105 bg-amber-400/15 text-amber-400 shrink-0"
                        title={goal.isPrimary ? '대표 목표 해제' : '대표 목표로 설정'}
                      >
                        <IconComponent />
                        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                          goal.isPrimary ? 'bg-amber-400' : 'bg-gray-400/50'
                        }`}>
                          {goal.isPrimary ? (
                            <FaStar className="text-[8px] text-white" />
                          ) : (
                            <FaRegStar className="text-[8px] text-white/70" />
                          )}
                        </div>
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm sm:text-base font-medium truncate max-w-full">{goal.name}</p>
                          {goal.isPrimary && (
                            <span className="text-xs text-amber-400 font-medium shrink-0">대표</span>
                          )}
                          {isLinked && (
                            <span className="text-[10px] sm:text-xs font-medium rounded-lg px-2 py-0.5 bg-accent-blue/20 text-accent-blue shrink-0">
                              연동
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">{goal.targetDate}</p>
                      </div>
                    </div>

                    {/* 금액: 원금 / 목표 (진척%) — 풀폭 우측 정렬, 잘리지 않게 (좁으면 목표가 다음 줄로) */}
                    <div className="flex items-baseline justify-end gap-x-2 gap-y-0.5 flex-wrap mb-3">
                      <span className="text-lg sm:text-2xl font-bold text-text-primary tabular-nums leading-tight">
                        <span className="mr-0.5">₩</span>{formatNumber(goal.currentAmount)}
                      </span>
                      <span className="text-[11px] sm:text-xs text-text-muted tabular-nums">
                        / <span className="mr-px">₩</span>{formatNumber(goal.targetAmount)}
                        <span className="text-accent-mint font-semibold ml-1">({goal.progressPercent}%)</span>
                      </span>
                    </div>

                    {/* 진행률 바 (원금/목표 기준 — 비연결 목표와 의미 동일) */}
                    <div className="w-full h-2 bg-bg-card rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent-mint to-accent-blue transition-all duration-300"
                        style={{ width: `${Math.min(goal.progressPercent, 100)}%` }}
                      />
                    </div>

                    {/* 연동 목표: 원금(위 currentAmount) 대비 평가액·손익 보조줄.
                        손익 색/마크는 InvestmentsTab과 동일 컨벤션(pnl 유틸 재사용). */}
                    {isLinked && (
                      <div className="flex flex-wrap items-baseline justify-end gap-x-3 gap-y-0.5 mb-3 text-xs sm:text-sm tabular-nums">
                        {hasValue ? (
                          <>
                            <span className="text-text-secondary whitespace-nowrap">
                              평가액 {formatCurrency(marketValue)}
                            </span>
                            <span className={`font-medium whitespace-nowrap ${pnlClass(pnl)}`}>
                              {pnlMark(pnl)} {signedCurrency(pnl)}
                              {goal.currentAmount > 0 && (
                                <span className="ml-1 opacity-70">{signedPercent(pnl / goal.currentAmount)}</span>
                              )}
                            </span>
                          </>
                        ) : (
                          <span className="text-text-muted">평가액 동기화 중…</span>
                        )}
                      </div>
                    )}

                    {/* 하단: 저축하기 + 편집/삭제 버튼 (한 줄) / 이번 달 상태는 아래 줄 우측 정렬 */}
                    <div className="pt-3 border-t border-[var(--border)]">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => handleDepositClick(e, goal)}
                          className="text-xs sm:text-sm text-accent-mint rounded-[8px] hover:opacity-80 transition-colors cursor-pointer flex items-center gap-1 py-1.5 px-3 bg-emerald-400/15 whitespace-nowrap shrink-0"
                        >
                          <FaPlus className="text-[10px]" /> 저축하기
                        </button>
                        <button
                          onClick={() => handleGoalClick(goal)}
                          className="p-1.5 rounded-[8px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                          title="편집"
                        >
                          <MdEdit className="text-base" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetGoal(goal)}
                          className="p-1.5 rounded-[8px] text-text-muted hover:text-accent-coral transition-colors cursor-pointer"
                          title="삭제"
                        >
                          <MdDelete className="text-base" />
                        </button>
                      </div>
                      {goal.thisMonthSavings >= goal.monthlyTarget ? (
                        <p className="text-right text-xs sm:text-sm font-medium text-accent-mint mt-2 tabular-nums">
                          이번 달 완료!
                        </p>
                      ) : (
                        <p className="text-right text-xs sm:text-sm text-text-primary mt-2 tabular-nums">
                          ₩{formatNumber(goal.monthlyTarget - goal.thisMonthSavings)}
                          <span className="text-text-muted"> 더 필요</span>
                        </p>
                      )}
                    </div>

                    {/* 입금 내역 아코디언 (조회 + 탭하면 조회/삭제 모달). 기본 접힘.
                        상단 구분선으로 액션 영역과 분리. */}
                    <button
                      onClick={() => toggleExpand(goal.id)}
                      className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer border-t border-[var(--border)] pt-3 pb-1"
                      aria-expanded={expanded}
                    >
                      입금 내역
                      <MdExpandMore className={`text-sm transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                    {expanded && (
                      <div className="mt-1 flex flex-col gap-0.5">
                        {deposits.length === 0 ? (
                          <p className="text-xs text-text-muted text-center py-3">아직 입금 내역이 없어요</p>
                        ) : (
                          <>
                            {deposits.map((deposit, index) => (
                              <button
                                key={deposit.id}
                                onClick={() => openSavingsTransactionModal(deposit)}
                                className="flex items-center gap-2 py-1.5 px-2 rounded-[8px] hover:bg-bg-card transition-colors cursor-pointer text-left"
                              >
                                <span className="text-[12px] text-text-muted tabular-nums shrink-0 w-[64px]">
                                  {formatDateOnly(deposit.date)}
                                </span>
                                <span className="text-[13px] text-text-secondary tabular-nums flex-1">
                                  {goal.depositCount - index}회차
                                </span>
                                <span className="text-[13px] text-accent-mint tabular-nums whitespace-nowrap shrink-0">
                                  +₩{formatNumber(deposit.amount)}
                                </span>
                              </button>
                            ))}
                            {showLoadMore && (
                              <button
                                onClick={() => loadMore(goal.id)}
                                disabled={more?.loading}
                                className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer py-1.5 disabled:opacity-50"
                              >
                                {more?.loading ? '불러오는 중…' : '더보기'}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-text-muted py-8 text-sm">
              저축 목표가 없습니다
            </div>
          )}
        </div>

        {/* 오른쪽 컬럼: 추세 + 이번 달 진행 */}
        <div className="flex flex-col gap-4">
          {/* 저축 추세 차트 */}
          <div
            className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <MdTrendingUp className="text-lg sm:text-xl text-accent-mint" /> 저축 추세
              </h2>
            </div>

            <SavingsTrendChart userId={userId} />
          </div>

          {/* 이번 달 진행 */}
          <div
            className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <MdCalendarToday className="text-lg sm:text-xl text-accent-blue" /> 이번 달 진행
              </h2>
            </div>

            {savingsGoals.length > 0 ? (
              <div className="flex flex-col gap-2">
                {savingsGoals.map((goal) => {
                  const IconComponent = getIconComponent(goal.icon);
                  const progress = goal.monthlyTarget > 0
                    ? Math.min(Math.round((goal.thisMonthSavings / goal.monthlyTarget) * 100), 100)
                    : 0;
                  const isComplete = goal.thisMonthSavings >= goal.monthlyTarget;

                  return (
                    <div
                      key={goal.id}
                      className="bg-bg-secondary rounded-[12px] p-3"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-7 h-7 rounded-[8px] flex items-center justify-center text-sm bg-amber-400/15 text-amber-400">
                          <IconComponent />
                        </div>
                        <p className="text-sm font-medium flex-1 truncate">{goal.name}</p>
                        {isComplete ? (
                          <MdCheckCircle className="text-lg text-accent-mint" />
                        ) : (
                          <span className="text-xs text-text-muted">
                            {progress}%
                          </span>
                        )}
                      </div>
                      <div className="w-full h-1.5 bg-bg-card rounded-full overflow-hidden mb-1.5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isComplete ? 'bg-accent-mint' : progress >= 50 ? 'bg-accent-blue' : 'bg-text-muted'
                          }`}
                          style={{ width: `${Math.max(progress, goal.thisMonthSavings > 0 ? 2 : 0)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between overflow-hidden">
                        <p className="text-xs text-text-muted truncate">
                          <span className="mr-px">₩</span>{formatNumber(goal.thisMonthSavings)}
                          <span className="mx-1">/</span>
                          <span className="mr-px">₩</span>{formatNumber(goal.monthlyTarget)}
                        </p>
                        {isComplete && (
                          <p className="text-xs font-medium text-accent-mint">완료!</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-text-muted py-8 text-sm">
                저축 목표를 추가해주세요
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {deleteTargetGoal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setDeleteTargetGoal(null)}
        >
          <div
            className="bg-bg-card border border-[var(--border)] rounded-[20px] w-full max-w-sm animate-[fadeInUp_0.3s_ease-out] p-6 m-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-text-primary mb-3">
              저축 목표 삭제
            </h3>
            <p className="text-sm text-text-secondary mb-5">
              &apos;{deleteTargetGoal.name}&apos;을(를) 삭제하시겠습니까?<br />
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetGoal(null)}
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
                    await handleDeleteGoal(deleteTargetGoal.id);
                    setDeleteTargetGoal(null);
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

      {/* 저축 목표 추가 모달 */}
      <AddSavingsGoalModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddGoal}
      />

      {/* 저축 목표 수정 모달 */}
      <EditSavingsGoalModal
        isOpen={isEditModalOpen}
        goal={selectedGoal}
        userId={userId}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedGoal(null);
        }}
        onSave={handleEditGoal}
      />

      {/* 저축하기 모달 */}
      <DepositModal
        isOpen={isDepositModalOpen}
        goal={depositGoal}
        onClose={() => {
          setIsDepositModalOpen(false);
          setDepositGoal(null);
        }}
        onDeposit={handleDeposit}
      />
    </div>
  );
}
