import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { Colors } from '../constants/Colors';
import { TERMS_OF_SERVICE, PRIVACY_POLICY, LegalSection, LegalDocument } from '@moneger/shared';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, signup, isLoading } = useAuthStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | null>(null);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) return false;
    const hasNumber = /[0-9]/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return hasNumber && hasLetter && hasSpecial;
  };

  const handleSubmit = async () => {
    setError('');

    if (!email.trim() || !validateEmail(email)) {
      setError('올바른 이메일을 입력해주세요');
      return;
    }

    if (!validatePassword(password)) {
      setError('비밀번호는 8자 이상, 숫자+영문+특수문자 조합이어야 합니다');
      return;
    }

    if (isSignup) {
      if (!name.trim()) {
        setError('닉네임을 입력해주세요');
        return;
      }
      if (password !== passwordConfirm) {
        setError('비밀번호가 일치하지 않습니다');
        return;
      }
      if (!agreeTerms || !agreePrivacy) {
        setError('이용약관과 개인정보 처리방침에 모두 동의해주세요');
        return;
      }

      const result = await signup(email, password, name);
      if (result.success) {
        setIsSignup(false);
        setPassword('');
        setPasswordConfirm('');
        setName('');
        setAgreeTerms(false);
        setAgreePrivacy(false);
        setSuccessMessage('회원가입이 완료되었습니다. 로그인해주세요.');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(result.error || '회원가입에 실패했습니다');
      }
    } else {
      const result = await login(email, password);
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        setError(result.error || '로그인에 실패했습니다');
      }
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    logo: {
      fontSize: 32,
      fontWeight: 'bold',
      textAlign: 'center',
      color: colors.accentMint,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      textAlign: 'center',
      color: colors.textSecondary,
      marginBottom: 24,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.bgSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 16,
    },
    inputError: {
      borderColor: colors.accentCoral,
    },
    errorText: {
      color: colors.accentCoral,
      fontSize: 14,
      marginBottom: 16,
      textAlign: 'center',
    },
    successText: {
      color: colors.accentMint,
      fontSize: 14,
      marginBottom: 16,
      textAlign: 'center',
      backgroundColor: 'rgba(74, 222, 128, 0.1)',
      padding: 12,
      borderRadius: 12,
    },
    button: {
      backgroundColor: colors.accentMint,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.bgPrimary,
    },
    toggleContainer: {
      marginTop: 20,
      alignItems: 'center',
    },
    toggleText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    toggleLink: {
      color: colors.accentMint,
      fontWeight: '500',
    },
    hint: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: -8,
      marginBottom: 16,
    },
    agreementContainer: {
      marginBottom: 16,
      gap: 12,
    },
    agreementRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    checkboxChecked: {
      backgroundColor: colors.accentMint,
      borderColor: colors.accentMint,
    },
    agreementTextContainer: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    agreementText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    agreementLink: {
      fontSize: 13,
      color: colors.accentMint,
      textDecorationLine: 'underline',
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.bgCard,
      marginTop: 60,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    modalCloseButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalContent: {
      flex: 1,
      padding: 20,
    },
    modalDate: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.accentMint + '20',
      borderRadius: 16,
      marginBottom: 16,
    },
    modalDateText: {
      fontSize: 12,
      color: colors.accentMint,
      fontWeight: '500',
    },
    modalIntro: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
      marginBottom: 24,
      padding: 16,
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
    },
    sectionContainer: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionNumber: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.accentMint,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    sectionNumberText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#fff',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    sectionText: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    bulletList: {
      marginLeft: 8,
      marginBottom: 8,
    },
    bulletItem: {
      flexDirection: 'row',
      marginBottom: 6,
    },
    bulletPoint: {
      fontSize: 14,
      color: colors.accentMint,
      marginRight: 8,
    },
    bulletText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    bulletTextBold: {
      fontWeight: '600',
      color: colors.textPrimary,
    },
    warningBox: {
      padding: 14,
      backgroundColor: colors.accentCoral + '15',
      borderWidth: 1,
      borderColor: colors.accentCoral + '30',
      borderRadius: 12,
      marginTop: 8,
      marginBottom: 8,
    },
    warningText: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.accentCoral,
    },
    infoBox: {
      padding: 14,
      backgroundColor: colors.accentMint + '15',
      borderWidth: 1,
      borderColor: colors.accentMint + '30',
      borderRadius: 12,
      marginTop: 8,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.accentMint,
      marginBottom: 4,
    },
    infoText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    tableContainer: {
      marginVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: 'hidden',
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: colors.accentMint + '20',
    },
    tableHeaderCell: {
      flex: 1,
      padding: 12,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    tableHeaderText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.accentMint,
    },
    tableRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    tableCell: {
      flex: 1,
      padding: 12,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      backgroundColor: colors.bgSecondary,
    },
    tableCellText: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    modalFooter: {
      padding: 20,
      paddingBottom: insets.bottom + 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    agreeButton: {
      backgroundColor: colors.accentMint,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    agreeButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.bgPrimary,
    },
  });

  const renderSection = (section: LegalSection, index: number) => (
    <View key={index} style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionNumber}>
          <Text style={styles.sectionNumberText}>{index + 1}</Text>
        </View>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>

      {section.paragraphs?.map((p, i) => (
        <Text key={`p-${i}`} style={styles.sectionText}>{p}</Text>
      ))}

      {section.boldItems && (
        <View style={styles.bulletList}>
          {section.boldItems.map((item, i) => (
            <View key={`bi-${i}`} style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bulletTextBold}>{item.bold}</Text>{item.text}
              </Text>
            </View>
          ))}
        </View>
      )}

      {section.items && (
        <View style={styles.bulletList}>
          {section.items.map((item, i) => (
            <View key={`i-${i}`} style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {section.table && (
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            {section.table.headers.map((header, i) => (
              <View
                key={`th-${i}`}
                style={[
                  styles.tableHeaderCell,
                  i === section.table!.headers.length - 1 && { borderRightWidth: 0 }
                ]}
              >
                <Text style={styles.tableHeaderText}>{header}</Text>
              </View>
            ))}
          </View>
          {section.table.rows.map((row, rowIndex) => (
            <View key={`tr-${rowIndex}`} style={styles.tableRow}>
              {row.map((cell, cellIndex) => (
                <View
                  key={`tc-${cellIndex}`}
                  style={[
                    styles.tableCell,
                    cellIndex === row.length - 1 && { borderRightWidth: 0 }
                  ]}
                >
                  <Text style={styles.tableCellText}>{cell}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {section.warning && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>{section.warning}</Text>
        </View>
      )}

      {section.info && (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>{section.info.title}</Text>
          <Text style={styles.infoText}>{section.info.text}</Text>
        </View>
      )}
    </View>
  );

  const renderLegalModal = (
    document: LegalDocument,
    onAgree: () => void
  ) => (
    <>
      <View style={styles.modalDate}>
        <Text style={styles.modalDateText}>시행일: {document.effectiveDate}</Text>
      </View>
      <Text style={styles.modalIntro}>{document.intro}</Text>
      {document.sections.map((section, index) => renderSection(section, index))}
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.logo}>MONEGER</Text>
          <Text style={styles.subtitle}>
            {isSignup ? '새로운 계정을 만드세요' : '스마트한 가계부 관리'}
          </Text>

          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            placeholder="example@email.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          {isSignup && (
            <>
              <Text style={styles.label}>닉네임</Text>
              <TextInput
                style={styles.input}
                placeholder="홍길동"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </>
          )}

          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {isSignup && (
            <Text style={styles.hint}>8자 이상, 숫자+영문+특수문자 조합</Text>
          )}

          {isSignup && (
            <>
              <Text style={styles.label}>비밀번호 확인</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                secureTextEntry
              />
            </>
          )}

          {isSignup && (
            <View style={styles.agreementContainer}>
              <TouchableOpacity
                style={styles.agreementRow}
                onPress={() => setAgreeTerms(!agreeTerms)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                  {agreeTerms && <MaterialIcons name="check" size={16} color="#fff" />}
                </View>
                <View style={styles.agreementTextContainer}>
                  <TouchableOpacity onPress={() => setActiveModal('terms')}>
                    <Text style={styles.agreementLink}>이용약관</Text>
                  </TouchableOpacity>
                  <Text style={styles.agreementText}>에 동의합니다 (필수)</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.agreementRow}
                onPress={() => setAgreePrivacy(!agreePrivacy)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agreePrivacy && styles.checkboxChecked]}>
                  {agreePrivacy && <MaterialIcons name="check" size={16} color="#fff" />}
                </View>
                <View style={styles.agreementTextContainer}>
                  <Text style={styles.agreementText}>
                    <Text style={styles.agreementLink} onPress={() => setActiveModal('privacy')}>개인정보 처리방침</Text>
                    에 동의합니다 (필수)
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {successMessage ? (
            <Text style={styles.successText}>{successMessage}</Text>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.bgPrimary} />
            ) : (
              <Text style={styles.buttonText}>
                {isSignup ? '회원가입' : '로그인'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleContainer}
            onPress={() => {
              setIsSignup(!isSignup);
              setError('');
              setSuccessMessage('');
              setAgreeTerms(false);
              setAgreePrivacy(false);
            }}
          >
            <Text style={styles.toggleText}>
              {isSignup ? '이미 계정이 있으신가요? ' : '계정이 없으신가요? '}
              <Text style={styles.toggleLink}>
                {isSignup ? '로그인' : '회원가입'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Terms Modal */}
      <Modal
        visible={activeModal === 'terms'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>이용약관</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setActiveModal(null)}
              >
                <MaterialIcons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {renderLegalModal(TERMS_OF_SERVICE, () => setAgreeTerms(true))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.agreeButton}
                onPress={() => {
                  setAgreeTerms(true);
                  setActiveModal(null);
                }}
              >
                <Text style={styles.agreeButtonText}>동의</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal
        visible={activeModal === 'privacy'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>개인정보 처리방침</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setActiveModal(null)}
              >
                <MaterialIcons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {renderLegalModal(PRIVACY_POLICY, () => setAgreePrivacy(true))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.agreeButton}
                onPress={() => {
                  setAgreePrivacy(true);
                  setActiveModal(null);
                }}
              >
                <Text style={styles.agreeButtonText}>동의</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
