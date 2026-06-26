'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '@moneger/shared';

export interface AssetTrendSnapshot {
  month: string;
  cashKrw: number;
  investmentKrw: number;
  savingsKrw: number;
  otherKrw: number;
  totalAssetKrw: number;
}

const COLORS = {
  cash: '#60a5fa',
  investment: '#8b7cf6',
  savings: '#24b383',
  other: '#9a9a92',
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

function shortMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 100000000) return `${sign}${(abs / 100000000).toFixed(abs >= 1000000000 ? 1 : 2)}억`;
  if (abs >= 10000) return `${sign}${Math.round(abs / 10000).toLocaleString('ko-KR')}만`;
  return `${sign}${Math.round(abs).toLocaleString('ko-KR')}`;
}

function monthLabel(month: string): string {
  const [, m] = month.split('-');
  return `${Number(m)}월`;
}

export default function AssetTrendChart({ snapshots }: { snapshots: AssetTrendSnapshot[] }) {
  const chartData = snapshots.map((snapshot) => ({
    label: monthLabel(snapshot.month),
    현금: snapshot.cashKrw,
    투자: snapshot.investmentKrw,
    저축: snapshot.savingsKrw,
    기타: snapshot.otherKrw,
    총자산: snapshot.totalAssetKrw,
  }));

  return (
    <div className="h-[280px] min-w-0 sm:h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 12, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={shortMoney} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => [money(Number(value ?? 0)), String(name)]}
          />
          <Area type="monotone" dataKey="현금" stackId="asset" stroke={COLORS.cash} fill={COLORS.cash} fillOpacity={0.55} />
          <Area type="monotone" dataKey="투자" stackId="asset" stroke={COLORS.investment} fill={COLORS.investment} fillOpacity={0.55} />
          <Area type="monotone" dataKey="저축" stackId="asset" stroke={COLORS.savings} fill={COLORS.savings} fillOpacity={0.55} />
          <Area type="monotone" dataKey="기타" stackId="asset" stroke={COLORS.other} fill={COLORS.other} fillOpacity={0.45} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
