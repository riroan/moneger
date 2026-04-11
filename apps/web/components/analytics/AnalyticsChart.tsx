'use client';

import {
  ComposedChart,
  BarChart,
  AreaChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { MdBarChart, MdTrendingUp, MdStackedBarChart, MdSavings } from 'react-icons/md';
import type { AnalyticsResult } from '@/lib/services/analytics.service';
import { formatNumber } from '@/utils/formatters';

// DESIGN.md accent colors
const COLOR_MINT   = '#4ade80';
const COLOR_CORAL  = '#ff6b6b';
const COLOR_BLUE   = '#60a5fa';
const COLOR_PURPLE = '#a78bfa';
const COLOR_YELLOW = '#fbbf24';

interface AnalyticsChartProps {
  data: AnalyticsResult;
  months: number;
}

function monthLabel(year: number, month: number) {
  return `${year}년 ${month}월`;
}

function formatKRW(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 10000) return `${sign}${Math.round(abs / 10000)}만`;
  return `${sign}${formatNumber(abs)}`;
}

function formatPct(value: number) {
  return `${value}%`;
}

const tooltipStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  fontSize: '13px',
  color: 'var(--text-primary)',
};

function ChartLegend({ items }: { items: { label: string; color: string; type: 'rect' | 'line' | 'area' }[] }) {
  return (
    <div className="flex items-center justify-center flex-wrap gap-4 mt-3 text-xs text-text-muted">
      {items.map(({ label, color, type }) => (
        <span key={label} className="flex items-center gap-1">
          {type === 'rect' || type === 'area' ? (
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
          ) : (
            <span className="inline-block w-5 h-0.5 rounded-full" style={{ backgroundColor: color }} />
          )}
          {label}
        </span>
      ))}
    </div>
  );
}

export default function AnalyticsChart({ data, months: selectedMonths }: AnalyticsChartProps) {
  const { months, averages } = data;

  // --- 차트 1: 수입/지출/저축/순저축 ---
  const barData = months.map((m) => ({
    label: monthLabel(m.year, m.month),
    수입: m.income,
    지출: m.expense,
    저축: m.savingsDeposit,
    순저축: m.net,
  }));

  // --- 차트 2: 저축률 트렌드 ---
  const rateData = months.map((m) => ({
    label: monthLabel(m.year, m.month),
    저축률: m.income > 0 ? Math.round((m.savingsDeposit / m.income) * 100) : 0,
  }));

  // --- 차트 3: 누적 순저축 ---
  let cumulative = 0;
  const cumData = months.map((m) => {
    cumulative += m.net;
    return {
      label: monthLabel(m.year, m.month),
      누적순저축: cumulative,
    };
  });

  // --- 차트 4: 수입 대비 구성 비율 ---
  const stackData = months.map((m) => {
    const total = m.income;
    if (total <= 0) return { label: monthLabel(m.year, m.month), 지출: 0, 저축: 0, 잉여: 0 };
    const expPct  = Math.round((m.expense / total) * 100);
    const savPct  = Math.round((m.savingsDeposit / total) * 100);
    const surPct  = Math.max(0, 100 - expPct - savPct);
    return { label: monthLabel(m.year, m.month), 지출: expPct, 저축: savPct, 잉여: surPct };
  });

  // 요약 카드
  const currentMonth = months[months.length - 1];
  const expenseDiff =
    averages.expense > 0
      ? Math.round(((currentMonth.expense - averages.expense) / averages.expense) * 100)
      : 0;
  const peakMonth = months.reduce((max, m) => (m.expense > max.expense ? m : max), months[0]);
  const recentN = months.slice(-selectedMonths);
  const savingsTrend =
    recentN.length >= 2
      ? recentN[recentN.length - 1].savingsDeposit >= recentN[0].savingsDeposit ? '상승' : '하락'
      : '-';
  const avgSavingsRate =
    months.filter((m) => m.income > 0).reduce((sum, m) => sum + m.savingsDeposit / m.income * 100, 0) /
    (months.filter((m) => m.income > 0).length || 1);
  const totalNet = months.reduce((sum, m) => sum + m.net, 0);

  return (
    <div className="flex flex-col gap-6">

      {/* ① 수입 / 지출 / 저축 */}
      <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-4">
          <MdBarChart className="text-accent-blue text-lg sm:text-xl" />
          월별 수입 / 지출 / 저축
        </h2>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatKRW} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={60} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((v: any, n: string) => [`₩${formatNumber(Number(v) || 0)}`, n]) as any}
              contentStyle={tooltipStyle}
            />
            <Bar dataKey="수입"   fill={COLOR_MINT}   radius={[4,4,0,0]} maxBarSize={28} />
            <Bar dataKey="지출"   fill={COLOR_CORAL}  radius={[4,4,0,0]} maxBarSize={28} />
            <Bar dataKey="저축"   fill={COLOR_BLUE}   radius={[4,4,0,0]} maxBarSize={28} />
            <Line type="monotone" dataKey="순저축" stroke={COLOR_PURPLE} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: COLOR_PURPLE }} />
          </ComposedChart>
        </ResponsiveContainer>
        <ChartLegend items={[
          { label: '수입',   color: COLOR_MINT,   type: 'rect' },
          { label: '지출',   color: COLOR_CORAL,  type: 'rect' },
          { label: '저축',   color: COLOR_BLUE,   type: 'rect' },
          { label: '순저축', color: COLOR_PURPLE, type: 'line' },
        ]} />
      </div>

      {/* ② 저축률 트렌드 */}
      <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-4">
          <MdSavings className="text-accent-mint text-lg sm:text-xl" />
          저축률 트렌드
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={rateData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatPct} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={40} domain={[0, 'auto']} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((v: any, n: string) => [`${v}%`, n]) as any}
              contentStyle={tooltipStyle}
            />
            <ReferenceLine y={20} stroke={COLOR_YELLOW} strokeDasharray="4 3" strokeWidth={1.5} label={{ value: '목표 20%', position: 'insideTopRight', fontSize: 11, fill: COLOR_YELLOW }} />
            <Line type="monotone" dataKey="저축률" stroke={COLOR_MINT} strokeWidth={2} dot={{ r: 4, fill: COLOR_MINT }} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <ChartLegend items={[
          { label: '저축률', color: COLOR_MINT,   type: 'line' },
          { label: '목표 20%', color: COLOR_YELLOW, type: 'line' },
        ]} />
      </div>

      {/* ③ 누적 순저축 */}
      <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-4">
          <MdTrendingUp className="text-accent-purple text-lg sm:text-xl" />
          누적 순저축
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={cumData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cumGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={COLOR_PURPLE} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLOR_PURPLE} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatKRW} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={60} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((v: any, n: string) => [`₩${formatNumber(Number(v) || 0)}`, n]) as any}
              contentStyle={tooltipStyle}
            />
            <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
            <Area type="monotone" dataKey="누적순저축" stroke={COLOR_PURPLE} strokeWidth={2} fill="url(#cumGradient)" dot={{ r: 3, fill: COLOR_PURPLE }} />
          </AreaChart>
        </ResponsiveContainer>
        <ChartLegend items={[{ label: '누적 순저축', color: COLOR_PURPLE, type: 'area' }]} />
      </div>

      {/* ④ 수입 대비 구성 비율 */}
      <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-4">
          <MdStackedBarChart className="text-accent-yellow text-lg sm:text-xl" />
          수입 대비 구성 비율
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stackData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatPct} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={40} domain={[0, 100]} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((v: any, n: string) => [`${v}%`, n]) as any}
              contentStyle={tooltipStyle}
            />
            <Bar dataKey="지출" stackId="a" fill={COLOR_CORAL} maxBarSize={40} />
            <Bar dataKey="저축" stackId="a" fill={COLOR_BLUE}  maxBarSize={40} />
            <Bar dataKey="잉여" stackId="a" fill={COLOR_MINT}  radius={[4,4,0,0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
        <ChartLegend items={[
          { label: '지출', color: COLOR_CORAL, type: 'rect' },
          { label: '저축', color: COLOR_BLUE,  type: 'rect' },
          { label: '잉여', color: COLOR_MINT,  type: 'rect' },
        ]} />
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
          <div className="text-xs text-text-muted mb-1">이번 달 지출</div>
          <div className="text-lg font-bold text-text-primary">₩{formatNumber(currentMonth.expense)}</div>
          <div className="text-xs mt-1">
            {expenseDiff > 0 ? (
              <span className="text-accent-coral">평균 대비 +{expenseDiff}% ↗</span>
            ) : expenseDiff < 0 ? (
              <span className="text-accent-mint">평균 대비 {expenseDiff}% ↘</span>
            ) : (
              <span className="text-text-muted">평균과 동일</span>
            )}
          </div>
        </div>

        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
          <div className="text-xs text-text-muted mb-1">최고 지출 월</div>
          <div className="text-lg font-bold text-text-primary">₩{formatNumber(peakMonth.expense)}</div>
          <div className="text-xs text-text-muted mt-1">{peakMonth.year}년 {peakMonth.month}월</div>
        </div>

        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
          <div className="text-xs text-text-muted mb-1">평균 저축률</div>
          <div className="text-lg font-bold text-text-primary">{Math.round(avgSavingsRate)}%</div>
          <div className="text-xs mt-1">
            {savingsTrend === '상승' ? (
              <span className="text-accent-mint">상승 중 ↗</span>
            ) : savingsTrend === '하락' ? (
              <span className="text-accent-coral">하락 중 ↘</span>
            ) : (
              <span className="text-text-muted">-</span>
            )}
          </div>
        </div>

        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
          <div className="text-xs text-text-muted mb-1">{selectedMonths}개월 누적 순저축</div>
          <div className={`text-lg font-bold ${totalNet >= 0 ? 'text-accent-mint' : 'text-accent-coral'}`}>
            {totalNet >= 0 ? '+' : ''}₩{formatNumber(Math.abs(totalNet))}
          </div>
          <div className="text-xs text-text-muted mt-1">
            {totalNet >= 0 ? '흑자' : '적자'}
          </div>
        </div>
      </div>

    </div>
  );
}
