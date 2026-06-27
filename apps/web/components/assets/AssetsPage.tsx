'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { formatCurrency } from '@moneger/shared';
import { Area, AreaChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  MdAccountBalanceWallet,
  MdAutoAwesome,
  MdCalendarToday,
  MdCheckCircle,
  MdEdit,
  MdFlag,
  MdInfoOutline,
  MdLock,
  MdOutlineSavings,
  MdRefresh,
  MdShowChart,
  MdSouthEast,
  MdTrendingUp,
} from 'react-icons/md';
import { FaPiggyBank } from 'react-icons/fa';
import { usePlan } from '@/hooks';

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

interface BrokerStat {
  broker: string;
  count: number;
  totalKrw: number;
  cashKrw: number;
  positionsValueKrw: number;
  pnlKrw: number;
}

interface InvestmentDerivedData {
  investmentPositions: InvestmentPosition[];
  investmentAccounts: InvestmentAccount[];
  brokerStats: BrokerStat[];
  activeInvestmentBroker: string;
  visibleInvestmentAccounts: InvestmentAccount[];
  visibleInvestmentPositions: InvestmentPosition[];
  visibleInvestmentTotalKrw: number;
  visibleInvestmentCashKrw: number;
  visibleInvestmentPnlKrw: number;
  totalInvestmentEquityKrw: number;
  totalInvestmentCashKrw: number;
  investmentCashRatio: number | null;
  visibleInvestmentWeight: number | null;
  investmentBalanceChartData: InvestmentBalancePoint[];
  firstInvestmentBalance: number | null;
  lastInvestmentBalance: number | null;
  investmentBalanceDelta: number | null;
}

interface DailyExpense {
  date: string;
  day: number;
  amount: number;
  cumulativeAmount: number;
  budgetPaceKrw: number | null;
}

interface ExpenseCategoryReport {
  categoryId: string;
  name: string;
  color: string | null;
  amount: number;
  budgetKrw: number | null;
  usedPercent: number | null;
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
    dailyExpenses: DailyExpense[];
    expenseCategories?: ExpenseCategoryReport[];
    topExpenseCategories?: ExpenseCategoryReport[];
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

interface AiSummaryResult {
  month: string;
  text: string;
  generatedAt: string;
  source: 'ai' | 'template';
}

const CARD = 'min-w-0 rounded-[16px] border border-[var(--border)] bg-bg-card p-4 sm:rounded-[20px] sm:p-5';
const PANEL = 'min-w-0 rounded-[16px] border border-[var(--border)] bg-bg-secondary/60 p-4 sm:rounded-[20px] sm:p-5';
const ICON_BTN =
  'inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-bg-card px-3 text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/70 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer';

const REPORT_RANGE_MONTHS = 6;

const COLORS = {
  cash: '#60a5fa',
  investment: '#8b7cf6',
  savings: '#24b383',
  other: '#9a9a92',
  expense: '#e45f38',
};

const CHECK_THRESHOLDS = {
  emergencyMonths: 6,
  savingsRate: 25,
  expenseBudgetUsed: 90,
  investmentCashRatio: 5,
};

const tooltipStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  color: 'var(--text-primary)',
  fontSize: '12px',
};

const EMPTY_INVESTMENT_DERIVED: InvestmentDerivedData = {
  investmentPositions: [],
  investmentAccounts: [],
  brokerStats: [],
  activeInvestmentBroker: 'ALL',
  visibleInvestmentAccounts: [],
  visibleInvestmentPositions: [],
  visibleInvestmentTotalKrw: 0,
  visibleInvestmentCashKrw: 0,
  visibleInvestmentPnlKrw: 0,
  totalInvestmentEquityKrw: 0,
  totalInvestmentCashKrw: 0,
  investmentCashRatio: null,
  visibleInvestmentWeight: null,
  investmentBalanceChartData: [],
  firstInvestmentBalance: null,
  lastInvestmentBalance: null,
  investmentBalanceDelta: null,
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

function ratioText(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return '-';
  return `${value.toFixed(digits)}%`;
}

function percentagePoint(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '-';
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%p`;
}

function percentChange(currentValue: number, previousValue: number | null | undefined): number | null {
  if (previousValue == null || previousValue <= 0) return null;
  return ((currentValue - previousValue) / previousValue) * 100;
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

function signedAmountClass(value: number | null | undefined) {
  if (value == null || value === 0) return 'text-text-muted';
  return value > 0 ? 'text-accent-mint' : 'text-accent-coral';
}

type CheckTone = 'good' | 'warn' | 'bad' | 'neutral';

function checkToneClass(tone: CheckTone) {
  if (tone === 'good') return 'bg-accent-mint/12 text-accent-mint';
  if (tone === 'warn') return 'bg-yellow-500/12 text-yellow-400';
  if (tone === 'bad') return 'bg-accent-coral/12 text-accent-coral';
  return 'bg-bg-secondary text-text-muted';
}

function checkToneIcon(tone: CheckTone) {
  if (tone === 'good') return <MdCheckCircle />;
  if (tone === 'neutral') return <MdInfoOutline />;
  return <MdFlag />;
}

export default function AssetsPage({ userId }: AssetsPageProps) {
  const [month, setMonth] = useState(currentMonthKey);
  const [selectedReport, setSelectedReport] = useState<'expense' | 'savings' | 'investment'>('expense');
  const [selectedInvestmentBroker, setSelectedInvestmentBroker] = useState('ALL');
  const [data, setData] = useState<AssetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<AiSummaryResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCacheLoading, setAiCacheLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiNoticeAccepted, setAiNoticeAccepted] = useState(false);
  const { features, isLoading: isPlanLoading } = usePlan(userId);
  const canUseAiSummary = features.includes('AI_SUMMARY');
  const investmentDerived = useMemo<InvestmentDerivedData>(() => {
    const investment = data?.report.investment;
    if (!investment) return EMPTY_INVESTMENT_DERIVED;

    const investmentPositions = investment.positions;
    const investmentAccounts = investment.accounts;
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
    }, new Map<string, BrokerStat>());

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
    const totalInvestmentCashKrw = brokerStats.reduce((sum, stat) => sum + stat.cashKrw, 0);
    const investmentCashRatio =
      totalInvestmentEquityKrw > 0 ? (totalInvestmentCashKrw / totalInvestmentEquityKrw) * 100 : null;
    const visibleInvestmentWeight =
      totalInvestmentEquityKrw > 0 ? (visibleInvestmentTotalKrw / totalInvestmentEquityKrw) * 100 : null;
    const investmentDailyBalances = investment.dailyBalances ?? [];
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

    return {
      investmentPositions,
      investmentAccounts,
      brokerStats,
      activeInvestmentBroker,
      visibleInvestmentAccounts,
      visibleInvestmentPositions,
      visibleInvestmentTotalKrw,
      visibleInvestmentCashKrw,
      visibleInvestmentPnlKrw,
      totalInvestmentEquityKrw,
      totalInvestmentCashKrw,
      investmentCashRatio,
      visibleInvestmentWeight,
      investmentBalanceChartData,
      firstInvestmentBalance,
      lastInvestmentBalance,
      investmentBalanceDelta,
    };
  }, [data?.report.investment, selectedInvestmentBroker]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/monthly-report?userId=${userId}&month=${month}&range=${REPORT_RANGE_MONTHS}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '자산 리포트를 불러오지 못했습니다');
      setData(json.data as AssetReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : '자산 리포트를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [month, userId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    setAiSummary(null);
    setAiError(null);
    setAiLoading(false);
    setAiCacheLoading(false);
  }, [month]);

  useEffect(() => {
    const stored = window.localStorage.getItem('moneger.assetAiSummary.noticeAccepted');
    setAiNoticeAccepted(stored === 'true');
  }, []);

  useEffect(() => {
    if (isPlanLoading || !canUseAiSummary) return;

    let ignore = false;
    const controller = new AbortController();

    const fetchCachedAiSummary = async () => {
      setAiCacheLoading(true);
      setAiError(null);

      try {
        const params = new URLSearchParams({ userId, month });
        const res = await fetch(`/api/assets/ai-summary?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'AI 한 줄 평을 불러오지 못했습니다');
        if (ignore) return;
        if (json.data) {
          setAiSummary({ month, ...(json.data as Omit<AiSummaryResult, 'month'>) });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (!ignore) {
          setAiError(err instanceof Error ? err.message : 'AI 한 줄 평을 불러오지 못했습니다');
        }
      } finally {
        if (!ignore) setAiCacheLoading(false);
      }
    };

    fetchCachedAiSummary();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [canUseAiSummary, isPlanLoading, month, userId]);

  const fetchAiSummary = useCallback(
    async (regenerate = false) => {
      if (!canUseAiSummary || aiLoading || aiCacheLoading) return;
      const requestedMonth = month;
      setAiLoading(true);
      setAiError(null);
      if (!aiNoticeAccepted) {
        window.localStorage.setItem('moneger.assetAiSummary.noticeAccepted', 'true');
        setAiNoticeAccepted(true);
      }

      try {
        const res = await fetch('/api/assets/ai-summary', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userId, month: requestedMonth, regenerate }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'AI 한 줄 평을 불러오지 못했습니다');
        setAiSummary({ month: requestedMonth, ...(json.data as Omit<AiSummaryResult, 'month'>) });
      } catch (err) {
        setAiError(err instanceof Error ? err.message : 'AI 한 줄 평을 불러오지 못했습니다');
      } finally {
        setAiLoading(false);
      }
    },
    [aiCacheLoading, aiLoading, aiNoticeAccepted, canUseAiSummary, month, userId]
  );

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
  const investmentChange = data.report.investment.monthlyChangeKrw ?? 0;
  const savingsAmountMomPercent = percentChange(current.monthlySavingsKrw, previousSnapshot?.monthlySavingsKrw);
  const previousSavingsRate =
    previousSnapshot && previousSnapshot.monthlyIncomeKrw > 0
      ? (previousSnapshot.monthlySavingsKrw / previousSnapshot.monthlyIncomeKrw) * 100
      : null;
  const savingsRateDelta =
    data.report.savingsRate != null && previousSavingsRate != null ? data.report.savingsRate - previousSavingsRate : null;
  const investmentBalanceMomPercent =
    previousSnapshot && previousSnapshot.investmentKrw > 0 ? (investmentChange / previousSnapshot.investmentKrw) * 100 : null;
  const netOperatingFlow = current.monthlyIncomeKrw - current.monthlyExpenseKrw;
  const afterSavingsCashFlow = netOperatingFlow - current.monthlySavingsKrw;
  const otherAdjustment =
    current.totalMomDelta == null
      ? null
      : current.totalMomDelta - (netOperatingFlow + current.monthlySavingsKrw + investmentChange);
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
            key: 'savings',
            label: '저축',
            description: '저축 목표로 이동한 금액',
            value: current.monthlySavingsKrw,
            color: COLORS.savings,
            icon: <MdOutlineSavings />,
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
            description: '현금 스냅샷 차이 및 기타 자산 변화',
            value: otherAdjustment ?? 0,
            color: COLORS.other,
            icon: <MdEdit />,
          },
        ];
  const maxDriverAmount = Math.max(1, ...changeDrivers.map((item) => Math.abs(item.value)));
  const strongestDriver = changeDrivers.reduce<(typeof changeDrivers)[number] | null>((strongest, item) => {
    if (!strongest || Math.abs(item.value) > Math.abs(strongest.value)) return item;
    return strongest;
  }, null);
  const {
    brokerStats,
    activeInvestmentBroker,
    visibleInvestmentPositions,
    visibleInvestmentTotalKrw,
    visibleInvestmentCashKrw,
    visibleInvestmentPnlKrw,
    totalInvestmentEquityKrw,
    totalInvestmentCashKrw,
    investmentCashRatio,
    visibleInvestmentWeight,
    investmentBalanceChartData,
    lastInvestmentBalance,
    investmentBalanceDelta,
  } = investmentDerived;
  const totalDaysInSelectedMonth = daysInMonth(current.month);
  const elapsedDays = elapsedDaysInMonth(current.month);
  const remainingDays = Math.max(totalDaysInSelectedMonth - elapsedDays, 0);
  const expenseBudgetRemaining =
    data.report.expenseBudgetKrw > 0 ? data.report.expenseBudgetKrw - current.monthlyExpenseKrw : null;
  const averageDailyExpense = elapsedDays > 0 ? current.monthlyExpenseKrw / elapsedDays : 0;
  const remainingDailyBudget =
    expenseBudgetRemaining != null && remainingDays > 0 ? expenseBudgetRemaining / remainingDays : null;
  const expenseTrendRows = data.report.dailyExpenses.slice(0, Math.max(1, elapsedDays));
  const latestExpensePace = expenseTrendRows[expenseTrendRows.length - 1]?.budgetPaceKrw ?? null;
  const expensePaceDelta = latestExpensePace == null ? null : current.monthlyExpenseKrw - latestExpensePace;
  const projectedMonthlyExpense = elapsedDays > 0 ? (current.monthlyExpenseKrw / elapsedDays) * totalDaysInSelectedMonth : 0;
  const projectedBudgetDelta =
    data.report.expenseBudgetKrw > 0 ? projectedMonthlyExpense - data.report.expenseBudgetKrw : null;
  const expenseCategories = data.report.expenseCategories ?? data.report.topExpenseCategories ?? [];
  const topExpenseCategory = expenseCategories[0] ?? null;
  const topExpenseShare =
    topExpenseCategory && current.monthlyExpenseKrw > 0
      ? (topExpenseCategory.amount / current.monthlyExpenseKrw) * 100
      : null;
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
  const emergencyTone: CheckTone =
    data.report.emergencyMonths == null
      ? 'neutral'
      : data.report.emergencyMonths >= CHECK_THRESHOLDS.emergencyMonths
        ? 'good'
        : data.report.emergencyMonths >= 3
          ? 'warn'
          : 'bad';
  const savingsRateTone: CheckTone =
    data.report.savingsRate == null
      ? 'neutral'
      : data.report.savingsRate >= CHECK_THRESHOLDS.savingsRate
        ? 'good'
        : data.report.savingsRate >= 15
          ? 'warn'
          : 'bad';
  const expenseBudgetTone: CheckTone =
    data.report.expenseBudgetUsedPercent == null
      ? 'neutral'
      : data.report.expenseBudgetUsedPercent <= CHECK_THRESHOLDS.expenseBudgetUsed
        ? 'good'
        : data.report.expenseBudgetUsedPercent <= 100
          ? 'warn'
          : 'bad';
  const investmentCashTone: CheckTone =
    investmentCashRatio == null
      ? 'neutral'
      : investmentCashRatio <= CHECK_THRESHOLDS.investmentCashRatio
        ? 'good'
        : investmentCashRatio <= 10
          ? 'warn'
          : 'bad';
  const monthChecks = [
    {
      key: 'emergency',
      label: '비상금',
      value: data.report.emergencyMonths == null ? '-' : `${data.report.emergencyMonths.toFixed(1)}개월`,
      sub: '최근 소비 기준 현금 여력',
      tone: emergencyTone,
    },
    {
      key: 'savingsRate',
      label: '저축률',
      value: ratioText(data.report.savingsRate, 0),
      sub: data.report.savingsRate == null ? '수입 데이터 없음' : `전월 대비 ${percentagePoint(savingsRateDelta)}`,
      tone: savingsRateTone,
    },
    {
      key: 'expenseBudget',
      label: '소비 예산',
      value: data.report.expenseBudgetUsedPercent == null ? '-' : `${data.report.expenseBudgetUsedPercent}% 사용`,
      sub:
        expenseBudgetRemaining == null
          ? '예산 미설정'
          : expenseBudgetRemaining >= 0
            ? `${money(expenseBudgetRemaining)} 남음`
            : `${money(Math.abs(expenseBudgetRemaining))} 초과`,
      tone: expenseBudgetTone,
    },
    {
      key: 'investmentCash',
      label: '투자 현금',
      value: ratioText(investmentCashRatio, 1),
      sub: `계좌 현금 ${money(totalInvestmentCashKrw)}`,
      tone: investmentCashTone,
    },
  ];
  const monthlyStatusItems = [
    {
      key: 'netFlow',
      label: '순현금흐름',
      value: signedMoney(netOperatingFlow),
      sub: `수입 ${money(current.monthlyIncomeKrw)} · 소비 ${money(current.monthlyExpenseKrw)}`,
      valueClass: positiveGoodClass(netOperatingFlow),
    },
    {
      key: 'afterSavings',
      label: '저축 후 잔액',
      value: money(afterSavingsCashFlow),
      sub: `저축 ${money(current.monthlySavingsKrw)}`,
      valueClass: positiveGoodClass(afterSavingsCashFlow),
    },
    {
      key: 'investmentEffect',
      label: '투자 변동',
      value: signedMoney(investmentChange),
      sub: `평가손익 ${signedMoney(current.investmentPnlKrw)}`,
      valueClass: signedAmountClass(investmentChange),
    },
  ];
  const maxExpenseCategoryAmount = Math.max(1, ...expenseCategories.map((category) => category.amount));
  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-bg-card text-text-secondary">
            <MdAccountBalanceWallet className="text-2xl" />
          </span>
          <h1 className="min-w-0 truncate text-xl font-bold tracking-tight text-text-primary sm:text-3xl">자산 현황</h1>
        </div>

        <div className="flex shrink-0 items-center">
          <div className="flex items-center bg-bg-card border border-[var(--border)] rounded-xl relative select-none py-2 px-2 gap-1 sm:px-3 sm:gap-2">
            <button
              className="text-text-secondary hover:text-text-primary transition-colors text-sm sm:text-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="이전 달"
              onClick={() => setMonth((value) => moveMonth(value, -1))}
            >
              ◀
            </button>
            <span className="min-w-[76px] sm:min-w-[120px] text-center text-sm font-semibold text-text-secondary sm:text-base">
              {fullMonthLabel(month)}
            </span>
            <button
              className="text-text-secondary hover:text-text-primary transition-colors text-sm sm:text-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="다음 달"
              disabled={month >= currentMonthKey()}
              onClick={() => setMonth((value) => moveMonth(value, 1))}
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-accent-coral/30 bg-accent-coral/10 px-4 py-3 text-sm text-accent-coral">
          {error}
        </div>
      )}

      <section className={CARD}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent-purple/15 text-accent-purple">
                <MdAutoAwesome className="text-xl" />
              </span>
              <h2 className="text-base font-semibold text-text-primary">AI 한 줄 평</h2>
            </div>
            {!aiNoticeAccepted && canUseAiSummary && (
              <p className="mt-3 max-w-3xl text-xs leading-5 text-text-muted">
                AI 한 줄 평은 회원님의 자산 요약 지표(금액·비율 등)를 OpenAI에 전송해 생성됩니다.
                보유 종목명·목표명 등 세부는 전송하지 않습니다.
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {isPlanLoading ? (
              <span className="inline-flex h-10 items-center rounded-xl bg-bg-secondary px-3 text-xs font-semibold text-text-muted">
                확인 중
              </span>
            ) : canUseAiSummary ? (
              <>
                {aiSummary?.month === current.month ? (
                  <button
                    className={`${ICON_BTN} gap-2`}
                    onClick={() => fetchAiSummary(true)}
                    disabled={aiLoading || aiCacheLoading}
                  >
                    <MdRefresh className="text-lg" />
                    {aiLoading ? '생성 중...' : aiCacheLoading ? '확인 중...' : '다시 생성'}
                  </button>
                ) : (
                  <button
                    className={`${ICON_BTN} gap-2`}
                    onClick={() => fetchAiSummary(false)}
                    disabled={aiLoading || aiCacheLoading}
                  >
                    <MdAutoAwesome className="text-lg" />
                    {aiLoading ? '생성 중...' : aiCacheLoading ? '확인 중...' : '생성'}
                  </button>
                )}
              </>
            ) : (
              <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-bg-secondary px-3 text-xs font-semibold text-text-muted">
                <MdLock className="text-base" />
                ULTIMATE 전용
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 min-h-12 rounded-xl border border-[var(--border)] bg-bg-primary px-4 py-3">
          {aiError ? (
            <div className="text-sm font-semibold text-accent-coral">{aiError}</div>
          ) : aiSummary?.month === current.month ? (
            <div className="text-sm leading-6 text-text-secondary">{aiSummary.text}</div>
          ) : aiLoading ? (
            <div className="text-sm font-semibold text-text-muted">생성 중...</div>
          ) : aiCacheLoading ? (
            <div className="text-sm font-semibold text-text-muted">저장된 요약 확인 중...</div>
          ) : (
            <div className="text-sm text-text-muted">
              {canUseAiSummary ? `${fullMonthLabel(current.month)} 요약을 생성할 수 있습니다` : '현재 요금제에서는 사용할 수 없습니다'}
            </div>
          )}
        </div>
      </section>

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

      <section className={CARD}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text-muted">월간 결산</h2>
            <p className="mt-1 text-sm text-text-muted">
              수입, 소비, 저축, 투자 변동을 한 번에 확인합니다
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {monthlyStatusItems.map((item) => (
            <div key={item.key} className="rounded-xl border border-[var(--border)] bg-bg-primary px-4 py-4">
              <div className="text-sm font-bold text-text-muted">{item.label}</div>
              <div className={`mt-3 min-h-7 tabular-nums text-xl font-bold ${item.valueClass}`}>{item.value}</div>
              <div className="mt-1 truncate text-xs font-semibold text-text-muted">{item.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={CARD}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text-muted">이번 달 체크</h2>
            <p className="mt-1 text-sm text-text-muted">
              {elapsedDays}/{totalDaysInSelectedMonth}일 기준으로 바로 확인할 지표입니다
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-0 overflow-hidden rounded-xl border border-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
          {monthChecks.map((item, index) => (
            <div
              key={item.key}
              className={`bg-bg-primary px-4 py-4 ${
                index < monthChecks.length - 1 ? 'border-b border-[var(--border)] sm:border-r lg:border-b-0' : ''
              } ${index === 1 ? 'sm:border-r-0 lg:border-r' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-text-muted">{item.label}</span>
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-base ${checkToneClass(item.tone)}`}>
                  {checkToneIcon(item.tone)}
                </span>
              </div>
              <div className="mt-3 tabular-nums text-xl font-bold text-text-primary">{item.value}</div>
              <div className="mt-1 text-xs font-semibold text-text-muted">{item.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className={CARD}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-text-muted">자산 변화 원인</h2>
              <p className="mt-1 text-sm text-text-muted">
                {strongestDriver
                  ? `${strongestDriver.label}이 이번 달 변화에서 가장 크게 작용했습니다`
                  : '전월 데이터가 쌓이면 변화 원인을 분해합니다'}
              </p>
            </div>
            <div className={`tabular-nums text-xl font-bold sm:text-right ${signedAmountClass(current.totalMomDelta)}`}>
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
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-lg" style={{ color: item.color }}>{item.icon}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-text-primary">{item.label}</div>
                          <div className="truncate text-xs text-text-muted">{item.description}</div>
                        </div>
                      </div>
                      <span className={`shrink-0 tabular-nums text-sm font-bold ${signedAmountClass(item.value)}`}>
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
          </div>

          <div className="mt-5 grid gap-3">
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
                      {percentagePoint(delta)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">{fullMonthLabel(current.month)} 리포트</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ReportMetric
            icon={<MdSouthEast />}
            label="소비"
            value={money(current.monthlyExpenseKrw)}
            delta={percent(data.report.expenseMomPercent, 0)}
            deltaClass={changeClass(data.report.expenseMomPercent)}
            sub={`예산 ${data.report.expenseBudgetUsedPercent == null ? '-' : `${data.report.expenseBudgetUsedPercent}%`} · 일평균 ${money(averageDailyExpense)}`}
            tone="expense"
            active={selectedReport === 'expense'}
            onClick={() => setSelectedReport('expense')}
          />
          <ReportMetric
            icon={<MdOutlineSavings />}
            label="저축"
            value={money(current.monthlySavingsKrw)}
            delta={percent(savingsAmountMomPercent, 0)}
            deltaClass={positiveGoodClass(savingsAmountMomPercent)}
            sub={`저축률 ${ratioText(data.report.savingsRate, 0)} · 전월 ${percentagePoint(savingsRateDelta)}`}
            tone="savings"
            active={selectedReport === 'savings'}
            onClick={() => setSelectedReport('savings')}
          />
          <ReportMetric
            icon={<MdShowChart />}
            label="투자"
            value={signedMoney(data.report.investment.monthlyChangeKrw ?? 0)}
            delta={percent(investmentBalanceMomPercent, 0)}
            valueClass={signedAmountClass(data.report.investment.monthlyChangeKrw)}
            deltaClass={signedAmountClass(investmentBalanceMomPercent)}
            sub={`평가손익 ${signedMoney(data.report.investment.unrealizedPnlKrw)} · 현금 ${ratioText(investmentCashRatio, 1)}`}
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
                label="월말 예상"
                value={projectedMonthlyExpense > 0 ? money(projectedMonthlyExpense) : '-'}
                valueClass={positiveGoodClass(projectedBudgetDelta == null ? null : -projectedBudgetDelta)}
                bordered={false}
              />
              <ReportLine
                label={expenseBudgetRemaining != null && expenseBudgetRemaining < 0 ? '예산 초과' : '예산 잔액'}
                value={expenseBudgetRemaining == null ? '-' : money(Math.abs(expenseBudgetRemaining))}
                valueClass={positiveGoodClass(expenseBudgetRemaining)}
                bordered={false}
              />
              <ReportLine
                label="하루 사용 가능"
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

            <div className="mt-5 rounded-xl border border-[var(--border)] bg-bg-primary p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-text-primary">일별 누적 소비</div>
                  <div className="mt-1 text-xs font-semibold text-text-muted">
                    {elapsedDays}/{totalDaysInSelectedMonth}일 기준 · 고정비 반영 페이스 비교
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold tabular-nums text-text-primary">{money(current.monthlyExpenseKrw)}</div>
                  <div className={`mt-1 text-xs font-bold tabular-nums ${positiveGoodClass(expensePaceDelta == null ? null : -expensePaceDelta)}`}>
                    {expensePaceDelta == null
                      ? '예산 미설정'
                      : expensePaceDelta <= 0
                        ? `${money(Math.abs(expensePaceDelta))} 여유`
                        : `${money(expensePaceDelta)} 빠름`}
                  </div>
                </div>
              </div>
              <ExpenseCumulativeChart data={expenseTrendRows} hasBudget={data.report.expenseBudgetKrw > 0} />
            </div>

            <div className="mt-5 rounded-xl border border-[var(--border)] bg-bg-primary p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-text-primary">카테고리별 지출</div>
                <div className="text-xs font-semibold text-text-muted">예산 대비</div>
              </div>
              <div className="space-y-4">
                {expenseCategories.length === 0 ? (
                  <div className="py-8 text-center text-sm text-text-muted">이번 달 소비 데이터가 없습니다</div>
                ) : (
                  expenseCategories.map((category) => {
                    const width =
                      category.usedPercent == null
                        ? Math.round((category.amount / maxExpenseCategoryAmount) * 100)
                        : Math.min(category.usedPercent, 100);
                    const remaining =
                      category.budgetKrw == null ? null : category.budgetKrw - category.amount;
                    return (
                      <div key={category.categoryId}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold">
                          <span className="min-w-0 truncate text-text-secondary">{category.name}</span>
                          <span className="shrink-0 tabular-nums text-text-muted">
                            {money(category.amount)} · {category.usedPercent == null ? '예산 없음' : `${category.usedPercent}%`}
                          </span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-bg-card">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${width}%`, backgroundColor: category.color ?? COLORS.expense }}
                          />
                        </div>
                        {remaining != null && (
                          <div className={`mt-1 text-right text-xs font-bold tabular-nums ${positiveGoodClass(remaining)}`}>
                            {remaining >= 0 ? `${money(remaining)} 남음` : `${money(Math.abs(remaining))} 초과`}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        )}

        {selectedReport === 'savings' && (
          <section className={PANEL}>
            <h3 className="flex items-center gap-2 text-lg font-bold text-text-primary">
              <FaPiggyBank style={{ color: COLORS.savings }} />
              저축 분석
            </h3>

            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <ReportLine
                label="이번 달 총 저축액"
                value={money(current.monthlySavingsKrw)}
                valueClass="text-accent-mint"
                bordered={false}
              />
              <ReportLine
                label="저축 후 잔액"
                value={money(afterSavingsCashFlow)}
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
                bordered={false}
              />
              <ReportLine
                label="계좌 현금"
                value={money(visibleInvestmentCashKrw)}
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
                    ? signedAmountClass(data.report.investment.monthlyChangeKrw)
                    : undefined
                }
                bordered={false}
              />
              <ReportLine
                label="평가손익"
                value={signedMoney(visibleInvestmentPnlKrw)}
                valueClass={signedAmountClass(visibleInvestmentPnlKrw)}
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
                  <div className={`mt-1 text-xs font-bold tabular-nums ${signedAmountClass(investmentBalanceDelta)}`}>
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
                            <td className={`px-4 py-3 text-right tabular-nums font-bold ${signedAmountClass(position.unrealizedPnlKrw)}`}>
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

function ExpenseCumulativeChart({ data, hasBudget }: { data: DailyExpense[]; hasBudget: boolean }) {
  const chartData = data.map((point) => ({
    label: `${point.day}일`,
    spent: point.cumulativeAmount,
    pace: point.budgetPaceKrw,
  }));
  const firstPoint = data[0];
  const lastPoint = data[data.length - 1];
  const ariaLabel =
    firstPoint && lastPoint
      ? `일별 누적 소비 그래프. ${firstPoint.day}일 ${money(firstPoint.cumulativeAmount)}에서 ${lastPoint.day}일 ${money(lastPoint.cumulativeAmount)}`
      : '일별 누적 소비 그래프';

  return (
    <div className="h-[220px] min-w-0" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="expenseCumulativeGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={COLORS.expense} stopOpacity={0.34} />
              <stop offset="100%" stopColor={COLORS.expense} stopOpacity={0.04} />
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
            domain={[0, 'dataMax']}
          />
          <Tooltip
            contentStyle={tooltipStyle}
	            formatter={(value, name) => [
	              money(Number(value ?? 0)),
	              name === 'pace' ? '고정비 반영 페이스' : '누적 소비',
	            ]}
          />
          <Area
            type="monotone"
            dataKey="spent"
            name="spent"
            stroke={COLORS.expense}
            strokeWidth={2.5}
            fill="url(#expenseCumulativeGradient)"
            dot={data.length === 1 ? { r: 4, fill: COLORS.expense, strokeWidth: 0 } : false}
            activeDot={{ r: 5, stroke: COLORS.expense, strokeWidth: 2, fill: 'var(--bg-card)' }}
          />
          {hasBudget && (
            <Line
              type="linear"
              dataKey="pace"
              name="pace"
              stroke="#fbbf24"
              strokeWidth={1.8}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4, stroke: '#fbbf24', strokeWidth: 2, fill: 'var(--bg-card)' }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
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
  valueClass,
  delta,
  deltaClass,
  sub,
  tone,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueClass?: string;
  delta?: string;
  deltaClass?: string;
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
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-base font-bold text-text-muted">
          <span className="text-xl" style={{ color }}>{icon}</span>
          {label}
        </div>
        {delta && (
          <span className={`shrink-0 rounded-lg bg-bg-secondary px-2 py-1 text-xs font-bold tabular-nums ${deltaClass ?? 'text-text-muted'}`}>
            전월 {delta}
          </span>
        )}
      </div>
      <div
        className={`mt-5 tabular-nums text-3xl font-bold tracking-tight ${valueClass ?? ''}`}
        style={valueClass ? undefined : { color }}
      >
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
