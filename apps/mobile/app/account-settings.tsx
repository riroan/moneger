import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { useToast } from '../contexts/ToastContext';
import { Colors } from '../constants/Colors';
import { authApi } from '../lib/api';
import { TERMS_OF_SERVICE, PRIVACY_POLICY, LegalSection, LegalDocument } from '@moneger/shared';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export default function AccountSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, userName, userEmail, logout } = useAuthStore();
  const { theme } = useThemeStore();
  const { showToast } = useToast();
  const colors = Colors[theme];

  // Swipe back gesture
  const translateX = useRef(new Animated.Value(0)).current;
  const isNavigatingBack = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, gestureState) => {
        // Only respond to gestures starting from the left edge (within 30px)
        return gestureState.x0 < 30;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes from left edge
        return gestureState.x0 < 30 && gestureState.dx > 10 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD && !isNavigatingBack.current) {
          isNavigatingBack.current = true;
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            router.replace('/(tabs)/settings');
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete account state
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Legal modal state
  const [activeLegalModal, setActiveLegalModal] = useState<'terms' | 'privacy' | null>(null);

  const handleChangePassword = async () => {
    if (!userId) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('모든 필드를 입력해주세요', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('새 비밀번호는 최소 6자 이상이어야 합니다', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('새 비밀번호가 일치하지 않습니다', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authApi.changePassword(userId, currentPassword, newPassword);
      if (res.success) {
        showToast('비밀번호가 변경되었습니다', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(res.error || '비밀번호 변경에 실패했습니다', 'error');
      }
    } catch {
      showToast('비밀번호 변경에 실패했습니다', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId || !deletePassword) {
      showToast('비밀번호를 입력해주세요', 'error');
      return;
    }

    setIsDeletingAccount(true);
    try {
      const res = await authApi.deleteAccount(userId, deletePassword);
      if (res.success) {
        showToast('계정이 삭제되었습니다', 'success');
        await logout();
        router.replace('/login');
      } else {
        showToast(res.error || '계정 삭제에 실패했습니다', 'error');
      }
    } catch {
      showToast('계정 삭제에 실패했습니다', 'error');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    headerSpacer: {
      width: 44,
    },
    section: {
      paddingHorizontal: 16,
      paddingTop: 24,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      marginBottom: 8,
      marginLeft: 4,
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
      borderRadius: 28,
      backgroundColor: colors.accentMint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 24,
      fontWeight: '600',
      color: '#fff',
    },
    profileInfo: {
      flex: 1,
      marginLeft: 16,
    },
    profileName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    profileEmail: {
      fontSize: 14,
      color: colors.textMuted,
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
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    menuText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    formContainer: {
      padding: 16,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 12,
    },
    textInput: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: colors.textPrimary,
    },
    submitButton: {
      backgroundColor: colors.accentMint,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      marginTop: 16,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.bgPrimary,
    },
    dangerCard: {
      backgroundColor: colors.accentCoral + '10',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.accentCoral + '30',
    },
    dangerTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.accentCoral,
      marginBottom: 8,
    },
    dangerText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 16,
    },
    dangerButton: {
      backgroundColor: colors.accentCoral,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    dangerButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    bottomSpacer: {
      height: 40,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 16,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    logoutButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    // Delete Account Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 340,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.accentCoral,
      marginBottom: 8,
    },
    modalText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 16,
    },
    modalInput: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: colors.textPrimary,
      marginBottom: 16,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancelButton: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    modalCancelButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    modalDeleteButton: {
      flex: 1,
      backgroundColor: colors.accentCoral,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    modalDeleteButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    // Legal modal styles
    fullScreenModal: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    fullModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    fullModalBackButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullModalTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    legalModalContent: {
      flex: 1,
      padding: 20,
    },
    legalDateBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.accentMint + '20',
      borderRadius: 16,
      marginBottom: 16,
    },
    legalDateText: {
      fontSize: 12,
      color: colors.accentMint,
      fontWeight: '500',
    },
    legalIntro: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
      marginBottom: 24,
      padding: 16,
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
    },
    legalSectionContainer: {
      marginBottom: 24,
    },
    legalSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    legalSectionNumber: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.accentMint,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    legalSectionNumberText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#fff',
    },
    legalSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    legalSectionText: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    legalBulletList: {
      marginLeft: 8,
      marginBottom: 8,
    },
    legalBulletItem: {
      flexDirection: 'row',
      marginBottom: 6,
    },
    legalBulletPoint: {
      fontSize: 14,
      color: colors.accentMint,
      marginRight: 8,
    },
    legalBulletText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    legalBulletTextBold: {
      fontWeight: '600',
      color: colors.textPrimary,
    },
    legalTableContainer: {
      marginVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: 'hidden',
    },
    legalTableHeader: {
      flexDirection: 'row',
      backgroundColor: colors.accentMint + '20',
    },
    legalTableHeaderCell: {
      flex: 1,
      padding: 12,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    legalTableHeaderText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.accentMint,
    },
    legalTableRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    legalTableCell: {
      flex: 1,
      padding: 12,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      backgroundColor: colors.bgSecondary,
    },
    legalTableCellText: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    legalWarningBox: {
      padding: 14,
      backgroundColor: colors.accentCoral + '15',
      borderWidth: 1,
      borderColor: colors.accentCoral + '30',
      borderRadius: 12,
      marginTop: 8,
      marginBottom: 8,
    },
    legalWarningText: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.accentCoral,
    },
    legalInfoBox: {
      padding: 14,
      backgroundColor: colors.accentMint + '15',
      borderWidth: 1,
      borderColor: colors.accentMint + '30',
      borderRadius: 12,
      marginTop: 8,
    },
    legalInfoTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.accentMint,
      marginBottom: 4,
    },
    legalInfoText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
  });

  function renderLegalContent(document: LegalDocument) {
    return (
      <>
        <View style={styles.legalDateBadge}>
          <Text style={styles.legalDateText}>시행일: {document.effectiveDate}</Text>
        </View>
        <Text style={styles.legalIntro}>{document.intro}</Text>
        {document.sections.map((section, index) => renderLegalSection(section, index))}
      </>
    );
  }

  function renderLegalSection(section: LegalSection, index: number) {
    return (
      <View key={index} style={styles.legalSectionContainer}>
        <View style={styles.legalSectionHeader}>
          <View style={styles.legalSectionNumber}>
            <Text style={styles.legalSectionNumberText}>{index + 1}</Text>
          </View>
          <Text style={styles.legalSectionTitle}>{section.title}</Text>
        </View>

        {section.paragraphs?.map((p, i) => (
          <Text key={`p-${i}`} style={styles.legalSectionText}>{p}</Text>
        ))}

        {section.boldItems && (
          <View style={styles.legalBulletList}>
            {section.boldItems.map((item, i) => (
              <View key={`bi-${i}`} style={styles.legalBulletItem}>
                <Text style={styles.legalBulletPoint}>•</Text>
                <Text style={styles.legalBulletText}>
                  <Text style={styles.legalBulletTextBold}>{item.bold}</Text>{item.text}
                </Text>
              </View>
            ))}
          </View>
        )}

        {section.items && (
          <View style={styles.legalBulletList}>
            {section.items.map((item, i) => (
              <View key={`i-${i}`} style={styles.legalBulletItem}>
                <Text style={styles.legalBulletPoint}>•</Text>
                <Text style={styles.legalBulletText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {section.table && (
          <View style={styles.legalTableContainer}>
            <View style={styles.legalTableHeader}>
              {section.table.headers.map((header, i) => (
                <View
                  key={`th-${i}`}
                  style={[
                    styles.legalTableHeaderCell,
                    i === section.table!.headers.length - 1 && { borderRightWidth: 0 }
                  ]}
                >
                  <Text style={styles.legalTableHeaderText}>{header}</Text>
                </View>
              ))}
            </View>
            {section.table.rows.map((row, rowIndex) => (
              <View key={`tr-${rowIndex}`} style={styles.legalTableRow}>
                {row.map((cell, cellIndex) => (
                  <View
                    key={`tc-${cellIndex}`}
                    style={[
                      styles.legalTableCell,
                      cellIndex === row.length - 1 && { borderRightWidth: 0 }
                    ]}
                  >
                    <Text style={styles.legalTableCellText}>{cell}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {section.warning && (
          <View style={styles.legalWarningBox}>
            <Text style={styles.legalWarningText}>{section.warning}</Text>
          </View>
        )}

        {section.info && (
          <View style={styles.legalInfoBox}>
            <Text style={styles.legalInfoTitle}>{section.info.title}</Text>
            <Text style={styles.legalInfoText}>{section.info.text}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top, transform: [{ translateX }] },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/settings')}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>계정 설정</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
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
          <Text style={styles.sectionTitle}>비밀번호 변경</Text>
          <View style={styles.card}>
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>현재 비밀번호</Text>
              <TextInput
                style={styles.textInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="현재 비밀번호 입력"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />

              <Text style={styles.inputLabel}>새 비밀번호</Text>
              <TextInput
                style={styles.textInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="새 비밀번호 입력 (6자 이상)"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />

              <Text style={styles.inputLabel}>새 비밀번호 확인</Text>
              <TextInput
                style={styles.textInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="새 비밀번호 다시 입력"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.submitButton, isChangingPassword && styles.submitButtonDisabled]}
                onPress={handleChangePassword}
                disabled={isChangingPassword}
              >
                <Text style={styles.submitButtonText}>
                  {isChangingPassword ? '변경 중...' : '비밀번호 변경'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>약관 및 정책</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemFirst]}
              onPress={() => setActiveLegalModal('terms')}
            >
              <View style={styles.menuIcon}>
                <MaterialIcons name="description" size={20} color={colors.accentMint} />
              </View>
              <Text style={styles.menuText}>이용약관</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setActiveLegalModal('privacy')}
            >
              <View style={styles.menuIcon}>
                <MaterialIcons name="shield" size={20} color={colors.accentMint} />
              </View>
              <Text style={styles.menuText}>개인정보 처리방침</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              await logout();
              router.replace('/landing');
            }}
          >
            <MaterialIcons name="logout" size={20} color={colors.textSecondary} />
            <Text style={styles.logoutButtonText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>계정 삭제</Text>
            <Text style={styles.dangerText}>
              계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </Text>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={() => setIsDeleteAccountModalOpen(true)}
            >
              <Text style={styles.dangerButtonText}>계정 삭제</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal
        visible={isDeleteAccountModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsDeleteAccountModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>계정 삭제</Text>
            <Text style={styles.modalText}>
              정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="비밀번호 입력"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setIsDeleteAccountModalOpen(false);
                  setDeletePassword('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                <Text style={styles.modalDeleteButtonText}>
                  {isDeletingAccount ? '삭제 중...' : '삭제'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Legal Document Modal */}
      <Modal
        visible={activeLegalModal !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveLegalModal(null)}
      >
        <View style={styles.fullScreenModal}>
          <View style={styles.fullModalHeader}>
            <TouchableOpacity
              style={styles.fullModalBackButton}
              onPress={() => setActiveLegalModal(null)}
            >
              <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.fullModalTitle}>
              {activeLegalModal === 'terms' ? TERMS_OF_SERVICE.title : PRIVACY_POLICY.title}
            </Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={styles.legalModalContent} showsVerticalScrollIndicator={false}>
            {activeLegalModal && renderLegalContent(
              activeLegalModal === 'terms' ? TERMS_OF_SERVICE : PRIVACY_POLICY
            )}
          </ScrollView>
        </View>
      </Modal>
    </Animated.View>
  );
}
