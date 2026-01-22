'use client';

import { formatNumber } from '@/utils/formatters';
import { FaChartLine, FaStar, FaGift, FaHeartbeat } from 'react-icons/fa';
import { MdSavings, MdHome, MdDirectionsCar, MdSchool, MdFlight, MdDevices } from 'react-icons/md';

interface PrimaryGoal {
  id: string;
  name: string;
  icon: string;
  currentAmount: number;
  targetAmount: number;
  targetDate: string;
  progressPercent: number;
}

interface SavingsCardProps {
  savingsGoal: number;
  currentSavings: number;
  primaryGoal?: PrimaryGoal | null;
  onViewAll?: () => void;
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

export default function SavingsCard({
  savingsGoal,
  currentSavings,
  primaryGoal,
  onViewAll,
}: SavingsCardProps) {
  const progressPercent = savingsGoal > 0 ? Math.round((currentSavings / savingsGoal) * 100) : 0;
  const IconComponent = primaryGoal ? (GOAL_ICON_MAP[primaryGoal.icon] || MdSavings) : null;

  return (
    <div
      className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] animate-[fadeIn_0.6s_ease-out_0.3s_backwards]"
      style={{ padding: '16px' }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <FaChartLine className="text-lg sm:text-xl text-[#06B6D4]" /> 저축
        </h2>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs sm:text-sm text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
          >
            전체보기 →
          </button>
        )}
      </div>

      {/* 대표 저축 목표 */}
      {primaryGoal && IconComponent ? (
        <div
          className="bg-bg-secondary rounded-[12px]"
          style={{ padding: '16px', marginBottom: '12px' }}
        >
          {/* 상단: 아이콘 + 이름/대표/날짜 */}
          <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center text-lg relative"
              style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', color: '#FBBF24' }}
            >
              <IconComponent />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                <FaStar className="text-[8px] text-white" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{primaryGoal.name}</p>
                <span className="text-xs text-amber-400 font-medium">대표</span>
              </div>
              <p className="text-xs text-text-muted">{primaryGoal.targetDate}</p>
            </div>
          </div>

          {/* 중앙: 현재 금액 / 목표 금액 (퍼센트) */}
          <div className="text-right" style={{ marginBottom: '12px' }}>
            {/* 모바일: 두 줄 */}
            <div className="sm:hidden">
              <p className="text-lg font-bold text-text-primary">
                <span style={{ marginRight: '2px' }}>₩</span>{formatNumber(primaryGoal.currentAmount)}
              </p>
              <p className="text-xs font-normal text-text-muted">
                / <span style={{ marginRight: '1px' }}>₩</span>{formatNumber(primaryGoal.targetAmount)}
                <span className="font-semibold text-accent-mint">
                  {' '}({primaryGoal.progressPercent}%)
                </span>
              </p>
            </div>
            {/* 데스크톱: 한 줄 */}
            <p className="hidden sm:block text-xl font-bold text-text-primary">
              <span style={{ marginRight: '2px' }}>₩</span>{formatNumber(primaryGoal.currentAmount)}
              <span className="text-sm font-normal text-text-muted ml-2">
                / <span style={{ marginRight: '1px' }}>₩</span>{formatNumber(primaryGoal.targetAmount)}
              </span>
              <span className="text-sm font-semibold text-accent-mint">
                {' '}({primaryGoal.progressPercent}%)
              </span>
            </p>
          </div>

          {/* 진행률 바 */}
          <div className="w-full h-2 bg-bg-card rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-mint to-accent-blue transition-all duration-300"
              style={{ width: `${Math.min(primaryGoal.progressPercent, 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <div
          className="bg-bg-secondary rounded-[12px] text-center text-text-muted text-sm"
          style={{ padding: '20px', marginBottom: '12px' }}
        >
          대표 저축 목표를 설정해주세요
        </div>
      )}

    </div>
  );
}
