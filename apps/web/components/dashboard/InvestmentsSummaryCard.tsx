'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@moneger/shared';

interface Props {
  userId: string;
}

interface Overview {
  totalEquityKrw: string;
  connections: Array<{ id: string; status: string }>;
}

const CARD =
  'bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] animate-[fadeIn_0.6s_ease-out_0.3s_backwards] p-4';

export default function InvestmentsSummaryCard({ userId }: Props) {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch(`/api/brokerage/overview?userId=${userId}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j?.success) setData(j.data as Overview);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 로딩 전에는 렌더 안 함(레이아웃 흔들림 방지)
  if (!loaded) return null;

  const hasConnections = (data?.connections.length ?? 0) > 0;
  const hasError = data?.connections.some((c) => c.status === 'ERROR') ?? false;

  if (!hasConnections) {
    return (
      <button
        className={`${CARD} text-left`}
        onClick={() => router.push('/investments')}
      >
        <div className="text-sm font-semibold text-text-primary">증권 투자</div>
        <div className="text-text-muted text-xs mt-1">증권사 계좌를 연결해 잔고를 추적하세요 →</div>
      </button>
    );
  }

  return (
    <button className={`${CARD} text-left`} onClick={() => router.push('/investments')}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-semibold text-text-primary">증권 자산</div>
        <span className="text-xs text-text-muted">자세히 →</span>
      </div>
      <div className="font-mono tabular-nums text-text-primary text-xl">
        {formatCurrency(Number(data?.totalEquityKrw ?? 0))}
      </div>
      {hasError && (
        <div className="text-accent-coral text-[11px] mt-1">일부 연결 동기화 실패 — 확인 필요</div>
      )}
    </button>
  );
}
