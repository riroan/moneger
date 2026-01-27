import { Slot, usePathname, useRouter } from 'expo-router';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';

const tabs = [
  { name: 'index', path: '/(tabs)', title: '홈', icon: 'home' },
  { name: 'budget', path: '/(tabs)/budget', title: '예산', icon: 'wallet' },
  { name: 'savings', path: '/(tabs)/savings', title: '저축', icon: 'trending-up' },
  { name: 'settings', path: '/(tabs)/settings', title: '설정', icon: 'settings' },
] as const;

export default function TabsLayout() {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const pathname = usePathname();
  const router = useRouter();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.bgCard,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      height: 85,
      paddingTop: 10,
      paddingBottom: 25,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabLabel: {
      fontSize: 12,
      fontWeight: '500',
      marginTop: 4,
    },
  });

  const isActive = (path: string) => {
    if (path === '/(tabs)') {
      return pathname === '/' || pathname === '/(tabs)';
    }
    return pathname === path || pathname === path.replace('/(tabs)', '');
  };

  return (
    <View style={styles.container}>
      <Slot />
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => router.push(tab.path as any)}
            >
              <Ionicons
                name={tab.icon as any}
                size={24}
                color={active ? colors.accentMint : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? colors.accentMint : colors.textMuted },
                ]}
              >
                {tab.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
