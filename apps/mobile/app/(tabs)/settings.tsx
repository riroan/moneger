import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';

export default function SettingsScreen() {
  const router = useRouter();
  const { userName, userEmail, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const colors = Colors[theme];

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    header: {
      padding: 20,
      paddingTop: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    section: {
      padding: 20,
      paddingTop: 0,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: colors.accentMint,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    avatarText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.bgPrimary,
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    profileEmail: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    menuItemFirst: {
      borderTopWidth: 0,
    },
    menuIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    menuText: {
      flex: 1,
      fontSize: 16,
      color: colors.textPrimary,
    },
    menuValue: {
      fontSize: 14,
      color: colors.textMuted,
      marginRight: 8,
    },
    logoutButton: {
      backgroundColor: colors.accentCoral,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 24,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
    },
    version: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 24,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>설정</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>프로필</Text>
          <View style={styles.card}>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(userName || userEmail || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {userName || '닉네임 없음'}
                </Text>
                <Text style={styles.profileEmail}>{userEmail}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 설정</Text>
          <View style={styles.card}>
            <View style={[styles.menuItem, styles.menuItemFirst]}>
              <View style={styles.menuIcon}>
                <Ionicons
                  name={theme === 'dark' ? 'moon' : 'sunny'}
                  size={20}
                  color={colors.accentMint}
                />
              </View>
              <Text style={styles.menuText}>다크 모드</Text>
              <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{
                  false: colors.bgSecondary,
                  true: colors.accentMint,
                }}
                thumbColor="#ffffff"
              />
            </View>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={colors.accentBlue}
                />
              </View>
              <Text style={styles.menuText}>알림 설정</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>정보</Text>
          <View style={styles.card}>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemFirst]}>
              <View style={styles.menuIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={colors.accentPurple}
                />
              </View>
              <Text style={styles.menuText}>이용약관</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={colors.accentPurple}
                />
              </View>
              <Text style={styles.menuText}>개인정보 처리방침</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <View style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colors.textMuted}
                />
              </View>
              <Text style={styles.menuText}>앱 버전</Text>
              <Text style={styles.menuValue}>1.0.0</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>

          <Text style={styles.version}>MONEGER v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
