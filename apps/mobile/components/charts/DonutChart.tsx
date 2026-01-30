import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { formatNumber } from '@moneger/shared';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';

export interface DonutChartData {
  color: string;
  amount: number;
  name: string;
}

export interface DonutChartProps {
  data: DonutChartData[];
  size?: number;
  strokeWidth?: number;
  totalAmount: number;
  selectedIndex: number | null;
  onSegmentPress: (index: number | null) => void;
  emptyText?: string;
}

export default function DonutChart({
  data,
  size = 140,
  strokeWidth = 20,
  totalAmount,
  selectedIndex,
  onSegmentPress,
  emptyText = '총 지출',
}: DonutChartProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Calculate segment angles and midpoints for touch detection
  const segments: { startAngle: number; endAngle: number }[] = [];
  let currentAngle = -90;

  const paths = data.map((item, index) => {
    const percentage = total > 0 ? item.amount / total : 0;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    segments.push({ startAngle, endAngle });
    currentAngle = endAngle;

    // Convert angles to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Calculate arc path
    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;
    const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

    const isSelected = selectedIndex === index;
    const opacity = selectedIndex === null ? 1 : isSelected ? 1 : 0.3;

    return (
      <Path
        key={index}
        d={d}
        stroke={item.color}
        strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
        fill="none"
        strokeLinecap="butt"
        opacity={opacity}
      />
    );
  });

  const handleChartPress = (evt: { nativeEvent: { locationX: number; locationY: number } }) => {
    const { locationX, locationY } = evt.nativeEvent;

    const dx = locationX - center;
    const dy = locationY - center;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const innerRadius = radius - strokeWidth / 2 - 10;
    const outerRadius = radius + strokeWidth / 2 + 10;

    if (distance < innerRadius || distance > outerRadius) {
      onSegmentPress(null);
      return;
    }

    const touchAngle = Math.atan2(dy, dx) * (180 / Math.PI);

    for (let i = 0; i < segments.length; i++) {
      const { startAngle, endAngle } = segments[i];

      if (startAngle <= touchAngle && touchAngle <= endAngle) {
        onSegmentPress(selectedIndex === i ? null : i);
        return;
      }

      if (endAngle > 180) {
        if (touchAngle >= startAngle || touchAngle <= endAngle - 360) {
          onSegmentPress(selectedIndex === i ? null : i);
          return;
        }
      }
      if (startAngle < -180) {
        if (touchAngle <= endAngle || touchAngle >= startAngle + 360) {
          onSegmentPress(selectedIndex === i ? null : i);
          return;
        }
      }
    }
  };

  const innerDiameter = size - strokeWidth * 2 - 16;
  const centerText =
    selectedIndex !== null && data[selectedIndex]
      ? `₩${formatNumber(data[selectedIndex].amount)}`
      : `₩${formatNumber(totalAmount)}`;
  const centerSubtext =
    selectedIndex !== null && data[selectedIndex] ? data[selectedIndex].name : emptyText;

  const padding = 8;
  const containerSize = size + padding * 2;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={(evt) => {
        const adjustedEvt = {
          nativeEvent: {
            locationX: evt.nativeEvent.locationX - padding,
            locationY: evt.nativeEvent.locationY - padding,
          },
        };
        handleChartPress(adjustedEvt);
      }}
      style={{
        width: containerSize,
        height: containerSize,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={containerSize} height={containerSize} style={{ overflow: 'visible' }}>
        <G transform={`translate(${padding}, ${padding})`}>{paths}</G>
      </Svg>
      <View
        style={{
          position: 'absolute',
          alignItems: 'center',
          width: innerDiameter,
          paddingHorizontal: 4,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.textPrimary,
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {centerText}
        </Text>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
          {centerSubtext}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
