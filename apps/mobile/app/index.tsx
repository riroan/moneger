import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { Colors } from '../constants/Colors';

export default function Index() {
  const router = useRouter();
  const { userId, isInitialized } = useAuthStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  useEffect(() => {
    if (isInitialized) {
      if (userId) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }
  }, [isInitialized, userId]);

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
