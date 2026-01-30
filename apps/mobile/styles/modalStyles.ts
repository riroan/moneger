import { StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

type ColorTheme = (typeof Colors)['dark'] | (typeof Colors)['light'];

export const createModalStyles = (colors: ColorTheme) =>
  StyleSheet.create({
    // Overlay
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'flex-end',
    },
    overlayCenter: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },

    // Modal content
    content: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
    },
    contentCenter: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      width: '100%',
      maxWidth: 400,
    },

    // Handle bar
    handle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 8,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    closeButton: {
      padding: 4,
    },

    // Body
    body: {
      paddingHorizontal: 20,
    },
    bodyScrollable: {
      paddingHorizontal: 20,
      maxHeight: 400,
    },

    // Footer / Buttons
    footer: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
      paddingTop: 16,
    },
    button: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPrimary: {
      backgroundColor: colors.accentMint,
    },
    buttonSecondary: {
      backgroundColor: colors.bgSecondary,
    },
    buttonDanger: {
      backgroundColor: colors.accentCoral,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '600',
    },
    buttonTextPrimary: {
      color: '#000',
    },
    buttonTextSecondary: {
      color: colors.textPrimary,
    },
    buttonTextDanger: {
      color: '#fff',
    },
  });
