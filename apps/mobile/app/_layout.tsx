import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { Colors } from '../constants/Colors';
import { ToastProvider } from '../contexts/ToastContext';

export default function RootLayout() {
  const { initAuth } = useAuthStore();
  const { theme, initTheme } = useThemeStore();
  const colors = Colors[theme];

  useEffect(() => {
    initAuth();
    initTheme();
  }, []);

  return (
    <ToastProvider>
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <Slot />
      </View>
    </ToastProvider>
  );
}
