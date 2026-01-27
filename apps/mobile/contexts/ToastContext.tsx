import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../stores/themeStore';
import { Colors } from '../constants/Colors';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const TOAST_DURATION = 2500;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ToastItemProps {
  message: ToastMessage;
  onHide: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ message, onHide }) => {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Slide up
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide(message.id);
      });
    }, TOAST_DURATION);

    return () => clearTimeout(timer);
  }, [message.id, onHide, translateY, opacity]);

  const getIconAndColor = () => {
    switch (message.type) {
      case 'success':
        return { icon: 'check-circle' as const, color: '#34D399', bgColor: 'rgba(52, 211, 153, 0.15)' };
      case 'error':
        return { icon: 'error' as const, color: '#F87171', bgColor: 'rgba(248, 113, 113, 0.15)' };
      case 'info':
      default:
        return { icon: 'info' as const, color: '#60A5FA', bgColor: 'rgba(96, 165, 250, 0.15)' };
    }
  };

  const { icon, color, bgColor } = getIconAndColor();

  return (
    <Animated.View
      style={[
        styles.toastItem,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.toastText, { color: colors.textPrimary }]} numberOfLines={2}>
        {message.message}
      </Text>
    </Animated.View>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const insets = useSafeAreaInsets();

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={[styles.container, { bottom: insets.bottom + 60 }]} pointerEvents="box-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} message={toast} onHide={hideToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    width: SCREEN_WIDTH - 32,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});
