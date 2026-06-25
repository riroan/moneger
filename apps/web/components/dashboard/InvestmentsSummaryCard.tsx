'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@moneger/shared';
import {
  MdAccountBalance,
  MdAdd,
  MdArrowForward,
  MdErrorOutline,
  MdShowChart,
  MdTrendingDown,
  MdTrendingUp,
} from 'react-icons/md';

interface Props {
  userId: string;
}

interface Overview {
  totalEquityKrw: string;
  dayChangeKrw: string | null;
  dayChangeRate: string | null;
  monthlyReport?: Array<{
    month: string;
    changeKrw: string | null;
    changeRate: string | null;
  }>;
  analysis?: {
    snapshotsCount: number;
    positionCount: number;
  };
  connections: Array<{
    id: string;
    broker: string;
    status: string;
    accounts?: Array<{ asOf: string | null }>;
  }>;
}

const CARD =
  'group bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] animate-[fadeIn_0.6s_ease-out_0.3s_backwards] p-4 text-left transition-colors hover:bg-bg-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/70 cursor-pointer';

function signedCurrency(value: number): string {
  if (value === 0) return formatCurrency(0);
  return `${value > 0 ? '+' : '-'}${formatCurrency(Math.abs(value))}`;
}

function changeRateText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return `${n > 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;
}

function latestAsOf(connections: Overview['connections']): string | null {
  let latest = 0;
  for (const connection of connections) {
    for (const account of connection.accounts ?? []) {
      if (!account.asOf) continue;
      latest = Math.max(latest, new Date(account.asOf).getTime());
    }
  }
  return latest ? new Date(latest).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : null;
}

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
        className={CARD}
        onClick={() => router.push('/investments')}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-blue/15 text-accent-blue">
              <MdAdd className="text-xl" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text-primary">증권 자산 연결</div>
              <div className="mt-1 text-xs leading-5 text-text-muted">
                토스증권과 한국투자증권 계좌를 연결하세요
              </div>
            </div>
          </div>
          <MdArrowForward className="mt-1 shrink-0 text-lg text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-text-secondary" />
        </div>
      </button>
    );
  }

  const dayChange = data?.dayChangeKrw == null ? null : Number(data.dayChangeKrw);
  const dayChangeRate = changeRateText(data?.dayChangeRate);
  const latestReport = data?.monthlyReport?.at(-1);
  const monthChange = latestReport?.changeKrw == null ? null : Number(latestReport.changeKrw);
  const monthChangeRate = changeRateText(latestReport?.changeRate);
  const changeClass = (v: number | null) =>
    v == null ? 'text-text-muted' : v > 0 ? 'text-accent-coral' : v < 0 ? 'text-accent-blue' : 'text-text-muted';
  const latestSync = latestAsOf(data?.connections ?? []);

  return (
    <button className={CARD} onClick={() => router.push('/investments')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-blue/15 text-accent-blue">
            <MdAccountBalance className="text-xl" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">증권 자산</span>
              {hasError && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-coral/15 px-2 py-0.5 text-[11px] font-medium text-accent-coral">
                  <MdErrorOutline className="text-sm" />
                  확인 필요
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-text-muted">
              {data?.connections.length ?? 0}개 증권사{latestSync ? ` · ${latestSync} 기준` : ''}
            </div>
          </div>
        </div>
        <span className="shrink-0 text-xs text-text-muted transition-colors group-hover:text-text-secondary">
          전체보기 →
        </span>
      </div>

      <div className="mt-4">
        <div className="tabular-nums text-2xl font-bold leading-tight text-text-primary">
          {formatCurrency(Number(data?.totalEquityKrw ?? 0))}
        </div>
        <div className={`mt-1 flex items-center gap-1 text-xs ${changeClass(dayChange)}`}>
          {dayChange == null ? (
            <>
              <MdShowChart className="text-sm" />
              전일 스냅샷 대기 중
            </>
          ) : (
            <>
              {dayChange >= 0 ? <MdTrendingUp className="text-sm" /> : <MdTrendingDown className="text-sm" />}
              {signedCurrency(dayChange)}
              {dayChangeRate ? ` · ${dayChangeRate}` : ''}
            </>
          )}
        </div>
        {monthChange != null && (
          <div className={`mt-0.5 flex items-center gap-1 text-[11px] ${changeClass(monthChange)}`}>
            {signedCurrency(monthChange)}
            {monthChangeRate ? ` · ${monthChangeRate}` : ''}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-[var(--border)] pt-3 text-xs text-text-muted">
        <span>
          <span className="tabular-nums font-semibold text-text-secondary">{data?.analysis?.positionCount ?? 0}</span>종목
        </span>
        <span className="h-3 w-px bg-[var(--border)]" />
        <span>
          <span className="tabular-nums font-semibold text-text-secondary">{data?.analysis?.snapshotsCount ?? 0}</span>스냅샷
        </span>
      </div>
    </button>
  );
}
