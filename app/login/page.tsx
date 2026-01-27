'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // 로그인 상태면 메인 페이지로 리다이렉트
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      router.replace('/');
    } else {
      setIsAuthChecked(true);
    }
  }, [router]);

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [nameError, setNameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordConfirmError, setPasswordConfirmError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreementError, setAgreementError] = useState('');

  // 이메일 유효성 검사
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    if (value && !validateEmail(value)) {
      setEmailError('올바른 이메일 형식이 아닙니다');
    } else {
      setEmailError('');
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);

    if (isSignup && !value.trim()) {
      setNameError('닉네임을 입력해주세요');
    } else {
      setNameError('');
    }
  };

  // 비밀번호 유효성 검사: 8자 이상, 숫자+영문+특수문자 조합
  const validatePassword = (password: string): { valid: boolean; message: string } => {
    if (password.length < 8) {
      return { valid: false, message: '비밀번호는 최소 8자 이상이어야 합니다' };
    }

    const hasNumber = /[0-9]/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasNumber || !hasLetter || !hasSpecial) {
      return { valid: false, message: '숫자, 영문, 특수문자를 모두 포함해야 합니다' };
    }

    return { valid: true, message: '' };
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);

    if (value) {
      const validation = validatePassword(value);
      setPasswordError(validation.valid ? '' : validation.message);
    } else {
      setPasswordError('');
    }

    // 비밀번호 확인 필드도 재검증
    if (passwordConfirm && value !== passwordConfirm) {
      setPasswordConfirmError('비밀번호가 일치하지 않습니다');
    } else {
      setPasswordConfirmError('');
    }
  };

  const handlePasswordConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPasswordConfirm(value);

    if (value && value !== password) {
      setPasswordConfirmError('비밀번호가 일치하지 않습니다');
    } else {
      setPasswordConfirmError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 유효성 검사
    let hasError = false;

    // 이메일 검증
    if (!email.trim()) {
      setEmailError('이메일을 입력해주세요');
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError('올바른 이메일 형식이 아닙니다');
      hasError = true;
    }

    // 닉네임 검증 (회원가입만)
    if (isSignup && !name.trim()) {
      setNameError('닉네임을 입력해주세요');
      hasError = true;
    }

    // 비밀번호 검증
    if (!password) {
      setPasswordError('비밀번호를 입력해주세요');
      hasError = true;
    } else {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        setPasswordError(passwordValidation.message);
        hasError = true;
      }
    }

    // 비밀번호 확인 검증 (회원가입만)
    if (isSignup && !passwordConfirm) {
      setPasswordConfirmError('비밀번호 확인을 입력해주세요');
      hasError = true;
    } else if (isSignup && password !== passwordConfirm) {
      setPasswordConfirmError('비밀번호가 일치하지 않습니다');
      hasError = true;
    }

    // 약관 동의 검증 (회원가입만)
    if (isSignup && (!agreeTerms || !agreePrivacy)) {
      setAgreementError('이용약관과 개인정보 처리방침에 모두 동의해주세요');
      hasError = true;
    } else {
      setAgreementError('');
    }

    if (hasError) {
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
      const body = isSignup
        ? { email, password, name }
        : { email, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '오류가 발생했습니다');
      }

      if (isSignup) {
        // 회원가입 성공 - 로그인 화면으로 전환
        setIsSignup(false);
        setEmail('');
        setPassword('');
        setPasswordConfirm('');
        setName('');
        setError('');
        setEmailError('');
        setNameError('');
        setPasswordError('');
        setPasswordConfirmError('');
        setAgreeTerms(false);
        setAgreePrivacy(false);
        setAgreementError('');
        setSuccessMessage('회원가입이 완료되었습니다. 로그인해주세요.');
        // 3초 후 성공 메시지 제거
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        // 로그인 성공 - userId를 localStorage에 저장하고 메인 페이지로 이동
        localStorage.setItem('userId', data.data.user.id);
        localStorage.setItem('userName', data.data.user.name || '');
        localStorage.setItem('userEmail', data.data.user.email);
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 인증 확인 중에는 아무것도 표시하지 않음
  if (!isAuthChecked) {
    return <div className="min-h-screen bg-bg-primary" />;
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
      <div
        className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[24px] w-full max-w-[calc(100vw-24px)] sm:max-w-md animate-[fadeIn_0.5s_ease-out] py-5 px-4"
      >
        {/* Logo */}
        <div className="flex items-center justify-center mb-5">
          <Image
            src="/logo.svg"
            alt="MONEGER"
            width={64}
            height={64}
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-[12px] sm:rounded-[18px] shadow-[0_8px_32px_var(--glow-mint)]"
          />
        </div>

        {/* Title */}
        <div className="text-center mb-5">
          <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-br from-text-primary to-text-secondary bg-clip-text text-transparent mb-1">
            MONEGER
          </h1>
          <p className="text-text-secondary text-[11px] sm:text-sm">
            {isSignup ? '새로운 계정을 만드세요' : '스마트한 가계부 관리'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Email */}
          <div>
            <label className="block text-[11px] sm:text-sm text-text-secondary font-medium mb-1 pl-0.5">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="example@email.com"
              className={`w-full bg-bg-secondary border rounded-[8px] sm:rounded-[12px] text-text-primary text-sm focus:outline-none transition-colors py-2.5 px-3 ${
                emailError
                  ? 'border-accent-coral focus:border-accent-coral'
                  : 'border-[var(--border)] focus:border-accent-mint'
              }`}
            />
            {emailError && (
              <p className="text-accent-coral text-xs mt-1">
                {emailError}
              </p>
            )}
          </div>

          {/* Name (회원가입 시에만) */}
          {isSignup && (
            <div>
              <label className="block text-[11px] sm:text-sm text-text-secondary font-medium mb-1 pl-0.5">
                닉네임
              </label>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="홍길동"
                className={`w-full bg-bg-secondary border rounded-[8px] sm:rounded-[12px] text-text-primary text-sm focus:outline-none transition-colors py-2.5 px-3 ${
                  nameError
                    ? 'border-accent-coral focus:border-accent-coral'
                    : 'border-[var(--border)] focus:border-accent-mint'
                }`}
              />
              {nameError && (
                <p className="text-accent-coral text-xs mt-1">
                  {nameError}
                </p>
              )}
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-[11px] sm:text-sm text-text-secondary font-medium mb-1 pl-0.5">
              비밀번호
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                className={`w-full bg-bg-secondary border rounded-[8px] sm:rounded-[12px] text-text-primary text-sm focus:outline-none transition-colors py-2.5 pl-3 pr-10 ${
                  passwordError
                    ? 'border-accent-coral focus:border-accent-coral'
                    : 'border-[var(--border)] focus:border-accent-mint'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? (
                  // 눈 뜬 아이콘
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5C7 5 2.73 8.11 1 12.5C2.73 16.89 7 20 12 20C17 20 21.27 16.89 23 12.5C21.27 8.11 17 5 12 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12.5" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  // 눈 감은 아이콘
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12C2 12 5 19 12 19C19 19 22 12 22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            </div>
            {passwordError ? (
              <p className="text-accent-coral text-xs mt-1">
                {passwordError}
              </p>
            ) : isSignup ? (
              <p className="text-[10px] sm:text-xs text-text-muted mt-1">
                8자 이상, 숫자+영문+특수문자 조합
              </p>
            ) : null}
          </div>

          {/* Password Confirm (회원가입 시에만) */}
          {isSignup && (
            <div>
              <label className="block text-[11px] sm:text-sm text-text-secondary font-medium mb-1 pl-0.5">
                비밀번호 확인
              </label>
              <div className="relative">
                <input
                  type={showPasswordConfirm ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={handlePasswordConfirmChange}
                  placeholder="••••••••"
                  className={`w-full bg-bg-secondary border rounded-[8px] sm:rounded-[12px] text-text-primary text-sm focus:outline-none transition-colors py-2.5 pl-3 pr-10 ${
                    passwordConfirmError
                      ? 'border-accent-coral focus:border-accent-coral'
                      : 'border-[var(--border)] focus:border-accent-mint'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                  aria-label={showPasswordConfirm ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  {showPasswordConfirm ? (
                    // 눈 뜬 아이콘
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5C7 5 2.73 8.11 1 12.5C2.73 16.89 7 20 12 20C17 20 21.27 16.89 23 12.5C21.27 8.11 17 5 12 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12.5" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    // 눈 감은 아이콘
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 12C2 12 5 19 12 19C19 19 22 12 22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
              </div>
              {passwordConfirmError && (
                <p className="text-accent-coral text-xs mt-1">
                  {passwordConfirmError}
                </p>
              )}
            </div>
          )}

          {/* Agreement Checkboxes (회원가입 시에만) */}
          {isSignup && (
            <div className="flex flex-col gap-2 mt-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => {
                    setAgreeTerms(e.target.checked);
                    if (e.target.checked && agreePrivacy) setAgreementError('');
                  }}
                  className="mt-0.5 w-4 h-4 accent-accent-mint cursor-pointer"
                />
                <span className="text-[11px] sm:text-xs text-text-secondary">
                  <Link href="/terms" target="_blank" className="text-accent-mint hover:underline">
                    이용약관
                  </Link>
                  에 동의합니다 (필수)
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => {
                    setAgreePrivacy(e.target.checked);
                    if (agreeTerms && e.target.checked) setAgreementError('');
                  }}
                  className="mt-0.5 w-4 h-4 accent-accent-mint cursor-pointer"
                />
                <span className="text-[11px] sm:text-xs text-text-secondary">
                  <Link href="/privacy" target="_blank" className="text-accent-mint hover:underline">
                    개인정보 처리방침
                  </Link>
                  에 동의합니다 (필수)
                </span>
              </label>
              {agreementError && (
                <p className="text-accent-coral text-xs">
                  {agreementError}
                </p>
              )}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-[rgba(16,185,129,0.1)] border border-accent-mint rounded-[8px] sm:rounded-[12px] text-accent-mint text-xs sm:text-sm animate-[fadeIn_0.3s_ease-out] py-2.5 px-3">
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-[rgba(239,68,68,0.1)] border border-accent-coral rounded-[8px] sm:rounded-[12px] text-accent-coral text-xs sm:text-sm py-2.5 px-3">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary font-semibold text-sm rounded-[8px] sm:rounded-[12px] transition-all hover:shadow-[0_8px_32px_var(--glow-mint)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer p-2.5 mt-1"
          >
            {isLoading ? '처리 중...' : isSignup ? '회원가입' : '로그인'}
          </button>
        </form>

        {/* Toggle */}
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError('');
              setEmailError('');
              setNameError('');
              setPasswordError('');
              setPasswordConfirmError('');
              setPasswordConfirm('');
              setShowPassword(false);
              setShowPasswordConfirm(false);
              setAgreeTerms(false);
              setAgreePrivacy(false);
              setAgreementError('');
            }}
            className="text-[11px] sm:text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            {isSignup ? '이미 계정이 있으신가요? ' : '계정이 없으신가요? '}
            <span className="text-accent-mint font-medium">
              {isSignup ? '로그인' : '회원가입'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
