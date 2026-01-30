import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { useDragToDismiss } from '../../hooks';

interface ModalContainerProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
  maxHeight?: number;
  showHandle?: boolean;
  enableDragToDismiss?: boolean;
}

export default function ModalContainer({
  visible,
  onClose,
  title,
  children,
  footer,
  scrollable = false,
  maxHeight = 500,
  showHandle = true,
  enableDragToDismiss = true,
}: ModalContainerProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const { translateY, panResponder, resetPosition } = useDragToDismiss(() => {
    onClose();
  });

  const handleClose = () => {
    resetPosition();
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'flex-end',
    },
    content: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: insets.bottom || 20,
      maxHeight: '90%',
    },
    handleContainer: {
      paddingTop: 12,
      paddingBottom: 8,
      alignItems: 'center',
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
    },
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
    body: {
      paddingHorizontal: 20,
    },
    bodyScrollable: {
      paddingHorizontal: 20,
      maxHeight,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <Animated.View
              style={[
                styles.content,
                enableDragToDismiss && { transform: [{ translateY }] },
              ]}
            >
              {showHandle && (
                <View
                  {...(enableDragToDismiss ? panResponder.panHandlers : {})}
                  style={styles.handleContainer}
                >
                  <View style={styles.handle} />
                </View>
              )}

              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <MaterialIcons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {scrollable ? (
                <ScrollView style={styles.bodyScrollable} showsVerticalScrollIndicator={false}>
                  {children}
                </ScrollView>
              ) : (
                <View style={styles.body}>{children}</View>
              )}

              {footer && <View style={styles.footer}>{footer}</View>}
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
