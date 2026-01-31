import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { Colors } from '../constants/Colors';

// Mock mode - skip login and go directly to tabs
const USE_MOCK_DATA = false;

export default function Index() {
  const router = useRouter();
  const { userId, isInitialized } = useAuthStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const [isReady, setIsReady] = useState(false);

  // Wait for layout to be mounted before navigating
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    if (USE_MOCK_DATA) {
      // Skip login in mock mode
      router.replace('/(tabs)');
      return;
    }

    if (isInitialized) {
      if (userId) {
        router.replace('/(tabs)');
      } else {
        router.replace('/landing');
      }
    }
  }, [isReady, isInitialized, userId]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ActivityIndicator size="large" color={colors.accentMint} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
