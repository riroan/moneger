import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, PanResponder, GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import Svg, { Path, Circle, Line, G, Text as SvgText, Rect } from 'react-native-svg';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { getKSTDateParts, formatNumber } from '@moneger/shared';

interface DataPoint {
  date: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  width: number;
  height: number;
  lineColor?: string;
  fillColor?: string;
  showDots?: boolean;
  showLabels?: boolean;
  formatValue?: (value: number) => string;
  formatLabel?: (date: string) => string;
  selectedIndex?: number | null;
  onSelectIndex?: (index: number | null) => void;
}

export default function LineChart({
  data,
  width,
  height,
  lineColor,
  fillColor,
  showDots = true,
  showLabels = true,
  formatValue = (v) => `₩${formatNumber(Math.abs(v))}`,
  formatLabel = (d) => {
    const { month, day } = getKSTDateParts(new Date(d));
    return `${month}/${day}`;
  },
  selectedIndex: controlledSelectedIndex,
  onSelectIndex,
}: LineChartProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const [internalSelectedIndex, setInternalSelectedIndex] = useState<number | null>(null);

  // Use controlled or internal state
  const selectedIndex = controlledSelectedIndex !== undefined ? controlledSelectedIndex : internalSelectedIndex;

  const chartLineColor = lineColor || colors.accentMint;
  const chartFillColor = fillColor || (chartLineColor + '20');

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          데이터가 없습니다
        </Text>
      </View>
    );
  }

  const padding = { top: 45, right: 10, bottom: 30, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  // Add some padding to the value range
  const paddedMin = minValue - valueRange * 0.1;
  const paddedMax = maxValue + valueRange * 0.1;
  const paddedRange = paddedMax - paddedMin;

  const getX = (index: number) => {
    if (data.length === 1) return chartWidth / 2;
    return (index / (data.length - 1)) * chartWidth;
  };

  const getY = (value: number) => {
    return chartHeight - ((value - paddedMin) / paddedRange) * chartHeight;
  };

  // Generate smooth curve path using cubic bezier
  const generateSmoothPath = () => {
    if (data.length < 2) {
      const x = getX(0);
      const y = getY(data[0].value);
      return `M ${x} ${y}`;
    }

    const points = data.map((d, i) => ({
      x: getX(i),
      y: getY(d.value),
    }));

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      // Calculate control points for smooth curve
      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return path;
  };

  // Generate fill path (area under the curve)
  const generateFillPath = () => {
    const linePath = generateSmoothPath();
    const lastX = getX(data.length - 1);
    const firstX = getX(0);
    return `${linePath} L ${lastX} ${chartHeight} L ${firstX} ${chartHeight} Z`;
  };

  const linePath = generateSmoothPath();
  const fillPath = generateFillPath();

  // Determine which points to show labels for
  const labelIndices = data.length <= 7
    ? data.map((_, i) => i)
    : [0, Math.floor(data.length / 2), data.length - 1];

  // Store the view's x position for accurate touch calculation
  const viewXRef = useRef(0);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    event.target.measure((x, y, w, h, pageX, pageY) => {
      viewXRef.current = pageX;
    });
  }, []);

  // Calculate index from x position (relative to view)
  const getIndexFromX = useCallback((relativeX: number) => {
    const adjustedX = relativeX - padding.left;
    if (data.length === 1) return 0;
    const index = Math.round((adjustedX / chartWidth) * (data.length - 1));
    return Math.max(0, Math.min(data.length - 1, index));
  }, [data.length, chartWidth, padding.left]);

  // Handle pan gesture for sliding
  const handlePanMove = useCallback((pageX: number) => {
    const relativeX = pageX - viewXRef.current;
    const index = getIndexFromX(relativeX);
    if (onSelectIndex) {
      onSelectIndex(index);
    } else {
      setInternalSelectedIndex(index);
    }
  }, [getIndexFromX, onSelectIndex]);

  // Use refs to store the latest handlers so PanResponder can access them
  const handlePanMoveRef = useRef(handlePanMove);
  handlePanMoveRef.current = handlePanMove;

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        handlePanMoveRef.current(evt.nativeEvent.pageX);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        handlePanMoveRef.current(evt.nativeEvent.pageX);
      },
    }),
    []
  );

  const selectedPoint = selectedIndex !== null ? data[selectedIndex] : null;
  const selectedX = selectedIndex !== null ? getX(selectedIndex) : 0;
  const selectedY = selectedIndex !== null ? getY(selectedPoint!.value) : 0;

  // Calculate tooltip position to keep it within bounds
  const tooltipWidth = 120;
  const tooltipHeight = 42;
  const getTooltipX = () => {
    if (selectedIndex === null) return 0;
    const x = selectedX;
    // Clamp tooltip to stay within chart boundaries
    const minX = tooltipWidth / 2;
    const maxX = chartWidth - tooltipWidth / 2;
    return Math.max(minX, Math.min(maxX, x));
  };
  const tooltipX = getTooltipX();

  // Format date for tooltip
  const getTooltipDate = () => {
    if (selectedPoint === null) return '';
    const { month, day } = getKSTDateParts(new Date(selectedPoint.date));
    return `${month}월 ${day}일`;
  };

  // Format balance for tooltip
  const getTooltipBalance = () => {
    if (selectedPoint === null) return '';
    const value = selectedPoint.value;
    const sign = value >= 0 ? '+' : '-';
    return `${sign}₩${formatNumber(Math.abs(value))}`;
  };

  return (
    <View style={{ width, height }} onLayout={handleLayout}>
      <Svg width={width} height={height}>
        <G x={padding.left} y={padding.top}>
          {/* Grid line at zero if it's in range */}
          {paddedMin <= 0 && paddedMax >= 0 && (
            <Line
              x1={0}
              y1={getY(0)}
              x2={chartWidth}
              y2={getY(0)}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          )}

          {/* Fill area */}
          <Path
            d={fillPath}
            fill={chartFillColor}
          />

          {/* Line */}
          <Path
            d={linePath}
            stroke={chartLineColor}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Selected indicator line */}
          {selectedIndex !== null && (
            <>
              <Line
                x1={selectedX}
                y1={0}
                x2={selectedX}
                y2={chartHeight}
                stroke={colors.textMuted}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              {/* Value tooltip background */}
              <Rect
                x={tooltipX - tooltipWidth / 2}
                y={-tooltipHeight}
                width={tooltipWidth}
                height={tooltipHeight}
                rx={10}
                fill={colors.bgCard}
                stroke={colors.border}
                strokeWidth={1}
              />
              {/* Date text */}
              <SvgText
                x={tooltipX}
                y={-tooltipHeight + 16}
                fontSize={11}
                fill={colors.textMuted}
                textAnchor="middle"
              >
                {getTooltipDate()}
              </SvgText>
              {/* Balance value text */}
              <SvgText
                x={tooltipX}
                y={-tooltipHeight + 34}
                fontSize={13}
                fontWeight="bold"
                fill={selectedPoint!.value >= 0 ? colors.accentMint : colors.accentCoral}
                textAnchor="middle"
              >
                {getTooltipBalance()}
              </SvgText>
            </>
          )}

          {/* Dots */}
          {showDots && data.map((point, index) => (
            <Circle
              key={index}
              cx={getX(index)}
              cy={getY(point.value)}
              r={selectedIndex === index ? 6 : 4}
              fill={selectedIndex === index ? chartLineColor : colors.bgCard}
              stroke={chartLineColor}
              strokeWidth={2}
            />
          ))}

          {/* Labels */}
          {showLabels && labelIndices.map((index) => (
            <SvgText
              key={`label-${index}`}
              x={getX(index)}
              y={chartHeight + 18}
              fontSize={10}
              fill={selectedIndex === index ? colors.textPrimary : colors.textMuted}
              fontWeight={selectedIndex === index ? '600' : '400'}
              textAnchor="middle"
            >
              {formatLabel(data[index].date)}
            </SvgText>
          ))}
        </G>
      </Svg>
      {/* Transparent overlay to capture all touch events - covers entire chart including tooltip area */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        {...panResponder.panHandlers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
