'use client';

import type { Plan } from '@prisma/client';
import { MdWorkspacePremium } from 'react-icons/md';

const PLAN_META: Record<'FREE' | 'PRO', { label: string; className: string }> = {
  FREE: { label: 'FREE', className: 'bg-bg-secondary text-text-muted' },
  PRO: { label: 'PRO', className: 'bg-accent-blue/15 text-accent-blue' },
};

interface PlanBadgeProps {
  plan: Plan;
  className?: string;
}

export default function PlanBadge({ plan, className = '' }: PlanBadgeProps) {
  // ULTIMATE: 검은 배경 + 금색 메탈릭 그라디언트로 고급스럽게 강조.
  if (plan === 'ULTIMATE') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-lg text-xs font-semibold tracking-wide px-2 py-0.5 border border-[#fbbf24]/50 bg-gradient-to-b from-[#26262e] to-[#050507] shadow-[0_0_10px_rgba(251,191,36,0.3)] ${className}`}
      >
        <MdWorkspacePremium className="text-sm text-[#fbbf24]" />
        <span className="bg-gradient-to-r from-[#fde68a] via-[#fbbf24] to-[#d4af37] bg-clip-text text-transparent">
          ULTIMATE
        </span>
      </span>
    );
  }

  const meta = PLAN_META[plan];
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-lg text-xs px-2 py-0.5 ${meta.className} ${className}`}
    >
      {meta.label}
    </span>
  );
}
