import { useState } from 'react';
import { Slot, usePathname, useRouter } from 'expo-router';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { type MaterialIconName } from '../../constants/Icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { TransactionAddModal } from '../../components/modals';

const tabs: { name: string; path: string; title: string; icon: MaterialIconName }[] = [
  { name: 'index', path: '/(tabs)', title: '홈', icon: 'home' },
  { name: 'transactions', path: '/(tabs)/transactions', title: '내역', icon: 'receipt-long' },
  { name: 'add', path: '', title: '', icon: 'add' }, // Center add button placeholder
  { name: 'savings', path: '/(tabs)/savings', title: '저축', icon: 'savings' },
  { name: 'settings', path: '/(tabs)/settings', title: '전체', icon: 'menu' },
];

export default function TabsLayout() {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const pathname = usePathname();
  const router = useRouter();

  const [isModalVisible, setIsModalVisible] = useState(false);

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
      alignItems: 'center',
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabLabel: {
      fontSize: 11,
      fontWeight: '500',
      marginTop: 4,
    },
    addButtonContainer: {
      marginTop: -20,
      shadowColor: '#4AC7A0',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 6,
    },
    addButton: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
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
          // Center add button
          if (tab.name === 'add') {
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.tabItem}
                onPress={() => setIsModalVisible(true)}
              >
                <View style={styles.addButtonContainer}>
                  <LinearGradient
                    colors={['#34D399', '#60A5FA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.addButton}
                  >
                    <MaterialIcons name="add" size={32} color="#fff" />
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            );
          }

          const active = isActive(tab.path);
          const activeColor = '#4AC7A0';
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => router.push(tab.path as any)}
            >
              <MaterialIcons
                name={tab.icon}
                size={24}
                color={active ? activeColor : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? activeColor : colors.textMuted },
                ]}
              >
                {tab.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TransactionAddModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      />
    </View>
  );
}
