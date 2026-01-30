import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { formatNumber } from '@moneger/shared';
import type { MaterialIconName } from '../../constants/Icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 20;
const CARD_GAP = 12;
export const SUMMARY_CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;
export const SUMMARY_SNAP_INTERVAL = SUMMARY_CARD_WIDTH + CARD_GAP;

interface SummaryCardProps {
  type: 'income' | 'expense' | 'savings' | 'balance';
  label: string;
  amount: number;
  badge: string;
  icon: MaterialIconName;
  iconBg: string;
  barColor: string;
  badgeBg: string;
  badgeText: string;
  isNegative?: boolean;
}

export default function SummaryCard({
  label,
  amount,
  badge,
  icon,
  iconBg,
  barColor,
  badgeBg,
  badgeText,
  isNegative = false,
}: SummaryCardProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      paddingTop: 24,
      paddingHorizontal: 20,
      paddingBottom: 24,
      width: SUMMARY_CARD_WIDTH,
      marginRight: CARD_GAP,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: iconBg,
    },
    info: {
      flex: 1,
      alignItems: 'flex-end',
    },
    label: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    amount: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    badgeContainer: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: badgeBg,
      maxWidth: '100%',
    },
    badgeTextStyle: {
      fontSize: 12,
      fontWeight: '500',
      color: badgeText,
    },
    bar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: barColor,
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons name={icon} size={24} color="#fff" />
        </View>
        <View style={styles.info}>
          <Text style={styles.label}>{label}</Text>
          <Text
            style={styles.amount}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {isNegative ? '-' : ''}₩{formatNumber(Math.abs(amount))}
          </Text>
          <View style={styles.badgeContainer}>
            <Text
              style={styles.badgeTextStyle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {badge}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.bar} />
    </View>
  );
}
