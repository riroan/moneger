'use client';

import { useEffect, useState } from 'react';
import { MdAccountBalanceWallet } from 'react-icons/md';
import AssetTrendChart, { type AssetTrendSnapshot } from '@/components/assets/AssetTrendChart';

interface AssetReportResponse {
  snapshots: AssetTrendSnapshot[];
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function AssetTrendCard({ userId, months }: { userId: string; months: number }) {
  const [snapshots, setSnapshots] = useState<AssetTrendSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading/error reset for fetch
    setLoading(true);
    setError(null);

    fetch(`/api/assets/monthly-report?month=${currentMonthKey()}&range=${months}`)
      .then((res) => res.json())
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setSnapshots((res.data as AssetReportResponse).snapshots);
        } else {
          setError(res.error ?? '자산 추이를 불러오지 못했습니다');
        }
      })
      .catch(() => {
        if (!cancelled) setError('자산 추이를 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [months, userId]);

  return (
    <section className="min-w-0 rounded-[16px] border border-[var(--border)] bg-bg-card p-4 sm:rounded-[20px]">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold sm:text-lg">
        <MdAccountBalanceWallet className="text-lg text-accent-blue sm:text-xl" />
        총자산 추이 · 구성별 누적
      </h2>

      {loading && snapshots.length === 0 ? (
        <div className="h-[280px] animate-pulse rounded-xl bg-bg-secondary sm:h-[340px]" />
      ) : error ? (
        <div className="flex h-[180px] items-center justify-center text-sm text-text-muted">{error}</div>
      ) : snapshots.length > 0 ? (
        <AssetTrendChart snapshots={snapshots} />
      ) : (
        <div className="flex h-[180px] items-center justify-center text-sm text-text-muted">자산 데이터가 없습니다</div>
      )}
    </section>
  );
}
