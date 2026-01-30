import { StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

type ColorTheme = (typeof Colors)['dark'] | (typeof Colors)['light'];

export const createFormStyles = (colors: ColorTheme) =>
  StyleSheet.create({
    // Field container
    fieldContainer: {
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
    },

    // Text input
    textInput: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textInputFocused: {
      borderColor: colors.accentBlue,
    },
    textInputError: {
      borderColor: colors.accentCoral,
    },

    // Amount input
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    amountInputContainerExceeded: {
      borderColor: colors.accentCoral,
    },
    currencySymbol: {
      fontSize: 16,
      color: colors.textSecondary,
      marginRight: 4,
    },
    amountInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.textPrimary,
    },
    exceededText: {
      fontSize: 11,
      color: colors.accentCoral,
      marginTop: 4,
    },

    // Toggle / Segmented control
    toggleContainer: {
      flexDirection: 'row',
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 4,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    toggleButtonActive: {
      backgroundColor: colors.bgCard,
    },
    toggleButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },
    toggleButtonTextActive: {
      color: colors.textPrimary,
    },

    // Dropdown
    dropdown: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dropdownHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
    },
    dropdownHeaderText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    dropdownPlaceholder: {
      fontSize: 15,
      color: colors.textMuted,
    },
    dropdownList: {
      maxHeight: 200,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 12,
    },
    dropdownItemSelected: {
      backgroundColor: colors.bgCard,
    },
    dropdownItemText: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
    },
  });
