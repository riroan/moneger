import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';

interface ProgressBarProps {
  progress: number; // 0 to 100
  height?: number;
  backgroundColor?: string;
  progressColor?: string;
  borderRadius?: number;
}

export default function ProgressBar({
  progress,
  height = 8,
  backgroundColor,
  progressColor,
  borderRadius = 4,
}: ProgressBarProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  const styles = StyleSheet.create({
    container: {
      height,
      backgroundColor: backgroundColor || colors.bgSecondary,
      borderRadius,
      overflow: 'hidden',
    },
    progress: {
      height: '100%',
      width: `${clampedProgress}%`,
      backgroundColor: progressColor || colors.accentMint,
      borderRadius,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.progress} />
    </View>
  );
}
