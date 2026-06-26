'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { formatCurrency } from '@moneger/shared';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  MdAccountBalanceWallet,
  MdCalendarToday,
  MdChevronLeft,
  MdChevronRight,
  MdEdit,
  MdOutlineSavings,
  MdRefresh,
  MdSave,
  MdShowChart,
  MdSouthEast,
  MdTrendingUp,
  MdWallet,
} from 'react-icons/md';
import { FaPiggyBank } from 'react-icons/fa';

interface AssetsPageProps {
  userId: string;
}

interface Snapshot {
  month: string;
  totalAssetKrw: number;
  cashKrw: number;
  investmentKrw: number;
  savingsKrw: number;
  otherKrw: number;
  cashRatio: number;
  investmentRatio: number;
  savingsRatio: number;
  otherRatio: number;
  monthlyIncomeKrw: number;
  monthlyExpenseKrw: number;
  monthlySavingsKrw: number;
  investmentPnlKrw: number;
  investmentChangeKrw: number | null;
  sourceStatus: string;
  stored: boolean;
}

interface InvestmentPosition {
  accountId: string;
  accountName: string;
  broker: string;
  snapshotDate: string;
  asOf: string;
  symbol: string;
  name: string;
  market: string | null;
  currency: string;
  quantity: number;
  avgCost: number | null;
  lastPrice: number | null;
  marketValue: number;
  marketValueKrw: number;
  unrealizedPnlKrw: number;
  pnlRate: number | null;
  fxRateToKrw: number | null;
}

interface InvestmentAccount {
  accountId: string;
  accountName: string;
  broker: string;
  snapshotDate: string;
  asOf: string;
  cashKrw: number;
  positionsValueKrw: number;
  totalEquityKrw: number;
}

interface InvestmentDailyBalance {
  date: string;
  broker: string;
  cashKrw: number;
  positionsValueKrw: number;
  totalEquityKrw: number;
}

interface InvestmentBalancePoint {
  date: string;
  cashKrw: number;
  positionsValueKrw: number;
  totalEquityKrw: number;
}

interface SavingsGoalReport {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  targetYear: number;
  targetMonth: number;
  isPrimary: boolean;
  progressPercent: number;
  monthlyDepositKrw: number;
}

interface AssetReport {
  months: string[];
  snapshots: Snapshot[];
  current: Snapshot & {
    previousTotalAssetKrw: number | null;
    totalMomDelta: number | null;
    totalMomPercent: number | null;
  };
  report: {
    expenseBudgetKrw: number;
    expenseBudgetUsedPercent: number | null;
    expenseMomPercent: number | null;
    savingsRate: number | null;
    emergencyMonths: number | null;
    topExpenseCategories: Array<{
      categoryId: string;
      name: string;
      color: string | null;
      amount: number;
      budgetKrw: number | null;
      usedPercent: number | null;
    }>;
    primarySavingsGoal: {
      id: string;
      name: string;
      currentAmount: number;
      targetAmount: number;
      targetYear: number;
      targetMonth: number;
      isPrimary: boolean;
      progressPercent: number;
      monthlyDepositKrw: number;
    } | null;
    savingsGoals: SavingsGoalReport[];
    investment: {
      totalKrw: number;
      monthlyChangeKrw: number | null;
      unrealizedPnlKrw: number;
      snapshotDate: string | null;
      snapshotDateCount: number;
      accounts: InvestmentAccount[];
      dailyBalances: InvestmentDailyBalance[];
      topPosition: {
        symbol: string;
        name: string;
        pnlKrw: number;
        pnlRate: number | null;
      } | null;
      positions: InvestmentPosition[];
    };
  };
}

const CARD = 'rounded-[16px] border border-[var(--border)] bg-bg-card p-4 sm:rounded-[20px] sm:p-5';
const PANEL = 'rounded-[16px] border border-[var(--border)] bg-bg-secondary/60 p-4 sm:rounded-[20px] sm:p-5';
const ICON_BTN =
  'inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-bg-card px-3 text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/70 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer';

const COLORS = {
  cash: '#60a5fa',
  investment: '#8b7cf6',
  savings: '#24b383',
  other: '#9a9a92',
  expense: '#e45f38',
};

const tooltipStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  color: 'var(--text-primary)',
  fontSize: '12px',
};

function money(value: number): string {
  return formatCurrency(Math.round(value));
}

function signedMoney(value: number): string {
  return `${value > 0 ? '+' : value < 0 ? '-' : ''}${money(Math.abs(value))}`;
}

function shortMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 100000000) return `${sign}${(abs / 100000000).toFixed(abs >= 1000000000 ? 1 : 2)}억`;
  if (abs >= 10000) return `${sign}${Math.round(abs / 10000).toLocaleString('ko-KR')}만`;
  return `${sign}${Math.round(abs).toLocaleString('ko-KR')}`;
}

function quantity(value: number): string {
  return value.toLocaleString('ko-KR', {
    maximumFractionDigits: 6,
  });
}

function percent(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '-';
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

function monthLabel(month: string): string {
  const [, m] = month.split('-');
  return `${Number(m)}월`;
}

function dayLabel(date: string): string {
  const [, , day] = date.split('-');
  return `${Number(day)}일`;
}

function fullMonthLabel(month: string): string {
  const [y, m] = month.split('-');
  return `${y}년 ${Number(m)}월`;
}

function targetMonthLabel(year: number, month: number): string {
  return `${year}.${String(month).padStart(2, '0')}`;
}

function moveMonth(month: string, delta: number): string {
  const [year, rawMonth] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, rawMonth - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function daysInMonth(month: string): number {
  const [year, rawMonth] = month.split('-').map(Number);
  return new Date(year, rawMonth, 0).getDate();
}

function elapsedDaysInMonth(month: string): number {
  const totalDays = daysInMonth(month);
  if (month !== currentMonthKey()) return totalDays;
  return Math.min(new Date().getDate(), totalDays);
}

function composition(snapshot: Snapshot) {
  return [
    { key: 'cash', label: '현금', value: snapshot.cashKrw, ratio: snapshot.cashRatio, color: COLORS.cash },
    { key: 'investment', label: '투자', value: snapshot.investmentKrw, ratio: snapshot.investmentRatio, color: COLORS.investment },
    { key: 'savings', label: '저축', value: snapshot.savingsKrw, ratio: snapshot.savingsRatio, color: COLORS.savings },
    { key: 'other', label: '기타', value: snapshot.otherKrw, ratio: snapshot.otherRatio, color: COLORS.other },
  ].filter((item) => item.value > 0 || item.key !== 'other');
}

type AssetBucket = 'cash' | 'investment' | 'savings' | 'other';

function assetRatio(snapshot: Snapshot, key: AssetBucket): number {
  if (key === 'cash') return snapshot.cashRatio;
  if (key === 'investment') return snapshot.investmentRatio;
  if (key === 'savings') return snapshot.savingsRatio;
  return snapshot.otherRatio;
}

function changeClass(value: number | null | undefined) {
  if (value == null || value === 0) return 'text-text-muted';
  return value > 0 ? 'text-accent-coral' : 'text-accent-blue';
}

function positiveGoodClass(value: number | null | undefined) {
  if (value == null || value === 0) return 'text-text-muted';
  return value > 0 ? 'text-accent-mint' : 'text-accent-coral';
}

function sourceStatusLabel(snapshot: Snapshot): string {
  if (!snapshot.stored) return '실시간 계산';
  if (snapshot.sourceStatus === 'cron') return '월말 자동 저장';
  if (snapshot.sourceStatus === 'manual') return '수동 저장';
  return '저장됨';
}

export default function AssetsPage({ userId }: AssetsPageProps) {
  const [month, setMonth] = useState(currentMonthKey);
  const [range, setRange] = useState(6);
  const [selectedReport, setSelectedReport] = useState<'expense' | 'savings' | 'investment'>('expense');
  const [selectedInvestmentBroker, setSelectedInvestmentBroker] = useState('ALL');
  const [data, setData] = useState<AssetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/monthly-report?userId=${userId}&month=${month}&range=${range}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '자산 리포트를 불러오지 못했습니다');
      setData(json.data as AssetReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : '자산 리포트를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [month, range, userId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleSaveSnapshot = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/assets/monthly-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, month }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '스냅샷 저장에 실패했습니다');
      await fetchReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : '스냅샷 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <HeaderSkeleton />
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className={`${CARD} h-[210px] animate-pulse`} />
          <div className={`${CARD} h-[210px] animate-pulse`} />
        </div>
        <div className={`${CARD} h-[320px] animate-pulse`} />
      </div>
    );
  }

  if (!data) {
    return (
      <section className={CARD}>
        <div className="text-base font-semibold text-text-primary">자산 현황</div>
        <div className="mt-2 text-sm text-text-muted">{error ?? '데이터가 없습니다'}</div>
        <button className={`${ICON_BTN} mt-4 gap-2`} onClick={fetchReport}>
          <MdRefresh className="text-lg" />
          다시 불러오기
        </button>
      </section>
    );
  }

  const current = data.current;
  const comp = composition(current);
  const previousSnapshot =
    data.snapshots.find((snapshot) => snapshot.month === moveMonth(current.month, -1)) ??
    data.snapshots[data.snapshots.length - 2] ??
    null;
  const tableMonths = data.snapshots.slice(-3);
  const investmentChange = data.report.investment.monthlyChangeKrw ?? 0;
  const changeDrivers =
    current.totalMomDelta == null
      ? []
      : [
          {
            key: 'income',
            label: '수입',
            description: '이번 달 들어온 금액',
            value: current.monthlyIncomeKrw,
            color: COLORS.savings,
            icon: <MdTrendingUp />,
          },
          {
            key: 'expense',
            label: '소비',
            description: '이번 달 빠져나간 소비',
            value: -current.monthlyExpenseKrw,
            color: COLORS.expense,
            icon: <MdSouthEast />,
          },
          {
            key: 'investment',
            label: '투자 변동',
            description: '증권 자산 평가금액 변화',
            value: investmentChange,
            color: COLORS.investment,
            icon: <MdShowChart />,
          },
          {
            key: 'other',
            label: '기타/보정',
            description: '현금·저축 이동 및 기타 자산 변화',
            value: current.totalMomDelta - (current.monthlyIncomeKrw - current.monthlyExpenseKrw + investmentChange),
            color: COLORS.other,
            icon: <MdEdit />,
          },
        ];
  const maxDriverAmount = Math.max(1, ...changeDrivers.map((item) => Math.abs(item.value)));
  const strongestDriver = changeDrivers.reduce<(typeof changeDrivers)[number] | null>((strongest, item) => {
    if (!strongest || Math.abs(item.value) > Math.abs(strongest.value)) return item;
    return strongest;
  }, null);
  const storedSnapshotCount = data.snapshots.filter((snapshot) => snapshot.stored).length;
  const investmentPositions = data.report.investment.positions;
  const investmentAccounts = data.report.investment.accounts;
  const brokerStatsByBroker = investmentAccounts.reduce((map, account) => {
    const currentStat = map.get(account.broker) ?? {
      broker: account.broker,
      count: 0,
      totalKrw: 0,
      cashKrw: 0,
      positionsValueKrw: 0,
      pnlKrw: 0,
    };
    currentStat.totalKrw += account.totalEquityKrw;
    currentStat.cashKrw += account.cashKrw;
    currentStat.positionsValueKrw += account.positionsValueKrw;
    map.set(account.broker, currentStat);
    return map;
  }, new Map<string, { broker: string; count: number; totalKrw: number; cashKrw: number; positionsValueKrw: number; pnlKrw: number }>());
  for (const position of investmentPositions) {
    const currentStat = brokerStatsByBroker.get(position.broker);
    if (!currentStat) continue;
    currentStat.count += 1;
    currentStat.pnlKrw += position.unrealizedPnlKrw;
  }
  const brokerStats = Array.from(brokerStatsByBroker.values()).sort((a, b) => b.totalKrw - a.totalKrw);
  const activeInvestmentBroker =
    selectedInvestmentBroker === 'ALL' || brokerStats.some((stat) => stat.broker === selectedInvestmentBroker)
      ? selectedInvestmentBroker
      : 'ALL';
  const visibleInvestmentAccounts =
    activeInvestmentBroker === 'ALL'
      ? investmentAccounts
      : investmentAccounts.filter((account) => account.broker === activeInvestmentBroker);
  const visibleInvestmentPositions =
    activeInvestmentBroker === 'ALL'
      ? investmentPositions
      : investmentPositions.filter((position) => position.broker === activeInvestmentBroker);
  const visibleInvestmentTotalKrw = visibleInvestmentAccounts.reduce((sum, account) => sum + account.totalEquityKrw, 0);
  const visibleInvestmentCashKrw = visibleInvestmentAccounts.reduce((sum, account) => sum + account.cashKrw, 0);
  const visibleInvestmentPnlKrw = visibleInvestmentPositions.reduce((sum, position) => sum + position.unrealizedPnlKrw, 0);
  const totalInvestmentEquityKrw = brokerStats.reduce((sum, stat) => sum + stat.totalKrw, 0);
  const visibleInvestmentWeight =
    totalInvestmentEquityKrw > 0 ? (visibleInvestmentTotalKrw / totalInvestmentEquityKrw) * 100 : null;
  const investmentDailyBalances = data.report.investment.dailyBalances ?? [];
  const visibleInvestmentDailyRows =
    activeInvestmentBroker === 'ALL'
      ? investmentDailyBalances
      : investmentDailyBalances.filter((row) => row.broker === activeInvestmentBroker);
  const investmentBalanceByDate = visibleInvestmentDailyRows.reduce((map, row) => {
    const currentPoint = map.get(row.date) ?? {
      date: row.date,
      cashKrw: 0,
      positionsValueKrw: 0,
      totalEquityKrw: 0,
    };
    currentPoint.cashKrw += row.cashKrw;
    currentPoint.positionsValueKrw += row.positionsValueKrw;
    currentPoint.totalEquityKrw += row.totalEquityKrw;
    map.set(row.date, currentPoint);
    return map;
  }, new Map<string, InvestmentBalancePoint>());
  const investmentBalanceChartData = Array.from(investmentBalanceByDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const firstInvestmentBalance =
    investmentBalanceChartData.length > 0 ? investmentBalanceChartData[0].totalEquityKrw : null;
  const lastInvestmentBalance =
    investmentBalanceChartData.length > 0
      ? investmentBalanceChartData[investmentBalanceChartData.length - 1].totalEquityKrw
      : null;
  const investmentBalanceDelta =
    firstInvestmentBalance == null || lastInvestmentBalance == null ? null : lastInvestmentBalance - firstInvestmentBalance;
  const elapsedDays = elapsedDaysInMonth(current.month);
  const remainingDays = Math.max(daysInMonth(current.month) - elapsedDays, 0);
  const expenseBudgetRemaining =
    data.report.expenseBudgetKrw > 0 ? data.report.expenseBudgetKrw - current.monthlyExpenseKrw : null;
  const averageDailyExpense = elapsedDays > 0 ? current.monthlyExpenseKrw / elapsedDays : 0;
  const remainingDailyBudget =
    expenseBudgetRemaining != null && remainingDays > 0 ? expenseBudgetRemaining / remainingDays : null;
  const topExpenseCategory = data.report.topExpenseCategories[0] ?? null;
  const topExpenseShare =
    topExpenseCategory && current.monthlyExpenseKrw > 0
      ? (topExpenseCategory.amount / current.monthlyExpenseKrw) * 100
      : null;
  const afterExpenseCashFlow = current.monthlyIncomeKrw - current.monthlyExpenseKrw;
  const afterSavingsCashFlow = current.monthlyIncomeKrw - current.monthlyExpenseKrw - current.monthlySavingsKrw;
  const savingsGoalRemaining = data.report.primarySavingsGoal
    ? Math.max(data.report.primarySavingsGoal.targetAmount - data.report.primarySavingsGoal.currentAmount, 0)
    : null;
  const totalSavingsGoalRemaining = data.report.savingsGoals.reduce(
    (sum, goal) => sum + Math.max(goal.targetAmount - goal.currentAmount, 0),
    0
  );
  const savingsGoalMonthsLeft =
    savingsGoalRemaining != null && data.report.primarySavingsGoal && data.report.primarySavingsGoal.monthlyDepositKrw > 0
      ? Math.ceil(savingsGoalRemaining / data.report.primarySavingsGoal.monthlyDepositKrw)
      : null;
  const assetRows = [
    { key: 'cash', label: 'Moneger 잔액', badge: '현금', icon: <MdWallet />, color: COLORS.cash },
    { key: 'investment', label: '증권 자산', badge: '투자', icon: <MdShowChart />, color: COLORS.investment },
    { key: 'savings', label: '적금', badge: '저축', icon: <FaPiggyBank />, color: COLORS.savings },
    { key: 'other', label: '기타 자산', badge: '기타', icon: <MdEdit />, color: COLORS.other },
  ] as const;

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-bg-card text-text-secondary">
            <MdAccountBalanceWallet className="text-2xl" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">자산 현황</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] bg-bg-card px-2">
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/70 cursor-pointer"
              aria-label="이전 달"
              onClick={() => setMonth((value) => moveMonth(value, -1))}
            >
              <MdChevronLeft className="text-xl" />
            </button>
            <span className="min-w-[104px] text-center text-sm font-semibold text-text-secondary sm:text-base">
              {month}
            </span>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/70 cursor-pointer"
              aria-label="다음 달"
              disabled={month >= currentMonthKey()}
              onClick={() => setMonth((value) => moveMonth(value, 1))}
            >
              <MdChevronRight className="text-xl" />
            </button>
          </div>
          <button
            className={`${ICON_BTN} gap-2 font-semibold`}
            onClick={() => setRange((value) => (value === 6 ? 12 : 6))}
          >
            최근 {range}개월
          </button>
          <button
            className={`${ICON_BTN} gap-2 font-semibold`}
            disabled={saving}
            onClick={handleSaveSnapshot}
          >
            <MdSave className="text-lg" />
            저장
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-accent-coral/30 bg-accent-coral/10 px-4 py-3 text-sm text-accent-coral">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <section className={CARD}>
          <div className="text-sm font-semibold text-text-muted">총 자산</div>
          <div className="mt-5 tabular-nums text-4xl font-bold leading-none tracking-tight text-text-primary sm:text-5xl">
            {money(current.totalAssetKrw)}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {current.totalMomDelta != null ? (
              <>
                <span className={`inline-flex min-h-10 items-center gap-1 rounded-xl px-4 text-base font-bold tabular-nums ${
                  current.totalMomDelta >= 0 ? 'bg-accent-coral/15 text-accent-coral' : 'bg-accent-blue/15 text-accent-blue'
                }`}>
                  {current.totalMomDelta >= 0 ? <MdTrendingUp /> : <MdSouthEast />}
                  {signedMoney(current.totalMomDelta)}
                </span>
                <span className="text-sm font-semibold text-text-muted">
                  전월 대비 {percent(current.totalMomPercent)}
                </span>
              </>
            ) : (
              <span className="text-sm text-text-muted">전월 스냅샷 대기 중</span>
            )}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <MdCalendarToday className="text-sm" />
              {fullMonthLabel(current.month)}
            </span>
            <span>{current.stored ? '스냅샷 저장됨' : '실시간 계산'}</span>
            {data.report.emergencyMonths != null && <span>현금 {data.report.emergencyMonths}개월치</span>}
          </div>
        </section>

        <section className={CARD}>
          <h2 className="text-base font-semibold text-text-muted">자산 구성비</h2>
          <div className="mt-7 h-7 overflow-hidden rounded-full bg-bg-primary">
            <div className="flex h-full w-full">
              {comp.map((item) => (
                <div
                  key={item.key}
                  className="border-r border-bg-card last:border-r-0"
                  style={{ width: `${item.ratio}%`, backgroundColor: item.color }}
                  title={`${item.label} ${item.ratio}%`}
                />
              ))}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {comp.map((item) => (
              <div key={item.key} className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
                  <span className="h-3 w-3 rounded-[4px]" style={{ backgroundColor: item.color }} />
                  {item.label} {item.ratio.toFixed(0)}%
                </div>
                <div className="mt-1 truncate text-xs tabular-nums text-text-muted">{money(item.value)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className={CARD}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text-muted">자산 변화 원인</h2>
              <p className="mt-1 text-sm text-text-muted">
                {strongestDriver
                  ? `${strongestDriver.label}이 이번 달 변화에서 가장 크게 작용했습니다`
                  : '전월 데이터가 쌓이면 변화 원인을 분해합니다'}
              </p>
            </div>
            <div className={`tabular-nums text-right text-xl font-bold ${changeClass(current.totalMomDelta)}`}>
              {current.totalMomDelta == null ? '-' : signedMoney(current.totalMomDelta)}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {changeDrivers.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-bg-secondary/50 px-4 py-5 text-sm text-text-muted">
                전월 스냅샷이 있으면 수입, 소비, 투자 변동, 기타 요인으로 총자산 변화를 나눠 보여줍니다.
              </div>
            ) : (
              changeDrivers.map((item) => {
                const width = Math.round((Math.abs(item.value) / maxDriverAmount) * 100);
                return (
                  <div key={item.key}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-lg" style={{ color: item.color }}>{item.icon}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-text-primary">{item.label}</div>
                          <div className="truncate text-xs text-text-muted">{item.description}</div>
                        </div>
                      </div>
                      <span className={`shrink-0 tabular-nums text-sm font-bold ${changeClass(item.value)}`}>
                        {signedMoney(item.value)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-bg-primary">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${width}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className={CARD}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text-muted">구성비 변화</h2>
              <p className="mt-1 text-sm text-text-muted">
                {previousSnapshot ? `${monthLabel(previousSnapshot.month)} 대비` : '전월 스냅샷 대기 중'}
              </p>
            </div>
            <span className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
              current.stored ? 'bg-accent-mint/15 text-accent-mint' : 'bg-bg-secondary text-text-muted'
            }`}>
              {sourceStatusLabel(current)}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {comp.map((item) => {
              const delta = previousSnapshot ? item.ratio - assetRatio(previousSnapshot, item.key as AssetBucket) : null;
              return (
                <div key={item.key} className="rounded-xl bg-bg-secondary/60 px-3 py-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
                    <span className="h-2.5 w-2.5 rounded-[4px]" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <span className="tabular-nums text-lg font-bold text-text-primary">{item.ratio.toFixed(0)}%</span>
                    <span className={`tabular-nums text-xs font-bold ${changeClass(delta)}`}>
                      {delta == null ? '-' : percent(delta)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-4 text-sm">
            <div>
              <div className="font-semibold text-text-muted">저장된 월</div>
              <div className="mt-1 tabular-nums text-lg font-bold text-text-primary">{storedSnapshotCount}개월</div>
            </div>
            <div>
              <div className="font-semibold text-text-muted">조회 범위</div>
              <div className="mt-1 tabular-nums text-lg font-bold text-text-primary">{range}개월</div>
            </div>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-bg-card sm:rounded-[20px]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border)] text-sm text-text-muted">
                <th className="px-5 py-4 font-semibold">항목</th>
                {tableMonths.map((snapshot) => (
                  <th key={snapshot.month} className="px-5 py-4 text-right font-semibold">
                    {monthLabel(snapshot.month)}
                  </th>
                ))}
                <th className="px-5 py-4 text-right font-semibold">MoM</th>
              </tr>
            </thead>
            <tbody>
              {assetRows.map((row) => {
                const values = tableMonths.map((snapshot) => {
                  if (row.key === 'cash') return snapshot.cashKrw;
                  if (row.key === 'investment') return snapshot.investmentKrw;
                  if (row.key === 'savings') return snapshot.savingsKrw;
                  return snapshot.otherKrw;
                });
                if (row.key === 'other' && values.every((value) => value <= 0)) return null;
                const latest = values[values.length - 1] ?? 0;
                const previousValue = values[values.length - 2] ?? null;
                const delta = previousValue != null ? latest - previousValue : null;
                const deltaPct = previousValue && previousValue > 0 ? (delta! / previousValue) * 100 : null;
                return (
                  <tr key={row.key} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="text-xl text-text-muted">{row.icon}</span>
                        <span className="min-w-0 truncate text-base font-semibold text-text-primary">{row.label}</span>
                        <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${row.color}22`, color: row.color }}>
                          {row.badge}
                        </span>
                      </div>
                    </td>
                    {values.map((value, index) => (
                      <td key={`${row.key}-${tableMonths[index].month}`} className="px-5 py-4 text-right tabular-nums text-base font-semibold text-text-secondary">
                        {value > 0 ? value.toLocaleString('ko-KR') : '-'}
                      </td>
                    ))}
                    <td className={`px-5 py-4 text-right tabular-nums text-base font-bold ${changeClass(delta)}`}>
                      {deltaPct == null ? '-' : percent(deltaPct, 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">{fullMonthLabel(current.month)} 리포트</h2>
          <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-bg-card px-4 text-sm font-semibold text-text-secondary">
            <MdCalendarToday className="text-lg" />
            이번 달
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ReportMetric
            icon={<MdSouthEast />}
            label="소비"
            value={money(current.monthlyExpenseKrw)}
            sub={`전월 ${percent(data.report.expenseMomPercent, 0)} · 예산 ${
              data.report.expenseBudgetUsedPercent == null ? '-' : `${data.report.expenseBudgetUsedPercent}%`
            }`}
            tone="expense"
            active={selectedReport === 'expense'}
            onClick={() => setSelectedReport('expense')}
          />
          <ReportMetric
            icon={<MdOutlineSavings />}
            label="저축"
            value={money(current.monthlySavingsKrw)}
            sub={`저축률 ${data.report.savingsRate == null ? '-' : `${data.report.savingsRate.toFixed(0)}%`}`}
            tone="savings"
            active={selectedReport === 'savings'}
            onClick={() => setSelectedReport('savings')}
          />
          <ReportMetric
            icon={<MdShowChart />}
            label="투자"
            value={signedMoney(data.report.investment.monthlyChangeKrw ?? 0)}
            sub={`평가손익 ${signedMoney(data.report.investment.unrealizedPnlKrw)}`}
            tone="investment"
            active={selectedReport === 'investment'}
            onClick={() => setSelectedReport('investment')}
          />
        </div>

        {selectedReport === 'expense' && (
          <section className={PANEL}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-bold text-text-primary">
                <MdSouthEast className="text-xl" style={{ color: COLORS.expense }} />
                소비 분석
              </h3>
              <span className="text-sm font-semibold text-text-muted">
                예산 {data.report.expenseBudgetKrw > 0 ? money(data.report.expenseBudgetKrw) : '-'}
              </span>
            </div>

            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
              <ReportLine
                label={expenseBudgetRemaining != null && expenseBudgetRemaining < 0 ? '예산 초과' : '예산 잔액'}
                value={expenseBudgetRemaining == null ? '-' : money(Math.abs(expenseBudgetRemaining))}
                valueClass={positiveGoodClass(expenseBudgetRemaining)}
                bordered={false}
              />
              <ReportLine
                label="일평균 소비"
                value={money(averageDailyExpense)}
                bordered={false}
              />
              <ReportLine
                label="남은 일 예산"
                value={remainingDailyBudget == null ? '-' : money(remainingDailyBudget)}
                valueClass={positiveGoodClass(remainingDailyBudget)}
                bordered={false}
              />
              <ReportLine
                label="최대 카테고리"
                value={
                  topExpenseCategory
                    ? `${topExpenseCategory.name} ${topExpenseShare == null ? '-' : `${topExpenseShare.toFixed(0)}%`}`
                    : '-'
                }
                bordered={false}
              />
            </div>

            <div className="mt-5 space-y-4">
              {data.report.topExpenseCategories.length === 0 ? (
                <div className="py-8 text-center text-sm text-text-muted">이번 달 소비 데이터가 없습니다</div>
              ) : (
                data.report.topExpenseCategories.map((category) => {
                  const width = Math.min(category.usedPercent ?? 0, 100);
                  return (
                    <div key={category.categoryId}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold">
                        <span className="text-text-secondary">{category.name}</span>
                        <span className="tabular-nums text-text-muted">
                          {category.amount.toLocaleString('ko-KR')} · {category.usedPercent == null ? '-' : `${category.usedPercent}%`}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-bg-primary">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${width}%`, backgroundColor: category.color ?? COLORS.expense }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {selectedReport === 'savings' && (
          <section className={PANEL}>
            <h3 className="flex items-center gap-2 text-lg font-bold text-text-primary">
              <FaPiggyBank style={{ color: COLORS.savings }} />
              저축 분석
            </h3>

            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
              <ReportLine
                label="월 수입"
                value={money(current.monthlyIncomeKrw)}
                valueClass={positiveGoodClass(current.monthlyIncomeKrw)}
                bordered={false}
              />
              <ReportLine
                label="소비 후 잔액"
                value={signedMoney(afterExpenseCashFlow)}
                valueClass={positiveGoodClass(afterExpenseCashFlow)}
                bordered={false}
              />
              <ReportLine
                label="저축 후 잔액"
                value={signedMoney(afterSavingsCashFlow)}
                valueClass={positiveGoodClass(afterSavingsCashFlow)}
                bordered={false}
              />
              <ReportLine
                label="전체 목표 잔여"
                value={data.report.savingsGoals.length === 0 ? '-' : money(totalSavingsGoalRemaining)}
                bordered={false}
              />
            </div>

            {data.report.primarySavingsGoal ? (
              <div className="mt-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-text-muted">대표 목표</div>
                    <div className="mt-1 text-xl font-bold text-text-primary">{data.report.primarySavingsGoal.name}</div>
                  </div>
                  <div className="text-right tabular-nums text-2xl font-bold" style={{ color: COLORS.savings }}>
                    {data.report.primarySavingsGoal.progressPercent}%
                  </div>
                </div>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-bg-primary">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${data.report.primarySavingsGoal.progressPercent}%`, backgroundColor: COLORS.savings }}
                  />
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                  <ReportLine
                    label="현재 금액"
                    value={money(data.report.primarySavingsGoal.currentAmount)}
                    bordered={false}
                  />
                  <ReportLine
                    label="목표 금액"
                    value={money(data.report.primarySavingsGoal.targetAmount)}
                    bordered={false}
                  />
                  <ReportLine
                    label="이번 달 납입"
                    value={signedMoney(data.report.primarySavingsGoal.monthlyDepositKrw)}
                    valueClass={changeClass(data.report.primarySavingsGoal.monthlyDepositKrw)}
                    bordered={false}
                  />
                  <ReportLine
                    label="현재 속도"
                    value={savingsGoalMonthsLeft == null ? '-' : `${savingsGoalMonthsLeft}개월`}
                    valueClass={savingsGoalMonthsLeft != null && savingsGoalMonthsLeft <= 6 ? 'text-accent-mint' : undefined}
                    bordered={false}
                  />
                </div>

                <div className="mt-6 border-t border-[var(--border)] pt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-bold text-text-primary">전체 저축 목표</div>
                    <div className="text-xs font-semibold text-text-muted">{data.report.savingsGoals.length}개</div>
                  </div>
                  <div className="space-y-3">
                    {data.report.savingsGoals.map((goal) => {
                      const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
                      const monthsLeft = goal.monthlyDepositKrw > 0 ? Math.ceil(remaining / goal.monthlyDepositKrw) : null;
                      return (
                        <div key={goal.id} className="rounded-xl bg-bg-primary px-4 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-bold text-text-primary">{goal.name}</span>
                                {goal.isPrimary && (
                                  <span className="rounded-md bg-accent-mint/15 px-2 py-0.5 text-[10px] font-bold text-accent-mint">
                                    대표
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-xs font-semibold text-text-muted">
                                목표 {targetMonthLabel(goal.targetYear, goal.targetMonth)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="tabular-nums text-sm font-bold text-text-primary">{goal.progressPercent}%</div>
                              <div className="mt-1 text-xs tabular-nums text-text-muted">
                                {money(goal.currentAmount)} / {money(goal.targetAmount)}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-card">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${goal.progressPercent}%`, backgroundColor: COLORS.savings }}
                            />
                          </div>
                          <div className="mt-3 grid gap-2 text-xs font-semibold text-text-muted sm:grid-cols-3">
                            <div>잔여 {money(remaining)}</div>
                            <div className="tabular-nums">이번 달 {signedMoney(goal.monthlyDepositKrw)}</div>
                            <div>{monthsLeft == null ? '현재 속도 -' : `현재 속도 ${monthsLeft}개월`}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 text-sm text-text-muted">저축 목표가 없습니다</div>
            )}
          </section>
        )}

        {selectedReport === 'investment' && (
          <section className={PANEL}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-bold text-text-primary">
                <MdShowChart style={{ color: COLORS.investment }} />
                투자 변동
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-xl bg-bg-primary px-3 py-1.5 text-xs font-bold text-text-muted">
                  기준 {data.report.investment.snapshotDate ?? '-'}
                </span>
                <span className="rounded-xl bg-bg-primary px-3 py-1.5 text-xs font-bold text-text-muted">
                  월말 보유 {visibleInvestmentPositions.length}개
                </span>
              </div>
            </div>
            {data.report.investment.snapshotDateCount > 1 && (
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-bg-primary px-3 py-2 text-xs font-semibold text-text-muted">
                계좌별 최신 스냅샷 기준일이 달라 일부 종목은 다른 날짜 기준으로 집계되었습니다.
              </div>
            )}

            {brokerStats.length > 0 && (
              <div className="mt-5 overflow-x-auto">
                <div className="flex min-w-max gap-2">
                  <button
                    type="button"
                    aria-pressed={activeInvestmentBroker === 'ALL'}
                    className={`min-h-11 rounded-xl border px-4 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/70 cursor-pointer ${
                      activeInvestmentBroker === 'ALL'
                        ? 'border-accent-blue/60 bg-accent-blue/15 text-text-primary'
                        : 'border-[var(--border)] bg-bg-primary text-text-muted hover:bg-bg-card-hover hover:text-text-primary'
                    }`}
                    onClick={() => setSelectedInvestmentBroker('ALL')}
                  >
                    <div className="text-sm font-bold">전체</div>
                    <div className="mt-0.5 text-xs tabular-nums">{money(totalInvestmentEquityKrw)}</div>
                  </button>
                  {brokerStats.map((stat) => {
                    const brokerWeight =
                      totalInvestmentEquityKrw > 0 ? (stat.totalKrw / totalInvestmentEquityKrw) * 100 : null;
                    const active = activeInvestmentBroker === stat.broker;
                    return (
                      <button
                        key={stat.broker}
                        type="button"
                        aria-pressed={active}
                        className={`min-h-11 rounded-xl border px-4 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/70 cursor-pointer ${
                          active
                            ? 'border-accent-blue/60 bg-accent-blue/15 text-text-primary'
                            : 'border-[var(--border)] bg-bg-primary text-text-muted hover:bg-bg-card-hover hover:text-text-primary'
                        }`}
                        onClick={() => setSelectedInvestmentBroker(stat.broker)}
                      >
                        <div className="flex items-center gap-2 text-sm font-bold">
                          {stat.broker}
                          <span className="rounded-md bg-bg-card px-1.5 py-0.5 text-[10px] text-text-muted">{stat.count}</span>
                        </div>
                        <div className="mt-0.5 text-xs tabular-nums">
                          {money(stat.totalKrw)} · {brokerWeight == null ? '-' : `${brokerWeight.toFixed(1)}%`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
              <ReportLine
                label={activeInvestmentBroker === 'ALL' ? '평가금액' : `${activeInvestmentBroker} 평가금액`}
                value={money(visibleInvestmentTotalKrw)}
                valueClass={changeClass(visibleInvestmentTotalKrw)}
                bordered={false}
              />
              <ReportLine
                label="계좌 현금"
                value={money(visibleInvestmentCashKrw)}
                valueClass={changeClass(visibleInvestmentCashKrw)}
                bordered={false}
              />
              <ReportLine
                label={activeInvestmentBroker === 'ALL' ? '월간 변동' : '투자 내 비중'}
                value={
                  activeInvestmentBroker === 'ALL'
                    ? data.report.investment.monthlyChangeKrw == null
                      ? '-'
                      : signedMoney(data.report.investment.monthlyChangeKrw)
                    : visibleInvestmentWeight == null
                      ? '-'
                      : `${visibleInvestmentWeight.toFixed(1)}%`
                }
                valueClass={
                  activeInvestmentBroker === 'ALL'
                    ? changeClass(data.report.investment.monthlyChangeKrw)
                    : changeClass(visibleInvestmentWeight)
                }
                bordered={false}
              />
              <ReportLine
                label="평가손익"
                value={signedMoney(visibleInvestmentPnlKrw)}
                valueClass={changeClass(visibleInvestmentPnlKrw)}
                bordered={false}
              />
            </div>

            <div className="mt-5 rounded-xl border border-[var(--border)] bg-bg-primary p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-text-primary">한달간 투자 잔고</div>
                  <div className="mt-1 text-xs font-semibold text-text-muted">
                    {activeInvestmentBroker === 'ALL' ? '전체' : activeInvestmentBroker} · 일별 스냅샷 · 현금 포함
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold tabular-nums text-text-primary">
                    {lastInvestmentBalance == null ? '-' : money(lastInvestmentBalance)}
                  </div>
                  <div className={`mt-1 text-xs font-bold tabular-nums ${changeClass(investmentBalanceDelta)}`}>
                    {investmentBalanceDelta == null ? '스냅샷 없음' : signedMoney(investmentBalanceDelta)}
                  </div>
                </div>
              </div>
              {investmentBalanceChartData.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-sm font-semibold text-text-muted">
                  이번 달 투자 일별 스냅샷이 없습니다
                </div>
              ) : (
                <InvestmentBalanceChart data={investmentBalanceChartData} />
              )}
            </div>

            <div className="mt-5 border-t border-[var(--border)] pt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-text-primary">월말 보유 종목</div>
                <div className="text-xs font-semibold text-text-muted">
                  {activeInvestmentBroker === 'ALL' ? '전체' : activeInvestmentBroker} · 평가금액순
                </div>
              </div>
              {visibleInvestmentPositions.length === 0 ? (
                <div className="rounded-xl border border-[var(--border)] bg-bg-primary px-4 py-6 text-center text-sm text-text-muted">
                  월말 기준 보유 종목이 없습니다
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-bg-card">
                  <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-xs font-semibold text-text-muted">
                        <th className="px-4 py-3">종목</th>
                        <th className="px-4 py-3">계좌</th>
                        <th className="px-4 py-3 text-right">수량</th>
                        <th className="px-4 py-3 text-right">현재가</th>
                        <th className="px-4 py-3 text-right">비중</th>
                        <th className="px-4 py-3 text-right">평가금액</th>
                        <th className="px-4 py-3 text-right">평가손익</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleInvestmentPositions.map((position) => {
                        const weight =
                          visibleInvestmentTotalKrw > 0
                            ? (position.marketValueKrw / visibleInvestmentTotalKrw) * 100
                            : null;
                        return (
                          <tr key={`${position.accountId}-${position.symbol}`} className="border-b border-[var(--border)] last:border-b-0">
                            <td className="px-4 py-3">
                              <div className="font-bold text-text-primary">{position.symbol}</div>
                              <div className="mt-0.5 max-w-[220px] truncate text-xs text-text-muted">
                                {position.name}
                                {position.market ? ` · ${position.market}` : ''}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-text-secondary">{position.accountName}</div>
                              <div className="mt-0.5 text-xs text-text-muted">
                                {position.broker} · {position.snapshotDate}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-semibold text-text-secondary">
                              {quantity(position.quantity)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-semibold text-text-secondary">
                              {position.lastPrice == null ? '-' : `${position.lastPrice.toLocaleString('ko-KR')} ${position.currency}`}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-bold text-text-primary">
                              {weight == null ? '-' : `${weight.toFixed(1)}%`}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-bold text-text-primary">
                              {money(position.marketValueKrw)}
                            </td>
                            <td className={`px-4 py-3 text-right tabular-nums font-bold ${changeClass(position.unrealizedPnlKrw)}`}>
                              <div>{signedMoney(position.unrealizedPnlKrw)}</div>
                              <div className="mt-0.5 text-xs">{percent(position.pnlRate == null ? null : position.pnlRate * 100)}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}

function InvestmentBalanceChart({ data }: { data: InvestmentBalancePoint[] }) {
  const chartData = data.map((point) => ({
    date: point.date,
    label: dayLabel(point.date),
    value: point.totalEquityKrw,
  }));
  const firstPoint = data[0];
  const lastPoint = data[data.length - 1];
  const ariaLabel =
    firstPoint && lastPoint
      ? `투자 잔고 변화 그래프. ${firstPoint.date} ${money(firstPoint.totalEquityKrw)}에서 ${lastPoint.date} ${money(lastPoint.totalEquityKrw)}`
      : '투자 잔고 변화 그래프';

  return (
    <div className="h-[220px] min-w-0" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="investmentBalanceGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={COLORS.investment} stopOpacity={0.38} />
              <stop offset="100%" stopColor={COLORS.investment} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            minTickGap={16}
          />
          <YAxis
            tickFormatter={shortMoney}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={56}
            domain={['dataMin', 'dataMax']}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [money(Number(value ?? 0)), '투자 잔고']}
          />
          <Area
            type="monotone"
            dataKey="value"
            name="투자 잔고"
            stroke={COLORS.investment}
            strokeWidth={2.5}
            fill="url(#investmentBalanceGradient)"
            dot={data.length === 1 ? { r: 4, fill: COLORS.investment, strokeWidth: 0 } : false}
            activeDot={{ r: 5, stroke: COLORS.investment, strokeWidth: 2, fill: 'var(--bg-card)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="h-10 w-44 rounded-xl bg-bg-card" />
      <div className="h-11 w-64 rounded-xl bg-bg-card" />
    </div>
  );
}

function ReportMetric({
  icon,
  label,
  value,
  sub,
  tone,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: 'expense' | 'savings' | 'investment';
  active: boolean;
  onClick: () => void;
}) {
  const color = tone === 'expense' ? COLORS.expense : tone === 'savings' ? COLORS.savings : COLORS.investment;
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`${CARD} w-full cursor-pointer text-left transition-colors hover:bg-bg-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/70 ${
        active ? 'border-text-muted bg-bg-card-hover' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 text-base font-bold text-text-muted">
        <span className="text-xl" style={{ color }}>{icon}</span>
        {label}
      </div>
      <div className="mt-5 tabular-nums text-3xl font-bold tracking-tight" style={{ color }}>
        {value}
      </div>
      <div className="mt-2 text-sm font-semibold text-text-muted">{sub}</div>
    </button>
  );
}

function ReportLine({
  label,
  value,
  valueClass,
  bordered = true,
}: {
  label: string;
  value: string;
  valueClass?: string;
  bordered?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${bordered ? 'border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0' : ''}`}>
      <span className="font-semibold text-text-muted">{label}</span>
      <span className={`text-right tabular-nums font-bold text-text-primary ${valueClass ?? ''}`}>{value}</span>
    </div>
  );
}
