import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEYS = {
  USER_ID: 'userId',
  USER_NAME: 'userName',
  USER_EMAIL: 'userEmail',
  THEME: 'theme',
};

const SECURE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
};

export const storage = {
  // User
  async getUserId(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
  },
  async setUserId(userId: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
  },
  async getUserName(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.USER_NAME);
  },
  async setUserName(userName: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, userName);
  },
  async getUserEmail(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL);
  },
  async setUserEmail(userEmail: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, userEmail);
  },

  // Session token (암호화 저장 — Authorization: Bearer 헤더로 매 요청 전송)
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
  },
  async setAccessToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(SECURE_KEYS.ACCESS_TOKEN, token);
  },

  // Theme
  async getTheme(): Promise<'dark' | 'light' | null> {
    const theme = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
    return theme as 'dark' | 'light' | null;
  },
  async setTheme(theme: 'dark' | 'light'): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  // Clear all user data (logout)
  async clearUserData(): Promise<void> {
    await Promise.all([
      AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.USER_NAME,
        STORAGE_KEYS.USER_EMAIL,
      ]),
      SecureStore.deleteItemAsync(SECURE_KEYS.ACCESS_TOKEN),
    ]);
  },
};
