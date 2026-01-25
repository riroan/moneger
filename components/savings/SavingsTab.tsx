'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { formatNumber } from '@/utils/formatters';
import { FaPlus, FaGift, FaHeartbeat, FaStar, FaRegStar } from 'react-icons/fa';
import { MdSavings, MdTrendingUp, MdHome, MdDirectionsCar, MdSchool, MdFlight, MdDevices } from 'react-icons/md';

const AddSavingsGoalModal = dynamic(() => import('./AddSavingsGoalModal'), { ssr: false });
const EditSavingsGoalModal = dynamic(() => import('./EditSavingsGoalModal'), { ssr: false });
const DepositModal = dynamic(() => import('./DepositModal'), { ssr: false });

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

  useEffect(() => {
    fetchSavingsGoals();
  }, [fetchSavingsGoals]);

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
  }) => {
    try {
      const response = await fetch(`/api/savings/${goalData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...goalData }),
      });

      if (response.ok) {
        await fetchSavingsGoals();
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
                return (
                  <div
                    key={goal.id}
                    className="bg-bg-secondary rounded-[12px] sm:rounded-[14px] cursor-pointer transition-all hover:bg-bg-card-hover p-4"
                    onClick={() => handleGoalClick(goal)}
                  >
                    {/* 상단: 아이콘 + 이름/대표/날짜 */}
                    <div className="flex items-center gap-3 mb-4">
                      <button
                        onClick={(e) => handleTogglePrimary(e, goal.id, goal.isPrimary)}
                        className="w-10 h-10 rounded-[10px] flex items-center justify-center text-lg relative cursor-pointer transition-all hover:scale-105 bg-amber-400/15 text-amber-400"
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
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm sm:text-base font-medium truncate">{goal.name}</p>
                          {goal.isPrimary && (
                            <span className="text-xs text-amber-400 font-medium">대표</span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted">{goal.targetDate}</p>
                      </div>
                    </div>

                    {/* 중앙: 현재 금액 / 목표 금액 (퍼센트) */}
                    <div className="text-right mb-3">
                      {/* 모바일: 두 줄 */}
                      <div className="sm:hidden">
                        <p className="text-xl font-bold text-text-primary">
                          <span className="mr-0.5">₩</span>{formatNumber(goal.currentAmount)}
                        </p>
                        <p className="text-sm font-normal text-text-muted">
                          / <span className="mr-px">₩</span>{formatNumber(goal.targetAmount)}
                          <span className="font-semibold text-accent-mint">
                            {' '}({goal.progressPercent}%)
                          </span>
                        </p>
                      </div>
                      {/* 데스크톱: 한 줄 */}
                      <p className="hidden sm:block text-2xl font-bold text-text-primary">
                        <span className="mr-0.5">₩</span>{formatNumber(goal.currentAmount)}
                        <span className="text-base font-normal text-text-muted ml-2">
                          / <span className="mr-px">₩</span>{formatNumber(goal.targetAmount)}
                        </span>
                        <span className="text-base font-semibold text-accent-mint">
                          {' '}({goal.progressPercent}%)
                        </span>
                      </p>
                    </div>

                    {/* 진행률 바 */}
                    <div className="w-full h-2 bg-bg-card rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent-mint to-accent-blue transition-all duration-300"
                        style={{ width: `${Math.min(goal.progressPercent, 100)}%` }}
                      />
                    </div>

                    {/* 하단: 저축하기 버튼 + 이번 달 저축 상태 */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={(e) => handleDepositClick(e, goal)}
                        className="text-xs sm:text-sm text-accent-mint rounded-[8px] hover:opacity-80 transition-colors cursor-pointer flex items-center gap-1 py-2 px-4 bg-emerald-400/15"
                      >
                        <FaPlus className="text-[10px]" /> 저축하기
                      </button>
                      {goal.thisMonthSavings >= goal.monthlyTarget ? (
                        <p className="text-xs sm:text-sm font-medium text-accent-mint">
                          이번 달 완료!
                        </p>
                      ) : (
                        <p className="text-xs sm:text-sm text-text-primary">
                          ₩{formatNumber(goal.monthlyTarget - goal.thisMonthSavings)}
                          <span className="text-text-muted"> 더 필요</span>
                        </p>
                      )}
                    </div>
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

        {/* 저축 요약 카드 */}
        <div
          className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <MdTrendingUp className="text-lg sm:text-xl text-accent-mint" /> 저축 현황
            </h2>
          </div>

          {savingsGoals.length > 0 ? (
            <div className="flex flex-col gap-2">
              {savingsGoals.map((goal) => {
                const IconComponent = getIconComponent(goal.icon);
                return (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between bg-bg-secondary rounded-[12px] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-[8px] flex items-center justify-center text-sm bg-amber-400/15 text-amber-400"
                      >
                        <IconComponent />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{goal.name}</p>
                        <p className="text-xs text-text-muted">{goal.targetDate}</p>
                      </div>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-accent-mint">
                      <span className="font-medium">({goal.progressPercent}%)</span>
                    </p>
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
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedGoal(null);
        }}
        onSave={handleEditGoal}
        onDelete={handleDeleteGoal}
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
