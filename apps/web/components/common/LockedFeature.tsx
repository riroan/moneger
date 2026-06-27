'use client';

import { MdLock } from 'react-icons/md';
import { FEATURE_LABELS, FEATURE_MIN_PLAN, type Feature } from '@/lib/entitlements';
import PlanBadge from './PlanBadge';

interface LockedFeatureProps {
  feature: Feature;
}

export default function LockedFeature({ feature }: LockedFeatureProps) {
  const label = FEATURE_LABELS[feature];
  const minPlan = FEATURE_MIN_PLAN[feature];

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 sm:py-24 px-4 animate-[fadeInUp_0.5s_ease-out]">
      <div className="w-16 h-16 rounded-[18px] bg-bg-card border border-[var(--border)] flex items-center justify-center mb-5">
        <MdLock className="text-3xl text-text-muted" />
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-2">
        {label} 기능은 잠겨 있어요
      </h2>
      <div className="flex items-center gap-1.5 text-sm text-text-secondary mb-1">
        <PlanBadge plan={minPlan} />
        <span>이상 요금제에서 사용할 수 있습니다.</span>
      </div>
      <p className="text-xs text-text-muted max-w-sm">
        상위 요금제로 업그레이드하면 바로 이용할 수 있어요.
      </p>
    </div>
  );
}
