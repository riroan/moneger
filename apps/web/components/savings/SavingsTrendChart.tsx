'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { formatNumber } from '@/utils/formatters';

interface TrendData {
  month: string;
  amount: number;
  cumulative: number;
}

interface SavingsTrendChartProps {
  userId: string;
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  const monthNum = parseInt(m, 10);
  return `${year.slice(2)}년 ${monthNum}월`;
}

function formatAmount(value: number): string {
  if (value >= 10000) {
    return `${Math.round(value / 10000)}만`;
  }
  return formatNumber(value);
}

export default function SavingsTrendChart({ userId }: SavingsTrendChartProps) {
  const [data, setData] = useState<TrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchTrend = useCallback(async () => {
    try {
      setError(false);
      const response = await fetch(`/api/savings/trend?userId=${userId}`);
      if (response.ok) {
        const result = await response.json();
        setData(result.data || []);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTrend();
  }, [fetchTrend]);

  if (isLoading) {
    return (
      <div className="text-center text-text-muted py-8 text-sm">
        로딩 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-text-muted py-8 text-sm">
        데이터를 불러올 수 없습니다
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center text-text-muted py-8 text-sm">
        저축 기록이 없습니다
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }));

  return (
    <div className="w-full h-[280px] sm:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatAmount}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatAmount}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              fontSize: '12px',
            }}
            labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
            formatter={(value: number | undefined, name: string | undefined) => {
              const label = name === 'amount' ? '월 저축' : '누적';
              return [`₩${formatNumber(value ?? 0)}`, label];
            }}
          />
          <Bar
            yAxisId="left"
            dataKey="amount"
            fill="var(--accent-mint)"
            opacity={0.7}
            radius={[4, 4, 0, 0]}
            barSize={data.length > 6 ? 20 : 32}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulative"
            stroke="var(--accent-blue)"
            strokeWidth={2}
            dot={{ fill: 'var(--accent-blue)', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
