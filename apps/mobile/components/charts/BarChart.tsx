import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line as SvgLine, Text as SvgText, Path, Circle } from 'react-native-svg';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';

export interface BarSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

export interface BarChartProps {
  width: number;
  height: number;
  labels: string[];
  series: BarSeries[];
  /** Optional line series to overlay (e.g. net savings) */
  lineSeries?: { key: string; label: string; color: string; values: number[]; dashed?: boolean };
  formatValue?: (n: number) => string;
}

function formatKRWShort(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1).replace(/\.0$/, '')}억`;
  if (abs >= 10_000) return `${sign}${Math.round(abs / 10_000)}만`;
  return `${sign}${abs}`;
}

/**
 * Grouped bar chart with optional overlay line. Renders SVG with axis labels.
 */
export default function BarChart({
  width,
  height,
  labels,
  series,
  lineSeries,
  formatValue = formatKRWShort,
}: BarChartProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const padding = { top: 16, right: 12, bottom: 36, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allValues = [
    ...series.flatMap((s) => s.values),
    ...(lineSeries?.values ?? []),
    0,
  ];
  const maxVal = Math.max(...allValues);
  const minVal = Math.min(...allValues);
  const range = maxVal - minVal || 1;

  const yToPx = (v: number) => padding.top + ((maxVal - v) / range) * innerH;
  const groupCount = labels.length || 1;
  const groupWidth = innerW / groupCount;
  const seriesCount = series.length || 1;
  const barGap = 2;
  const barWidth = Math.max(2, (groupWidth - barGap * (seriesCount + 1)) / seriesCount);

  // Y-axis ticks (4)
  const yTicks = [0, 0.33, 0.66, 1].map((p) => maxVal - p * range);

  // Line points
  const linePoints = lineSeries
    ? lineSeries.values.map((v, i) => ({
        x: padding.left + i * groupWidth + groupWidth / 2,
        y: yToPx(v),
      }))
    : [];

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Y grid lines and labels */}
        {yTicks.map((v, i) => (
          <React.Fragment key={i}>
            <SvgLine
              x1={padding.left}
              y1={yToPx(v)}
              x2={padding.left + innerW}
              y2={yToPx(v)}
              stroke={colors.border}
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <SvgText
              x={padding.left - 6}
              y={yToPx(v) + 3}
              fontSize={10}
              fill={colors.textMuted}
              textAnchor="end"
            >
              {formatValue(v)}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Bars */}
        {labels.map((label, gi) => {
          const groupX = padding.left + gi * groupWidth;
          return series.map((s, si) => {
            const v = s.values[gi] ?? 0;
            const barX = groupX + barGap + si * (barWidth + barGap);
            const barTopY = yToPx(Math.max(v, 0));
            const baseY = yToPx(0);
            const barH = Math.max(0, baseY - barTopY);
            return (
              <Rect
                key={`${gi}-${s.key}`}
                x={barX}
                y={barTopY}
                width={barWidth}
                height={barH}
                rx={3}
                ry={3}
                fill={s.color}
              />
            );
          });
        })}

        {/* Overlay line */}
        {linePoints.length > 1 && lineSeries && (
          <>
            <Path
              d={linePoints
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                .join(' ')}
              stroke={lineSeries.color}
              strokeWidth={2}
              strokeDasharray={lineSeries.dashed ? '5 4' : undefined}
              fill="none"
            />
            {linePoints.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={3} fill={lineSeries.color} />
            ))}
          </>
        )}

        {/* X labels */}
        {labels.map((label, gi) => (
          <SvgText
            key={gi}
            x={padding.left + gi * groupWidth + groupWidth / 2}
            y={padding.top + innerH + 16}
            fontSize={10}
            fill={colors.textMuted}
            textAnchor="middle"
          >
            {label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({});
