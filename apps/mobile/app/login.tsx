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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { Colors } from '../constants/Colors';

export default function LoginScreen() {
  const router = useRouter();
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

      const result = await signup(email, password, name);
      if (result.success) {
        setIsSignup(false);
        setPassword('');
        setPasswordConfirm('');
        setName('');
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
  });

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
    </KeyboardAvoidingView>
  );
}
