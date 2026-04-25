import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Line as SvgLine, Text as SvgText, G } from 'react-native-svg';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
  dashed?: boolean;
}

export interface MultiLineChartProps {
  width: number;
  height: number;
  labels: string[];
  series: LineSeries[];
  /** Optional reference line value */
  referenceLine?: { value: number; color: string; label?: string };
  formatValue?: (n: number) => string;
}

function formatKRWShort(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1).replace(/\.0$/, '')}억`;
  if (abs >= 10_000) return `${sign}${Math.round(abs / 10_000)}만`;
  return `${sign}${abs}`;
}

export default function MultiLineChart({
  width,
  height,
  labels,
  series,
  referenceLine,
  formatValue = formatKRWShort,
}: MultiLineChartProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const padding = { top: 16, right: 12, bottom: 36, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allValues = [
    ...series.flatMap((s) => s.values),
    referenceLine?.value ?? 0,
    0,
  ];
  const maxVal = Math.max(...allValues);
  const minVal = Math.min(...allValues);
  const range = maxVal - minVal || 1;

  const yToPx = (v: number) => padding.top + ((maxVal - v) / range) * innerH;
  const xCount = labels.length || 1;
  const xStep = xCount > 1 ? innerW / (xCount - 1) : 0;
  const xToPx = (i: number) =>
    xCount === 1 ? padding.left + innerW / 2 : padding.left + i * xStep;

  const yTicks = [0, 0.33, 0.66, 1].map((p) => maxVal - p * range);

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Grid */}
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

        {/* Reference line */}
        {referenceLine && (
          <>
            <SvgLine
              x1={padding.left}
              y1={yToPx(referenceLine.value)}
              x2={padding.left + innerW}
              y2={yToPx(referenceLine.value)}
              stroke={referenceLine.color}
              strokeDasharray="4 3"
              strokeWidth={1.5}
            />
            {referenceLine.label && (
              <SvgText
                x={padding.left + innerW - 4}
                y={yToPx(referenceLine.value) - 4}
                fontSize={10}
                fill={referenceLine.color}
                textAnchor="end"
              >
                {referenceLine.label}
              </SvgText>
            )}
          </>
        )}

        {/* Series */}
        {series.map((s) => {
          const points = s.values.map((v, i) => ({ x: xToPx(i), y: yToPx(v) }));
          const path = points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ');
          return (
            <G key={s.key}>
              <Path
                d={path}
                stroke={s.color}
                strokeWidth={2}
                fill="none"
                strokeDasharray={s.dashed ? '4 3' : undefined}
              />
              {points.map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r={3} fill={s.color} />
              ))}
            </G>
          );
        })}

        {/* X labels */}
        {labels.map((label, i) => (
          <SvgText
            key={i}
            x={xToPx(i)}
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
