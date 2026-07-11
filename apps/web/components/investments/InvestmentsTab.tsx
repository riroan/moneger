'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '@moneger/shared';
import { pnlClass, pnlMark, signedCurrency, signedPercent } from '@/lib/utils/pnl';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  FaBuilding,
  FaCheckCircle,
  FaClock,
  FaLock,
  FaPlus,
  FaSyncAlt,
  FaTrash,
  FaWallet,
} from 'react-icons/fa';
import { MdAccountBalance } from 'react-icons/md';

interface InvestmentsTabProps {
  userId: string;
}

interface Position {
  symbol: string;
  name: string;
  market: string | null;
  currency: string;
  quantity: string;
  marketValue: string;
  marketValueKrw: string;
  unrealizedPnl: string | null;
  lastPrice: string | null;
  prevClose: string | null;
  fxRateToKrw: string | null;
}
interface Account {
  id: string;
  displayName: string;
  accountType: string;
  asOf: string | null;
  cashKrw: string | null;
  cashBalances: Array<{
    amount: string;
    currency: string;
    amountKrw?: string;
    fxRateToKrw?: string;
  }>;
  totalEquityKrw: string | null;
  positionsValueKrw: string | null;
  dayChangeKrw: string | null;
  dayChangeRate: string | null;
  positions: Position[];
}
interface Connection {
  id: string;
  broker: string;
  label: string | null;
  status: string;
  failureReason: string | null;
  accounts: Account[];
}
interface Overview {
  totalEquityKrw: string;
  dayChangeKrw: string | null;
  dayChangeRate: string | null;
  monthlyReport: Array<{
    month: string;
    totalEquityKrw: string;
    cashKrw: string;
    positionsValueKrw: string;
    changeKrw: string | null;
    changeRate: string | null;
  }>;
  analysis: {
    snapshotsCount: number;
    positionCount: number;
    brokerBreakdown: Array<{ broker: string; totalEquityKrw: string }>;
    currencyBreakdown: Array<{ currency: string; marketValueKrw: string }>;
  };
  connections: Connection[];
}

type Broker = 'KIS' | 'TOSS';

const CARD = 'bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4';
const ACTION_BTN =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-bg-secondary px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/70 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';
const PRIMARY_BTN =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-blue/20 px-3 py-2 text-xs font-semibold text-accent-blue transition-colors hover:bg-accent-blue/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/70 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';
const FIELD =
  'w-full rounded-lg border border-[var(--border)] bg-bg-secondary px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-accent-blue';
const LABEL = 'block text-xs font-medium text-text-secondary mb-1.5';

function brokerName(broker: string): string {
  if (broker === 'KIS') return '한국투자증권';
  if (broker === 'TOSS') return '토스증권';
  return broker;
}
function percent(v: string | null): string {
  if (v == null) return '-';
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return `${(n * 100).toFixed(1)}%`;
}
/** 전일 종가 대비 현재가 증감(변화율 + 1주 증감액). 데이터 없으면 null. */
function priceDayChange(
  lastPrice: string | null,
  prevClose: string | null,
  currency: string,
  displayCurrency: 'KRW' | 'USD' = 'KRW',
  fxRateToKrw: string | null = null,
): { rate: number; delta: string } | null {
  if (lastPrice == null || prevClose == null) return null;
  const cur = Number(lastPrice);
  const prev = Number(prevClose);
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || cur <= 0 || prev <= 0) return null;
  const diff = cur - prev;
  const rate = diff / prev;
  const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
  const fx = Number(fxRateToKrw ?? 'NaN');
  // USD 종목을 원화로 보여줄 때: diff * fxRate
  if (currency === 'USD' && displayCurrency === 'KRW' && Number.isFinite(fx) && fx > 0) {
    const krwDiff = Math.abs(diff) * fx;
    return { rate, delta: `${sign}${formatCurrency(Math.round(krwDiff))}` };
  }
  // KRW 종목을 달러로 보여줄 때: diff / fxRate
  if (currency === 'KRW' && displayCurrency === 'USD' && Number.isFinite(fx) && fx > 0) {
    return { rate, delta: `${sign}${(Math.abs(diff) / fx).toFixed(2)}` };
  }
  // 원통화 그대로
  const abs = Math.abs(diff);
  const amount = currency === 'KRW' ? formatCurrency(Math.round(abs)) : abs.toFixed(2);
  return { rate, delta: `${sign}${amount}` };
}
/** USD 포맷 */
function formatUsd(v: number): string {
  return `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
/** displayCurrency 기준 평가액 표시 */
function displayMarketValue(p: Position, mode: 'KRW' | 'USD'): string {
  if (mode === 'KRW') return formatCurrency(Number(p.marketValueKrw));
  if (p.currency === 'USD') return formatUsd(Number(p.marketValue));
  const fx = Number(p.fxRateToKrw ?? 'NaN');
  return Number.isFinite(fx) && fx > 0 ? formatUsd(Number(p.marketValueKrw) / fx) : formatCurrency(Number(p.marketValueKrw));
}
/** displayCurrency 기준 PnL 금액 (unrealizedPnl은 항상 KRW로 저장됨) */
function displayPnl(p: Position, mode: 'KRW' | 'USD'): number {
  const raw = Number(p.unrealizedPnl ?? 'NaN'); // always KRW
  if (!Number.isFinite(raw)) return 0;
  if (mode === 'KRW') return raw;
  const fx = Number(p.fxRateToKrw ?? 'NaN');
  return Number.isFinite(fx) && fx > 0 ? raw / fx : raw;
}
/** displayCurrency 기준 현재가 표시 */
function displayLastPrice(p: Position, mode: 'KRW' | 'USD'): string | null {
  if (p.lastPrice == null) return null;
  if (mode === 'KRW') return p.currency === 'KRW' ? formatCurrency(Number(p.lastPrice)) : formatCurrency(Number(p.lastPrice) * Number(p.fxRateToKrw ?? 0));
  if (p.currency === 'USD') return formatUsd(Number(p.lastPrice));
  const fx = Number(p.fxRateToKrw ?? 'NaN');
  return Number.isFinite(fx) && fx > 0 ? formatUsd(Number(p.lastPrice) / fx) : null;
}
/** displayCurrency 기준 PnL 포맷 */
function formatPnlValue(v: number, mode: 'KRW' | 'USD'): string {
  const abs = Math.abs(v);
  const s = mode === 'KRW' ? formatCurrency(Math.round(abs)) : formatUsd(abs);
  return v > 0 ? `+${s}` : v < 0 ? `-${s}` : s;
}

function pnlPercent(pnl: number, marketValueKrw: string): string | null {
  const current = Number(marketValueKrw);
  if (!Number.isFinite(current) || !Number.isFinite(pnl)) return null;
  const costBasis = current - pnl;
  if (costBasis <= 0) return null;
  const rate = (pnl / costBasis) * 100;
  if (!Number.isFinite(rate)) return null;
  return `${rate > 0 ? '+' : ''}${rate.toFixed(1)}%`;
}
function money(value: string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function formatDateTime(value: string | null): string {
  if (!value) return '동기화 전';
  return new Date(value).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
function formatCashBalance(cash: Account['cashBalances'][number]): string {
  if (cash.currency === 'KRW') {
    return `KRW ${formatCurrency(money(cash.amount))}`;
  }
  const n = Number(cash.amount);
  const amount = Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : cash.amount;
  const krw = cash.amountKrw ? ` · ${formatCurrency(money(cash.amountKrw))}` : '';
  return `${cash.currency} ${amount}${krw}`;
}
function latestAsOf(connections: Connection[]): string | null {
  let latest = 0;
  for (const conn of connections) {
    for (const account of conn.accounts) {
      if (!account.asOf) continue;
      latest = Math.max(latest, new Date(account.asOf).getTime());
    }
  }
  return latest ? new Date(latest).toISOString() : null;
}

export default function InvestmentsTab({ userId }: InvestmentsTabProps) {
  const [data, setData] = useState<Overview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<'KRW' | 'USD'>('KRW');

  const fetchOverview = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/brokerage/overview?userId=${userId}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || '불러오기 실패');
      setData(json.data as Overview);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const handleSync = useCallback(
    async (connectionId: string) => {
      setSyncingId(connectionId);
      setError(null);
      try {
        const res = await fetch(`/api/brokerage/connections/${connectionId}/sync`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || '동기화 실패');
        }
        await fetchOverview();
      } catch (e) {
        setError(e instanceof Error ? e.message : '동기화 실패');
      } finally {
        setSyncingId(null);
      }
    },
    [userId, fetchOverview]
  );

  const handleSyncAll = useCallback(async () => {
    setSyncingAll(true);
    setError(null);
    try {
      const res = await fetch('/api/brokerage/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || '전체 동기화 실패');
      }
      await fetchOverview();
    } catch (e) {
      setError(e instanceof Error ? e.message : '전체 동기화 실패');
    } finally {
      setSyncingAll(false);
    }
  }, [userId, fetchOverview]);

  const handleDelete = useCallback(
    async (connectionId: string) => {
      if (!confirm('이 증권사 연결을 삭제할까요? 자격증명은 즉시 삭제되고 과거 스냅샷은 보존됩니다.')) {
        return;
      }
      await fetch(`/api/brokerage/connections/${connectionId}?userId=${userId}`, { method: 'DELETE' });
      await fetchOverview();
    },
    [userId, fetchOverview]
  );

  const summary = useMemo(() => {
    const connections = data?.connections ?? [];
    const accountCount = connections.reduce((sum, c) => sum + c.accounts.length, 0);
    const errorCount = connections.filter((c) => c.status === 'ERROR').length;
    return {
      hasConnections: connections.length > 0,
      connectionCount: connections.length,
      accountCount,
      errorCount,
      latest: latestAsOf(connections),
      positions: data?.analysis.positionCount ?? 0,
    };
  }, [data]);
  const connectedBrokers = useMemo(
    () => new Set<Broker>((data?.connections ?? []).map((c) => c.broker).filter((b): b is Broker => b === 'KIS' || b === 'TOSS')),
    [data]
  );
  const canAddBroker = connectedBrokers.size < 2;
  const selectedConnection = useMemo(
    () => {
      const connections = data?.connections ?? [];
      return connections.find((conn) => conn.id === selectedConnectionId) ?? connections[0] ?? null;
    },
    [data?.connections, selectedConnectionId]
  );

  useEffect(() => {
    const connections = data?.connections ?? [];
    if (connections.length === 0) {
      if (selectedConnectionId !== null) setSelectedConnectionId(null);
      return;
    }
    if (!selectedConnectionId || !connections.some((conn) => conn.id === selectedConnectionId)) {
      setSelectedConnectionId(connections[0].id);
    }
  }, [data?.connections, selectedConnectionId]);

  if (isLoading) {
    return <div className="text-text-muted text-sm py-8 text-center">불러오는 중...</div>;
  }

  return (
    <div className="flex flex-col gap-4 animate-[fadeIn_0.5s_ease-out]">
      <PortfolioHeader
        data={data}
        summary={summary}
        isAddOpen={isAddOpen}
        canAddBroker={canAddBroker}
        syncingAll={syncingAll}
        onSyncAll={handleSyncAll}
        onToggleAdd={() => {
          if (isAddOpen || canAddBroker) setIsAddOpen((v) => !v);
        }}
      />

      {error && (
        <div className="rounded-[12px] border border-accent-coral/30 bg-accent-coral/10 px-4 py-3 text-sm text-accent-coral">
          {error}
        </div>
      )}

      {isAddOpen && (
        <AddConnectionForm
          userId={userId}
          connectedBrokers={connectedBrokers}
          onDone={async () => {
            setIsAddOpen(false);
            await fetchOverview();
          }}
        />
      )}

      {!summary.hasConnections && !isAddOpen && <EmptyState onAdd={() => setIsAddOpen(true)} />}

      {summary.hasConnections && data && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
            <div className="xl:order-2">
              <PortfolioDonut data={data} />
            </div>
            <div className="hidden xl:block xl:order-1">
              <BrokerSelector
                connections={data.connections}
                selectedConnectionId={selectedConnection?.id ?? null}
                onSelect={setSelectedConnectionId}
              />
            </div>
            <div className="xl:order-3">
              <BreakdownPanel data={data} />
            </div>
          </aside>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="xl:hidden">
              <BrokerSelector
                connections={data.connections}
                selectedConnectionId={selectedConnection?.id ?? null}
                onSelect={setSelectedConnectionId}
              />
            </div>
            {selectedConnection && (
              <ConnectionCard
                connection={selectedConnection}
                syncingId={syncingId}
                onSync={handleSync}
                onDelete={handleDelete}
                displayCurrency={displayCurrency}
                onToggleCurrency={() => setDisplayCurrency((c) => (c === 'KRW' ? 'USD' : 'KRW'))}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PortfolioHeader({
  data,
  summary,
  isAddOpen,
  canAddBroker,
  syncingAll,
  onSyncAll,
  onToggleAdd,
}: {
  data: Overview | null;
  summary: {
    hasConnections: boolean;
    connectionCount: number;
    accountCount: number;
    errorCount: number;
    latest: string | null;
    positions: number;
  };
  isAddOpen: boolean;
  canAddBroker: boolean;
  syncingAll: boolean;
  onSyncAll: () => void;
  onToggleAdd: () => void;
}) {
  const latest = data?.monthlyReport.at(-1);
  const change = latest?.changeKrw == null ? null : Number(latest.changeKrw);

  const { totalPnl, pnlRate } = (() => {
    if (!data) return { totalPnl: null, pnlRate: null };
    let pnl = 0; let cost = 0; let hasPnl = false;
    for (const conn of data.connections)
      for (const acct of conn.accounts)
        for (const pos of acct.positions) {
          const p = Number(pos.unrealizedPnl ?? 'NaN');
          const mv = Number(pos.marketValueKrw);
          if (Number.isFinite(p) && Number.isFinite(mv)) {
            pnl += p; cost += mv - p; hasPnl = true;
          }
        }
    if (!hasPnl) return { totalPnl: null, pnlRate: null };
    return { totalPnl: pnl, pnlRate: cost > 0 ? pnl / cost : null };
  })();

  return (
    <section className={`${CARD} overflow-hidden`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-blue/15 text-accent-blue">
              <MdAccountBalance className="text-xl" />
            </span>
            <h1 className="text-xl font-bold text-text-primary">증권 자산</h1>
            <span className="rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-text-secondary">
              {summary.connectionCount}개 연결
            </span>
            {summary.errorCount > 0 && (
              <span className="rounded-full bg-accent-coral/15 px-2.5 py-1 text-[11px] font-medium text-accent-coral">
                오류 {summary.errorCount}
              </span>
            )}
          </div>
          <div className="mt-1 break-words tabular-nums text-3xl font-bold text-text-primary sm:text-4xl">
            {formatCurrency(Number(data?.totalEquityKrw ?? 0))}
          </div>
          {totalPnl != null ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`text-xl font-semibold tabular-nums ${pnlClass(totalPnl)}`}>
                {pnlMark(totalPnl)} {signedCurrency(totalPnl)}
              </span>
              {pnlRate != null && (
                <span className={`text-sm opacity-70 ${pnlClass(totalPnl)}`}>
                  ({signedPercent(pnlRate)})
                </span>
              )}
            </div>
          ) : null}
          {change != null && (
            <div className="mt-1 text-xs tabular-nums text-text-muted">
              <span className={pnlClass(change)}>
                {pnlMark(change)} {signedCurrency(change)}
              </span>{' '}
              ({percent(latest?.changeRate ?? null)})
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <FaClock className="text-[11px]" />
              {formatDateTime(summary.latest)}
            </span>
            <span>{summary.positions}개 종목</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 lg:min-w-[360px]">
          <HeaderStat label="계좌" value={`${summary.accountCount}`} />
          <HeaderStat label="스냅샷" value={`${data?.analysis.snapshotsCount ?? 0}`} />
          <HeaderStat label="보유" value={`${summary.positions}`} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
        {summary.hasConnections && (
          <button type="button" className={ACTION_BTN} disabled={syncingAll} onClick={onSyncAll}>
            <FaSyncAlt className={syncingAll ? 'animate-spin' : ''} />
            {syncingAll ? '동기화 중' : '전체 동기화'}
          </button>
        )}
        <button
          type="button"
          className={PRIMARY_BTN}
          disabled={!canAddBroker && !isAddOpen}
          onClick={onToggleAdd}
        >
          <FaPlus />
          {isAddOpen ? '연결 닫기' : canAddBroker ? '증권사 연결' : '연결 완료'}
        </button>
      </div>
    </section>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-l border-[var(--border)] pl-3">
      <div className="text-[11px] text-text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-text-primary">{value}</div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <section className={`${CARD} py-8`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">연결된 증권사가 없습니다</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <BrokerChip broker="KIS" />
            <BrokerChip broker="TOSS" />
          </div>
        </div>
        <button type="button" className={PRIMARY_BTN} onClick={onAdd}>
          <FaPlus />
          증권사 연결
        </button>
      </div>
    </section>
  );
}

function BrokerChip({ broker }: { broker: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-bg-secondary px-3 py-1.5 text-xs text-text-secondary">
      <FaBuilding className={broker === 'TOSS' ? 'text-accent-mint' : 'text-accent-blue'} />
      {brokerName(broker)}
    </span>
  );
}

function connectionTotal(connection: Connection): number {
  return connection.accounts.reduce((sum, account) => sum + money(account.totalEquityKrw), 0);
}

function connectionPositions(connection: Connection): number {
  return connection.accounts.reduce((sum, account) => sum + account.positions.length, 0);
}

function connectionLatestAsOf(connection: Connection): string {
  let latest = 0;
  for (const account of connection.accounts) {
    if (!account.asOf) continue;
    latest = Math.max(latest, new Date(account.asOf).getTime());
  }
  return latest ? formatDateTime(new Date(latest).toISOString()) : '동기화 전';
}

function BrokerSelector({
  connections,
  selectedConnectionId,
  onSelect,
}: {
  connections: Connection[];
  selectedConnectionId: string | null;
  onSelect: (connectionId: string) => void;
}) {
  return (
    <section className={CARD}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text-primary">증권사</h2>
          <div className="mt-1 text-[11px] text-text-muted">목록에서 선택해 계좌 상세를 확인하세요</div>
        </div>
        <span className="rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-text-secondary">
          {connections.length}개 연결
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {connections.map((connection) => {
          const selected = connection.id === selectedConnectionId;
          const total = connectionTotal(connection);
          const positions = connectionPositions(connection);
          let connPnl: number | null = null;
          let connPnlRate: number | null = null;
          {
            let pnl = 0; let cost = 0; let has = false;
            for (const a of connection.accounts)
              for (const p of a.positions) {
                const v = Number(p.unrealizedPnl ?? 'NaN');
                const mv = Number(p.marketValueKrw);
                if (Number.isFinite(v) && Number.isFinite(mv)) { pnl += v; cost += mv - v; has = true; }
              }
            if (has) { connPnl = pnl; connPnlRate = cost > 0 ? pnl / cost : null; }
          }
          return (
            <button
              key={connection.id}
              type="button"
              aria-pressed={selected}
              className={`min-h-[96px] rounded-[12px] border px-3 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/70 cursor-pointer ${
                selected
                  ? 'border-accent-blue/60 bg-accent-blue/10'
                  : 'border-[var(--border)] bg-bg-secondary/40 hover:bg-bg-secondary'
              }`}
              onClick={() => onSelect(connection.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      selected ? 'bg-accent-blue/20 text-accent-blue' : 'bg-bg-card text-text-muted'
                    }`}>
                      <FaBuilding />
                    </span>
                    <span className="truncate text-sm font-semibold text-text-primary">
                      {brokerName(connection.broker)}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-text-muted">
                    {connection.accounts.length}개 계좌 · {positions}개 종목
                  </div>
                </div>
                <ConnectionStatus status={connection.status} />
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <span className="tabular-nums text-base font-semibold text-text-primary">
                    {formatCurrency(total)}
                  </span>
                  {connPnl != null && (
                    <div className={`mt-0.5 text-[11px] tabular-nums ${pnlClass(connPnl)}`}>
                      {pnlMark(connPnl)} {signedCurrency(connPnl)}
                      {connPnlRate != null && ` (${signedPercent(connPnlRate)})`}
                    </div>
                  )}
                </div>
                <span className="min-w-0 text-right text-[11px] leading-4 text-text-muted">
                  {connectionLatestAsOf(connection)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ConnectionCard({
  connection,
  syncingId,
  onSync,
  onDelete,
  displayCurrency,
  onToggleCurrency,
}: {
  connection: Connection;
  syncingId: string | null;
  onSync: (connectionId: string) => void;
  onDelete: (connectionId: string) => void;
  displayCurrency: 'KRW' | 'USD';
  onToggleCurrency: () => void;
}) {
  const total = connectionTotal(connection);
  const positions = connectionPositions(connection);
  const isSyncing = syncingId === connection.id;

  return (
    <section className={CARD}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-bg-secondary text-accent-blue">
              <FaBuilding />
            </span>
            <h2 className="text-base font-semibold text-text-primary">{brokerName(connection.broker)}</h2>
            {connection.label && <span className="text-xs text-text-muted">{connection.label}</span>}
            <ConnectionStatus status={connection.status} />
          </div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <div className="text-xl font-semibold tabular-nums text-text-primary">
              {formatCurrency(total)}
            </div>
            <div className="text-xs text-text-muted">
              {connection.accounts.length}개 계좌 · {positions}개 종목
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleCurrency}
            className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-bg-secondary px-3 py-2 text-xs font-medium tabular-nums text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary focus:outline-none cursor-pointer"
          >
            <span className={displayCurrency === 'KRW' ? 'text-text-primary' : 'text-text-muted'}>₩</span>
            <span className="text-text-muted">/</span>
            <span className={displayCurrency === 'USD' ? 'text-text-primary' : 'text-text-muted'}>$</span>
          </button>
          <button
            type="button"
            className={ACTION_BTN}
            disabled={isSyncing}
            onClick={() => onSync(connection.id)}
          >
            <FaSyncAlt className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? '동기화 중' : '동기화'}
          </button>
          <button
            type="button"
            className="inline-flex min-h-9 items-center justify-center rounded-lg bg-bg-secondary px-3 py-2 text-xs text-text-muted transition-colors hover:bg-accent-coral/15 hover:text-accent-coral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-coral/70 cursor-pointer"
            onClick={() => onDelete(connection.id)}
            aria-label={`${brokerName(connection.broker)} 연결 삭제`}
            title="삭제"
          >
            <FaTrash />
          </button>
        </div>
      </header>

      {connection.status === 'ERROR' && (
        <div className="mt-3 rounded-[12px] border border-accent-coral/25 bg-accent-coral/10 px-3 py-2 text-xs text-accent-coral">
          마지막 동기화 실패{connection.failureReason ? ` (${connection.failureReason})` : ''}
        </div>
      )}

      {connection.accounts.length === 0 ? (
        <div className="mt-4 rounded-[12px] border border-dashed border-[var(--border)] px-4 py-5 text-sm text-text-muted">
          동기화 전
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {connection.accounts.map((acct) => (
            <AccountBlock key={acct.id} account={acct} displayCurrency={displayCurrency} />
          ))}
        </div>
      )}
    </section>
  );
}

function ConnectionStatus({ status }: { status: string }) {
  if (status === 'ERROR') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-coral/15 px-2.5 py-1 text-[11px] font-medium text-accent-coral">
        연결 오류
      </span>
    );
  }
  if (status === 'DISABLED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-text-muted">
        비활성
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-mint/15 px-2.5 py-1 text-[11px] font-medium text-accent-mint">
      <FaCheckCircle />
      활성
    </span>
  );
}

function AccountBlock({ account, displayCurrency }: { account: Account; displayCurrency: 'KRW' | 'USD' }) {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-bg-secondary/40 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-text-secondary">{account.displayName}</div>
          <div className="mt-1 text-[11px] text-text-muted">{formatDateTime(account.asOf)}</div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-right sm:min-w-[300px]">
          <div>
            <div className="text-[11px] text-text-muted">평가액</div>
            <div className="text-base font-semibold tabular-nums text-text-primary">
              {formatCurrency(money(account.totalEquityKrw))}
            </div>
            {account.dayChangeKrw != null && (
              <div className={`mt-0.5 text-[11px] tabular-nums ${pnlClass(Number(account.dayChangeKrw))}`}>
                {pnlMark(Number(account.dayChangeKrw))} {signedCurrency(Number(account.dayChangeKrw))} ({percent(account.dayChangeRate)})
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] text-text-muted">현금</div>
            <div className="text-base tabular-nums text-text-secondary">
              {formatCurrency(money(account.cashKrw))}
            </div>
            {account.cashBalances.length > 0 && (
              <div className="mt-1 flex flex-col items-end gap-0.5">
                {account.cashBalances.map((cash) => (
                  <div key={cash.currency} className="text-[11px] tabular-nums text-text-muted">
                    {formatCashBalance(cash)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {account.positions.length === 0 ? (
        <div className="mt-3 border-t border-[var(--border)] pt-3 text-xs text-text-muted">보유 종목 없음</div>
      ) : (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <div className="flex flex-col gap-2 md:hidden">
            {account.positions.map((p) => (
              <PositionCard key={`${p.symbol}:${p.market ?? ''}`} position={p} displayCurrency={displayCurrency} />
            ))}
          </div>

          <div className="hidden md:block">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[32%]" />
                <col className="w-[12%]" />
                <col className="w-[20%]" />
                <col className="w-[20%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead>
                <tr className="text-left text-xs text-text-muted">
                  <th className="font-normal py-2">종목</th>
                  <th className="font-normal py-2 text-right">수량</th>
                  <th className="font-normal py-2 text-right">현재가</th>
                  <th className="font-normal py-2 text-right">평가액</th>
                  <th className="font-normal py-2 text-right">평가손익</th>
                </tr>
              </thead>
              <tbody>
                {account.positions.map((p) => {
                  const pnl = displayPnl(p, displayCurrency);
                  const pnlRate = p.unrealizedPnl == null ? null : pnlPercent(Number(p.unrealizedPnl), p.marketValueKrw);
                  return (
                    <tr key={`${p.symbol}:${p.market ?? ''}`} className="border-t border-[var(--border)]">
                      <td className="py-2.5 pr-3">
                        <div className="truncate font-medium text-text-primary">{p.name}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
                          <span>{p.symbol}</span>
                          {p.market && <span>{p.market}</span>}
                          <span className="rounded-full bg-bg-card px-2 py-0.5">{p.currency}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-text-secondary">{p.quantity}</td>
                      <td className="py-2.5 text-right">
                        <PositionPrice position={p} displayCurrency={displayCurrency} />
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="tabular-nums text-text-primary">
                          {displayMarketValue(p, displayCurrency)}
                        </div>
                        {displayCurrency === 'KRW' && p.currency !== 'KRW' && (
                          <div className="mt-0.5 text-[11px] tabular-nums text-text-muted">
                            {p.marketValue} {p.currency}
                          </div>
                        )}
                      </td>
                      <td className={`py-2.5 text-right tabular-nums ${pnlClass(pnl)}`}>
                        <PositionPnl pnl={pnl} pnlRate={pnlRate} hasValue={p.unrealizedPnl != null} displayCurrency={displayCurrency} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PositionPnl({ pnl, pnlRate, hasValue, displayCurrency }: { pnl: number; pnlRate: string | null; hasValue: boolean; displayCurrency: 'KRW' | 'USD' }) {
  if (!hasValue) return '-';
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span>{pnlMark(pnl)} {formatPnlValue(pnl, displayCurrency)}</span>
      {pnlRate && <span className="text-[11px]">{pnlRate}</span>}
    </div>
  );
}

/** 현재가 + 전일 종가 대비 변화율. displayCurrency 기준으로 가격 표시. */
function PositionPrice({ position, displayCurrency }: { position: Position; displayCurrency: 'KRW' | 'USD' }) {
  const price = displayLastPrice(position, displayCurrency);
  if (price == null) return <span className="text-text-muted">-</span>;
  const dc = priceDayChange(position.lastPrice, position.prevClose, position.currency, displayCurrency, position.fxRateToKrw);
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="tabular-nums text-text-primary">{price}</span>
      {dc && (
        <span className={`text-[11px] tabular-nums ${pnlClass(dc.rate)}`}>
          {pnlMark(dc.rate)} {dc.delta} ({signedPercent(dc.rate)})
        </span>
      )}
    </div>
  );
}

function PositionCard({ position, displayCurrency }: { position: Position; displayCurrency: 'KRW' | 'USD' }) {
  const pnl = displayPnl(position, displayCurrency);
  const pnlRate = position.unrealizedPnl == null ? null : pnlPercent(Number(position.unrealizedPnl), position.marketValueKrw);

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-bg-card px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="truncate font-bold text-text-primary">{position.symbol}</div>
        <div className="shrink-0 text-right font-bold tabular-nums text-text-primary">
          {displayMarketValue(position, displayCurrency)}
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 text-xs">
        <div className="tabular-nums text-text-muted">{position.quantity}주</div>
        <div className={`shrink-0 text-right tabular-nums font-semibold ${pnlClass(pnl)}`}>
          {position.unrealizedPnl == null ? '-' : `${formatPnlValue(pnl, displayCurrency)}${pnlRate ? ` (${pnlRate})` : ''}`}
        </div>
      </div>
    </div>
  );
}

const POSITION_COLORS = ['#60a5fa', '#4ade80', '#a78bfa', '#ff6b6b', '#fbbf24', '#38bdf8', '#f472b6', '#34d399', '#fb923c', '#818cf8'];

function PortfolioDonut({ data }: { data: Overview }) {
  const allPositions = data.connections.flatMap((c) => c.accounts.flatMap((a) => a.positions));
  const sorted = [...allPositions].sort((a, b) => money(b.marketValueKrw) - money(a.marketValueKrw));
  const top = sorted.slice(0, 10);
  const rest = sorted.slice(10);

  const entries = [
    ...top.map((p, i) => ({
      name: p.name,
      value: money(p.marketValueKrw),
      color: POSITION_COLORS[i],
    })),
    ...(rest.length > 0
      ? [{ name: '기타', value: rest.reduce((s, p) => s + money(p.marketValueKrw), 0), color: '#475569' }]
      : []),
  ];
  const total = entries.reduce((s, e) => s + e.value, 0);

  if (entries.length === 0 || total <= 0) return null;

  return (
    <section className={CARD}>
      <h2 className="mb-3 text-base font-semibold text-text-primary">포트폴리오 비중</h2>
      <div className="relative">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={entries}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={72}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {entries.map((e, i) => (
                <Cell key={i} fill={e.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number | undefined) => [formatCurrency(v ?? 0), '']}
              contentStyle={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[10px] text-text-muted">총 평가액</div>
          <div className="text-sm font-semibold tabular-nums text-text-primary">
            {formatCurrency(total)}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {entries.map((e) => (
          <div key={e.name} className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />
            {e.name}
            <span className="text-text-muted tabular-nums">
              {((e.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}


function BreakdownPanel({ data }: { data: Overview }) {
  return (
    <section className={CARD}>
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-mint/15 text-accent-mint">
          <FaWallet />
        </span>
        <h2 className="text-base font-semibold text-text-primary">자산 구성</h2>
      </div>
      <Breakdown title="증권사" rows={data.analysis.brokerBreakdown.map((r) => ({
        label: brokerName(r.broker),
        value: r.totalEquityKrw,
      }))} />
      <div className="my-4 border-t border-[var(--border)]" />
      <Breakdown title="통화" rows={data.analysis.currencyBreakdown.map((r) => ({
        label: r.currency,
        value: r.marketValueKrw,
      }))} />
    </section>
  );
}

function Breakdown({ title, rows }: { title: string; rows: Array<{ label: string; value: string }> }) {
  const values = rows.map((r) => ({ ...r, numericValue: money(r.value) }));
  const total = values.reduce((sum, row) => sum + row.numericValue, 0);
  const colorClasses = ['bg-accent-blue', 'bg-accent-mint', 'bg-accent-purple', 'bg-accent-coral', 'bg-accent-yellow'];

  return (
    <div>
      <h3 className="mb-2 text-xs font-medium text-text-muted">{title}</h3>
      {values.length === 0 || total <= 0 ? (
        <div className="text-xs text-text-muted">데이터 없음</div>
      ) : (
        <div>
          <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-bg-secondary" aria-hidden="true">
            {values.map((row, idx) => {
              const ratio = (row.numericValue / total) * 100;
              return (
                <div
                  key={row.label}
                  className={`h-full ${colorClasses[idx % colorClasses.length]}`}
                  style={{ width: `${ratio}%` }}
                  title={`${row.label} ${ratio.toFixed(1)}%`}
                />
              );
            })}
          </div>
          <div className="flex flex-col gap-2.5">
            {values.map((row, idx) => {
              const ratio = (row.numericValue / total) * 100;
              const displayRatio = ratio < 0.1 && ratio > 0 ? '<0.1%' : `${ratio.toFixed(1)}%`;

              return (
                <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorClasses[idx % colorClasses.length]}`} />
                    <span className="truncate text-text-secondary">{row.label}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="tabular-nums text-text-primary">{displayRatio}</div>
                    <div className="mt-0.5 tabular-nums text-[11px] text-text-muted">
                      {formatCurrency(row.numericValue)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AddConnectionForm({
  userId,
  connectedBrokers,
  onDone,
}: {
  userId: string;
  connectedBrokers: Set<Broker>;
  onDone: () => void | Promise<void>;
}) {
  const availableBrokers = useMemo(
    () => (['TOSS', 'KIS'] as const).filter((item) => !connectedBrokers.has(item)),
    [connectedBrokers]
  );
  const [broker, setBroker] = useState<Broker>(availableBrokers[0] ?? 'KIS');
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [accountSeq, setAccountSeq] = useState('');
  const [label, setLabel] = useState('');
  const [paper, setPaper] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (connectedBrokers.has(broker)) {
      setBroker(availableBrokers[0] ?? 'KIS');
    }
  }, [availableBrokers, broker, connectedBrokers]);

  if (availableBrokers.length === 0) {
    return (
      <section className={CARD}>
        <h2 className="text-base font-semibold text-text-primary">연결 가능한 증권사가 없습니다</h2>
        <div className="mt-2 text-sm text-text-muted">한국투자증권과 토스증권이 이미 연결되어 있습니다.</div>
      </section>
    );
  }

  const credentials =
    broker === 'KIS'
      ? { appKey, appSecret, accountNo, paper }
      : { clientId, clientSecret, accountSeq: accountSeq || undefined };
  const filled = broker === 'KIS' ? appKey && appSecret && accountNo : clientId && clientSecret;

  const test = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/brokerage/connections/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId, broker, credentials }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || '연결 테스트 실패');
      setMsg({ kind: 'ok', text: '연결 성공' });
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '연결 테스트 실패' });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/brokerage/connections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId, broker, label: label || null, credentials }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || '저장 실패');
      await onDone();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '저장 실패' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={CARD}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">{brokerName(broker)} 연결</h2>
          <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-text-muted">
            <FaLock />
            서버 암호화 저장
          </div>
        </div>
        <div className="inline-flex rounded-lg bg-bg-secondary p-1">
          {(['TOSS', 'KIS'] as const).map((item) => {
            const disabled = connectedBrokers.has(item);
            return (
              <BrokerSelectButton
                key={item}
                broker={item}
                selected={broker === item}
                disabled={disabled}
                onSelect={() => {
                  setBroker(item);
                  setMsg(null);
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {broker === 'KIS' ? (
          <>
            <Field label="appkey" value={appKey} onChange={setAppKey} autoComplete="off" />
            <Field label="appsecret" value={appSecret} onChange={setAppSecret} type="password" autoComplete="off" />
            <Field label="계좌번호" value={accountNo} onChange={setAccountNo} placeholder="12345678-01" autoComplete="off" />
            <label className="flex min-h-[46px] items-center gap-2 rounded-lg border border-[var(--border)] bg-bg-secondary px-3 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={paper}
                onChange={(e) => setPaper(e.target.checked)}
                className="accent-accent-blue"
              />
              모의투자 계좌
            </label>
          </>
        ) : (
          <>
            <Field label="client_id" value={clientId} onChange={setClientId} autoComplete="off" />
            <Field label="client_secret" value={clientSecret} onChange={setClientSecret} type="password" autoComplete="off" />
            <Field label="accountSeq" value={accountSeq} onChange={setAccountSeq} placeholder="선택" autoComplete="off" />
          </>
        )}
        <Field label="별칭" value={label} onChange={setLabel} placeholder="선택" />
      </div>

      {msg && (
        <div className={`mt-3 text-xs ${msg.kind === 'ok' ? 'text-accent-mint' : 'text-accent-coral'}`}>
          {msg.text}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className={ACTION_BTN} disabled={busy || !filled} onClick={test}>
          <FaCheckCircle />
          연결 테스트
        </button>
        <button type="button" className={PRIMARY_BTN} disabled={busy || !filled} onClick={save}>
          {busy ? '처리 중' : '저장'}
        </button>
      </div>
    </section>
  );
}

function BrokerSelectButton({
  broker,
  selected,
  disabled,
  onSelect,
}: {
  broker: Broker;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        selected ? 'bg-accent-blue/20 text-accent-blue' : 'text-text-muted hover:text-text-secondary'
      }`}
      onClick={onSelect}
    >
      {brokerName(broker)}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label>
      <span className={LABEL}>{label}</span>
      <input
        className={FIELD}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
