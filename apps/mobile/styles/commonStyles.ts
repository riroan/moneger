import { StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

type ColorTheme = (typeof Colors)['dark'] | (typeof Colors)['light'];

export const createCommonStyles = (colors: ColorTheme) =>
  StyleSheet.create({
    // Container styles
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.bgPrimary,
    },

    // Card styles
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardSection: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 16,
    },

    // Section styles
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
    },

    // Empty states
    emptyState: {
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 8,
      textAlign: 'center',
    },

    // Text styles
    textPrimary: {
      color: colors.textPrimary,
    },
    textSecondary: {
      color: colors.textSecondary,
    },
    textMuted: {
      color: colors.textMuted,
    },

    // Divider
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
  });
