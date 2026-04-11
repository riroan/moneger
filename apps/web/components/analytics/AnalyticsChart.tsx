'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { MdBarChart, MdSavings, MdCategory, MdCalendarViewWeek } from 'react-icons/md';
import type { AnalyticsResult } from '@/lib/services/analytics.service';
import { formatNumber } from '@/utils/formatters';

// DESIGN.md accent colors
const COLOR_MINT   = '#4ade80';
const COLOR_CORAL  = '#ff6b6b';
const COLOR_BLUE   = '#60a5fa';
const COLOR_PURPLE = '#a78bfa';
const COLOR_YELLOW = '#fbbf24';

// 카테고리 fallback 색상 팔레트
const CATEGORY_FALLBACK_COLORS = [
  '#60a5fa', '#f472b6', '#fb923c', '#a78bfa', '#34d399', '#facc15',
];

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
  const { months, averages, monthlyTarget, categoryTrends, dowPattern } = data;

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
    저축액: m.savingsDeposit,
  }));

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

      {/* ② 요일별 지출 패턴 */}
      <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-4">
          <MdCalendarViewWeek className="text-accent-blue text-lg sm:text-xl" />
          요일별 지출 패턴
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={dowPattern} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatKRW} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={60} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((v: any, n: string) => [`₩${formatNumber(Number(v) || 0)}`, n]) as any}
              contentStyle={tooltipStyle}
              itemStyle={{ color: 'var(--text-primary)' }}
            />
            <Bar dataKey="amount" name="지출" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {dowPattern.map((entry) => (
                <Cell
                  key={entry.day}
                  fill={entry.day === '토' || entry.day === '일' ? COLOR_CORAL : COLOR_BLUE}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
        <ChartLegend items={[
          { label: '평일', color: COLOR_BLUE, type: 'rect' },
          { label: '주말', color: COLOR_CORAL, type: 'rect' },
        ]} />
      </div>

      {/* ③ 저축률 트렌드 */}
      <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-4">
          <MdSavings className="text-accent-mint text-lg sm:text-xl" />
          저축률 트렌드
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={rateData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} padding={{ left: 24, right: 24 }} />
            <YAxis tickFormatter={formatKRW} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={60} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((v: any, n: string) => [`₩${formatNumber(Number(v) || 0)}`, n]) as any}
              contentStyle={tooltipStyle}
            />
            {monthlyTarget != null && (
              <ReferenceLine y={monthlyTarget} stroke={COLOR_YELLOW} strokeDasharray="4 3" strokeWidth={1.5} label={{ value: `목표 ${formatKRW(monthlyTarget)}`, position: 'insideTopRight', fontSize: 11, fill: COLOR_YELLOW }} />
            )}
            <Line type="monotone" dataKey="저축액" stroke={COLOR_MINT} strokeWidth={2} dot={{ r: 4, fill: COLOR_MINT }} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <ChartLegend items={[
          { label: '저축액', color: COLOR_MINT, type: 'line' },
          ...(monthlyTarget != null ? [{ label: '목표 저축액', color: COLOR_YELLOW, type: 'line' as const }] : []),
        ]} />
      </div>

      {/* ③ 카테고리별 월간 지출 추이 */}
      {categoryTrends.categories.length > 0 && (
        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-4">
            <MdCategory className="text-accent-coral text-lg sm:text-xl" />
            카테고리별 지출 추이
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={categoryTrends.data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} padding={{ left: 24, right: 24 }} />
              <YAxis tickFormatter={formatKRW} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((v: any, n: string) => [`₩${formatNumber(Number(v) || 0)}`, n]) as any}
                contentStyle={tooltipStyle}
              />
              {categoryTrends.categories.map((cat, i) => (
                <Line
                  key={cat.id}
                  type="monotone"
                  dataKey={cat.name}
                  stroke={cat.color ?? CATEGORY_FALLBACK_COLORS[i % CATEGORY_FALLBACK_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: cat.color ?? CATEGORY_FALLBACK_COLORS[i % CATEGORY_FALLBACK_COLORS.length] }}
                  activeDot={{ r: 4 }}
                />
              ))}
              {categoryTrends.data.some((d) => '기타' in d) && (
                <Line type="monotone" dataKey="기타" stroke="var(--text-muted)" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2 }} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
          <ChartLegend items={[
            ...categoryTrends.categories.map((cat, i) => ({
              label: cat.name,
              color: cat.color ?? CATEGORY_FALLBACK_COLORS[i % CATEGORY_FALLBACK_COLORS.length],
              type: 'line' as const,
            })),
            ...(categoryTrends.data.some((d) => '기타' in d)
              ? [{ label: '기타', color: 'var(--text-muted)', type: 'line' as const }]
              : []),
          ]} />
        </div>
      )}



    </div>
  );
}
