import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../stores/themeStore';
import { Colors } from '../constants/Colors';

export default function LandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const handleStart = () => {
    router.push('/login');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      justifyContent: 'center',
    },
    bottomSection: {
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.bgCard,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    badgeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accentMint,
      marginRight: 8,
    },
    badgeText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    heroTitle: {
      fontSize: 32,
      fontWeight: '800',
      lineHeight: 42,
      marginBottom: 12,
    },
    heroTitleAccent: {
      color: '#34D399',
    },
    heroTitleNormal: {
      color: colors.textPrimary,
    },
    heroDescription: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.textSecondary,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      gap: 8,
      overflow: 'hidden',
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    footerText: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 16,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>당신의 재정 파트너</Text>
        </View>

        <Text style={styles.heroTitle}>
          <Text style={styles.heroTitleAccent}>스마트한</Text>
          {'\n'}
          <Text style={styles.heroTitleNormal}>자산 관리의 시작</Text>
        </Text>

        <Text style={styles.heroDescription}>
          수입과 지출을 한눈에 파악하고, 카테고리별 예산을 설정하여 체계적인 자산 관리를 시작하세요.
        </Text>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity onPress={handleStart} activeOpacity={0.8}>
          <LinearGradient
            colors={['#34D399', '#60A5FA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>무료로 시작하기</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.footerText}>© 2026 MONEGER. All rights reserved.</Text>
      </View>
    </View>
  );
}
