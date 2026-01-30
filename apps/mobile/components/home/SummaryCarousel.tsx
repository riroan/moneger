import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { formatNumber } from '@moneger/shared';
import { MaterialIconName } from '../../constants/Icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 20;
const CARD_GAP = 12;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

export interface SummaryCardData {
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

interface SummaryCarouselProps {
  cards: SummaryCardData[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

export function SummaryCarousel({
  cards,
  activeIndex,
  onIndexChange,
}: SummaryCarouselProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const carouselRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SNAP_INTERVAL);
    const newIndex = Math.max(0, Math.min(index, cards.length - 1));
    if (newIndex !== activeIndex) {
      onIndexChange(newIndex);
    }
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      paddingTop: 24,
      paddingHorizontal: 20,
      paddingBottom: 24,
      width: CARD_WIDTH,
      marginRight: CARD_GAP,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    cardIcon: {
      width: 56,
      height: 56,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardInfo: {
      flex: 1,
      alignItems: 'flex-end',
    },
    cardLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    cardAmount: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    cardBadge: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      maxWidth: '100%',
    },
    cardBadgeText: {
      fontSize: 12,
      fontWeight: '500',
    },
    cardBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 4,
    },
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 12,
      gap: 8,
    },
    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    paginationDotActive: {
      backgroundColor: colors.accentMint,
      width: 24,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView
        ref={carouselRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        contentContainerStyle={{
          paddingLeft: CARD_PADDING,
          paddingRight: CARD_PADDING - CARD_GAP,
        }}
      >
        {cards.map((card) => (
          <View key={card.type} style={styles.card}>
            <View style={styles.cardContent}>
              <View style={[styles.cardIcon, { backgroundColor: card.iconBg }]}>
                <MaterialIcons name={card.icon} size={24} color="#fff" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardLabel}>{card.label}</Text>
                <Text
                  style={styles.cardAmount}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {card.isNegative ? '-' : ''}₩{formatNumber(Math.abs(card.amount))}
                </Text>
                <View style={[styles.cardBadge, { backgroundColor: card.badgeBg }]}>
                  <Text
                    style={[styles.cardBadgeText, { color: card.badgeText }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {card.badge}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[styles.cardBar, { backgroundColor: card.barColor }]} />
          </View>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <View style={styles.paginationContainer}>
        {cards.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              activeIndex === index && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}
