'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores';
import AnalyticsChart from '@/components/analytics/AnalyticsChart';
import type { AnalyticsResult } from '@/lib/services/analytics.service';

export default function AnalyticsTab() {
  const userId = useAuthStore((state) => state.userId);
  const [months, setMonths] = useState(6);
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/analytics?userId=${userId}&months=${months}`)
      .then((res) => res.json())
      .then((res) => {
        if (!cancelled) {
          if (res.success) {
            setData(res.data);
          } else {
            setError(res.error ?? '데이터를 불러오지 못했습니다');
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError('데이터를 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId, months]);

  return (
    <div className="animate-[fadeIn_0.5s_ease-out]">
      {/* 기간 선택 */}
      <div className="flex gap-1.5 mb-6">
        {[3, 6, 12].map((n) => (
          <button
            key={n}
            onClick={() => setMonths(n)}
            className={`text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              months === n
                ? 'bg-accent-blue/20 text-accent-blue font-medium'
                : 'bg-bg-secondary text-text-muted hover:bg-bg-card-hover'
            }`}
          >
            {n}개월
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      {isLoading ? (
        <div className="text-center text-text-muted py-16">로딩 중...</div>
      ) : error ? (
        <div className="text-center text-red-400 py-16">{error}</div>
      ) : data ? (
        <AnalyticsChart data={data} months={months} />
      ) : null}
    </div>
  );
}
