'use client';

import { memo, useState, useEffect } from 'react';
import { formatNumber } from '@/utils/formatters';
import { MdFolder, MdFlight, MdHome, MdCelebration, MdWork, MdSchool, MdShoppingBag, MdFavorite } from 'react-icons/md';

interface GroupSummary {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  totalExpense: number;
  transactionCount: number;
}

interface GroupsCardProps {
  userId: string;
  onViewAll?: () => void;
}

const GROUP_ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  folder: MdFolder,
  travel: MdFlight,
  home: MdHome,
  celebration: MdCelebration,
  work: MdWork,
  school: MdSchool,
  shopping: MdShoppingBag,
  health: MdFavorite,
};

function GroupsCard({ userId, onViewAll }: GroupsCardProps) {
  const [groups, setGroups] = useState<GroupSummary[]>([]);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/groups?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => setGroups((data.data || []).slice(0, 3)))
      .catch(() => {});
  }, [userId]);

  return (
    <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] animate-[fadeIn_0.6s_ease-out_0.3s_backwards] p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <MdFolder className="text-lg sm:text-xl text-[#818CF8]" /> 그룹
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

      {groups.length > 0 ? (
        <div className="flex flex-col gap-2">
          {groups.map((group) => {
            const IconComponent = GROUP_ICON_MAP[group.icon || 'folder'] || MdFolder;
            return (
              <div
                key={group.id}
                className="bg-bg-secondary rounded-[12px] flex items-center gap-3 p-3"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: group.color ? `${group.color}20` : 'rgba(99, 102, 241, 0.15)' }}
                >
                  <IconComponent className="text-sm" style={{ color: group.color || '#6366F1' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{group.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-[#F87171] font-medium">₩{formatNumber(group.totalExpense)}</p>
                  <p className="text-[10px] text-text-muted">{group.transactionCount}건</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-bg-secondary rounded-[12px] text-center text-text-muted text-sm p-5">
          여행, 이사 등 특별 지출을 그룹으로 관리해보세요
        </div>
      )}
    </div>
  );
}

export default memo(GroupsCard);
