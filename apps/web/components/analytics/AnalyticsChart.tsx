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
} from 'recharts';
import { MdBarChart } from 'react-icons/md';
import type { AnalyticsResult } from '@/lib/services/analytics.service';
import { formatNumber } from '@/utils/formatters';

// DESIGN.md accent colors
const COLOR_MINT   = '#4ade80';
const COLOR_CORAL  = '#ff6b6b';
const COLOR_BLUE   = '#60a5fa';
const COLOR_PURPLE = '#a78bfa';

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

export default function AnalyticsChart({ data, months: selectedMonths }: AnalyticsChartProps) {
  const { months, averages } = data;

  const chartData = months.map((m) => ({
    label: monthLabel(m.year, m.month),
    수입: m.income,
    지출: m.expense,
    저축: m.savingsDeposit,
    순저축: m.net,
  }));

  // 요약 카드 계산
  const currentMonth = months[months.length - 1];
  const expenseDiff =
    averages.expense > 0
      ? Math.round(((currentMonth.expense - averages.expense) / averages.expense) * 100)
      : 0;

  const peakMonth = months.reduce((max, m) => (m.expense > max.expense ? m : max), months[0]);

  const recentN = months.slice(-selectedMonths);
  const savingsTrend =
    recentN.length >= 2
      ? recentN[recentN.length - 1].savingsDeposit >= recentN[0].savingsDeposit
        ? '상승'
        : '하락'
      : '-';

  return (
    <div className="flex flex-col gap-6">
      {/* 차트 카드 */}
      <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-4">
          <MdBarChart className="text-accent-blue text-lg sm:text-xl" />
          월별 수입 / 지출
        </h2>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatKRW}
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((value: any, name: string) => [`₩${formatNumber(Number(value) || 0)}`, name]) as any}
              contentStyle={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '13px',
                color: 'var(--text-primary)',
              }}
            />
            <Bar dataKey="수입" fill={COLOR_MINT}   radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="지출" fill={COLOR_CORAL}  radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="저축" fill={COLOR_BLUE}   radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Line
              type="monotone"
              dataKey="순저축"
              stroke={COLOR_PURPLE}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3, fill: COLOR_PURPLE }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* 커스텀 범례 */}
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-text-muted">
          {[
            { label: '수입',   color: COLOR_MINT,   type: 'rect' },
            { label: '지출',   color: COLOR_CORAL,  type: 'rect' },
            { label: '저축',   color: COLOR_BLUE,   type: 'rect' },
            { label: '순저축', color: COLOR_PURPLE, type: 'line' },
          ].map(({ label, color, type }) => (
            <span key={label} className="flex items-center gap-1">
              {type === 'rect' ? (
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              ) : (
                <span className="inline-block w-5 h-0.5 rounded-full" style={{ backgroundColor: color }} />
              )}
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* 요약 카드 3개 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 이번 달 지출 vs 평균 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
          <div className="text-xs text-text-muted mb-1">이번 달 지출</div>
          <div className="text-lg font-bold text-text-primary">
            ₩{formatNumber(currentMonth.expense)}
          </div>
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

        {/* 최고 지출 월 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
          <div className="text-xs text-text-muted mb-1">최고 지출 월</div>
          <div className="text-lg font-bold text-text-primary">
            ₩{formatNumber(peakMonth.expense)}
          </div>
          <div className="text-xs text-text-muted mt-1">
            {peakMonth.year}년 {peakMonth.month}월
          </div>
        </div>

        {/* 저축 추세 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
          <div className="text-xs text-text-muted mb-1">최근 {selectedMonths}개월 저축</div>
          <div className="text-lg font-bold text-text-primary">
            ₩{formatNumber(currentMonth.savingsDeposit)}
          </div>
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
      </div>
    </div>
  );
}
