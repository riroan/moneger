import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { formatNumber } from '@moneger/shared';
import { getIconName } from '../../constants/Icons';
import { ProgressBar } from '../common';

interface SavingsGoalCardProps {
  name: string;
  icon: string;
  currentAmount: number;
  targetAmount: number;
  progressPercent: number;
  isPrimary?: boolean;
  compact?: boolean;
  onPress?: () => void;
}

export default function SavingsGoalCard({
  name,
  icon,
  currentAmount,
  targetAmount,
  progressPercent,
  isPrimary = false,
  compact = false,
  onPress,
}: SavingsGoalCardProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const progressColor = progressPercent >= 100
    ? colors.accentMint
    : progressPercent >= 50
    ? colors.accentBlue
    : colors.accentYellow;

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: compact ? 12 : 16,
      borderWidth: 1,
      borderColor: isPrimary ? colors.accentMint : colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: compact ? 8 : 12,
    },
    iconContainer: {
      width: compact ? 36 : 44,
      height: compact ? 36 : 44,
      borderRadius: compact ? 10 : 12,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: compact ? 14 : 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    primaryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    primaryBadgeText: {
      fontSize: 11,
      color: colors.accentMint,
      marginLeft: 4,
    },
    amountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: compact ? 6 : 8,
    },
    currentAmount: {
      fontSize: compact ? 16 : 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    targetAmount: {
      fontSize: compact ? 12 : 13,
      color: colors.textMuted,
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
    },
    progressText: {
      fontSize: 12,
      fontWeight: '600',
      color: progressColor,
    },
  });

  const content = (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialIcons name={getIconName(icon)} size={compact ? 18 : 22} color={colors.accentBlue} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {isPrimary && (
            <View style={styles.primaryBadge}>
              <MaterialIcons name="star" size={12} color={colors.accentMint} />
              <Text style={styles.primaryBadgeText}>대표 목표</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.currentAmount}>₩{formatNumber(currentAmount)}</Text>
        <Text style={styles.targetAmount}>/ ₩{formatNumber(targetAmount)}</Text>
      </View>

      <ProgressBar
        progress={progressPercent}
        height={compact ? 6 : 8}
        progressColor={progressColor}
      />

      <View style={styles.progressRow}>
        <Text style={styles.progressText}>{Math.round(progressPercent)}% 달성</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}
