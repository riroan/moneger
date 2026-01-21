'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

type SettingTab = 'account' | 'category';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SettingTab>('account');

  // 카테고리 관리
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [isDeleteCategoryConfirmOpen, setIsDeleteCategoryConfirmOpen] = useState(false);

  // 폼 상태
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [categoryIcon, setCategoryIcon] = useState('📦');
  const [categoryColor, setCategoryColor] = useState('#EF4444');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 에러 상태
  const [nameError, setNameError] = useState('');

  // 비밀번호 변경 상태
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 계정 삭제 상태
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // 프로필 메뉴 상태
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // 인증 확인
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedUserName = localStorage.getItem('userName');
    const storedUserEmail = localStorage.getItem('userEmail');

    if (!storedUserId) {
      router.push('/login');
      return;
    }

    setUserId(storedUserId);
    setUserName(storedUserName || '');
    setUserEmail(storedUserEmail || '');
    setIsLoading(false);
  }, [router]);

  // 카테고리 목록 가져오기
  useEffect(() => {
    if (!userId) return;

    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const response = await fetch(`/api/categories?userId=${userId}`);
        const data = await response.json();

        if (data.success) {
          setCategories(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [userId]);

  // 프로필 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 모달이 열렸을 때 body 스크롤 비활성화
  useEffect(() => {
    if (isAddCategoryModalOpen || isEditCategoryModalOpen || isDeleteCategoryConfirmOpen || isDeleteAccountModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAddCategoryModalOpen, isEditCategoryModalOpen, isDeleteCategoryConfirmOpen, isDeleteAccountModalOpen]);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    router.push('/login');
  };

  // 비밀번호 변경
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!userId) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('모든 필드를 입력해주세요');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('새 비밀번호는 최소 6자 이상이어야 합니다');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '비밀번호 변경에 실패했습니다');
      }

      setPasswordSuccess('비밀번호가 변경되었습니다');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : '비밀번호 변경에 실패했습니다');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // 계정 삭제
  const handleDeleteAccount = async () => {
    if (!userId) return;

    if (!deletePassword) {
      setDeleteError('비밀번호를 입력해주세요');
      return;
    }

    setIsDeletingAccount(true);
    setDeleteError('');

    try {
      const response = await fetch('/api/auth/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          password: deletePassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '계정 삭제에 실패했습니다');
      }

      // 성공 시 로그아웃 처리
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      router.push('/login');
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : '계정 삭제에 실패했습니다');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // 카테고리 추가
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) return;

    // 카테고리 개수 제한 (최대 20개)
    const currentTypeCategories = categories.filter(c => c.type === categoryType);
    if (currentTypeCategories.length >= 20) {
      setNameError(`${categoryType === 'INCOME' ? '수입' : '지출'} 카테고리는 최대 20개까지만 추가할 수 있습니다`);
      return;
    }

    // 유효성 검사
    if (!categoryName || categoryName.trim() === '') {
      setNameError('카테고리 이름을 입력해주세요');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          name: categoryName,
          type: categoryType,
          icon: categoryIcon,
          color: categoryColor,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '카테고리 추가에 실패했습니다');
      }

      // 성공 시 모달 닫고 폼 리셋
      setIsAddCategoryModalOpen(false);
      setCategoryName('');
      setCategoryType('EXPENSE');
      setCategoryIcon('📦');
      setCategoryColor('#EF4444');
      setNameError('');

      // 카테고리 목록 새로고침
      const categoriesResponse = await fetch(`/api/categories?userId=${userId}`);
      const categoriesData = await categoriesResponse.json();
      if (categoriesData.success) {
        setCategories(categoriesData.data);
      }
    } catch (error) {
      console.error('Failed to create category:', error);
      alert(error instanceof Error ? error.message : '카테고리 추가에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 카테고리 수정
  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !editingCategory) return;

    // 유효성 검사
    if (!categoryName || categoryName.trim() === '') {
      setNameError('카테고리 이름을 입력해주세요');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          name: categoryName,
          icon: categoryIcon,
          color: categoryColor,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '카테고리 수정에 실패했습니다');
      }

      // 성공 시 모달 닫고 폼 리셋
      setIsEditCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryName('');
      setCategoryType('EXPENSE');
      setCategoryIcon('📦');
      setCategoryColor('#EF4444');
      setNameError('');

      // 카테고리 목록 새로고침
      const categoriesResponse = await fetch(`/api/categories?userId=${userId}`);
      const categoriesData = await categoriesResponse.json();
      if (categoriesData.success) {
        setCategories(categoriesData.data);
      }
    } catch (error) {
      console.error('Failed to update category:', error);
      alert(error instanceof Error ? error.message : '카테고리 수정에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 카테고리 삭제
  const handleDeleteCategory = async () => {
    if (!userId || !editingCategory) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '카테고리 삭제에 실패했습니다');
      }

      // 성공 시 모달 닫고 폼 리셋
      setIsDeleteCategoryConfirmOpen(false);
      setIsEditCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryName('');
      setCategoryType('EXPENSE');
      setCategoryIcon('📦');
      setCategoryColor('#EF4444');
      setNameError('');

      // 카테고리 목록 새로고침
      const categoriesResponse = await fetch(`/api/categories?userId=${userId}`);
      const categoriesData = await categoriesResponse.json();
      if (categoriesData.success) {
        setCategories(categoriesData.data);
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert(error instanceof Error ? error.message : '카테고리 삭제에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 아이콘 목록
  const iconList = ['⭐', '📦', '🍽️', '🚗', '🏠', '💼', '🎮', '🎬', '🛒', '💰', '💳', '🏥', '📚', '✈️', '🎁', '☕', '🍔', '🧑', '❤️', '🛍️', '💸', '🎵', '🏋️', '🐾'];

  // 색상 목록
  const colorList = [
    { name: '빨강', value: '#EF4444' },
    { name: '주황', value: '#F97316' },
    { name: '노랑', value: '#FBBF24' },
    { name: '초록', value: '#10B981' },
    { name: '파랑', value: '#3B82F6' },
    { name: '보라', value: '#A855F7' },
    { name: '분홍', value: '#EC4899' },
    { name: '회색', value: '#6B7280' },
  ];

  // 로딩 중일 때는 빈 화면 표시
  if (isLoading) {
    return null;
  }

  const incomeCategories = categories.filter(cat => cat.type === 'INCOME');
  const expenseCategories = categories.filter(cat => cat.type === 'EXPENSE');

  return (
    <>
      <div className="noise-overlay" />
      <div className="gradient-orb orb-1" />
      <div className="gradient-orb orb-2" />

      <div className="relative z-10" style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>
        {/* Header */}
        <header className="animate-[fadeInUp_0.5s_ease-out]" style={{ marginBottom: '24px' }}>
          <div className="flex justify-between items-center">
            <div
              className="flex items-center gap-2 sm:gap-3 cursor-pointer"
              onClick={() => router.push('/')}
            >
              <Image
                src="/logo.svg"
                alt="MONEGER"
                width={48}
                height={48}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] sm:rounded-[14px] shadow-[0_8px_32px_var(--glow-mint)]"
              />
              <span className="hidden sm:block text-xl sm:text-2xl font-bold bg-gradient-to-br from-text-primary to-text-secondary bg-clip-text text-transparent tracking-tight">
                MONEGER
              </span>
            </div>
            <div ref={profileMenuRef} className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-accent-purple to-accent-coral flex items-center justify-center font-semibold text-sm sm:text-base cursor-pointer transition-transform hover:scale-105"
              >
                {userName ? userName.charAt(0) : (userEmail ? userEmail.charAt(0) : '?')}
              </button>

              {/* Profile Menu Dropdown */}
              {isProfileMenuOpen && (
                <div
                  className="absolute top-full right-0 bg-bg-card border border-[var(--border)] rounded-[12px] overflow-hidden select-none z-[300]"
                  style={{
                    marginTop: '8px',
                    minWidth: '180px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <div className="border-b border-[var(--border)]" style={{ padding: '12px 14px' }}>
                    <div className="font-semibold text-text-primary" style={{ fontSize: '14px' }}>{userName || '사용자'}</div>
                    <div className="text-text-secondary" style={{ fontSize: '12px', marginTop: '2px' }}>{userEmail}</div>
                  </div>
                  <div style={{ padding: '6px 0' }}>
                    <div
                      className="flex items-center justify-between text-text-primary"
                      style={{ padding: '10px 14px', fontSize: '14px' }}
                    >
                      <span>{theme === 'dark' ? '🌙 다크 모드' : '☀️ 라이트 모드'}</span>
                      <button
                        onClick={toggleTheme}
                        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                          theme === 'dark' ? 'bg-accent-purple' : 'bg-accent-mint'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            theme === 'dark' ? 'left-0.5' : 'translate-x-5 left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                    <button
                      className="w-full text-left text-text-primary hover:bg-bg-card-hover transition-colors cursor-pointer"
                      style={{ padding: '10px 14px', fontSize: '14px' }}
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        router.push('/');
                      }}
                    >
                      🏠 대시보드
                    </button>
                    <button
                      className="w-full text-left text-text-primary hover:bg-bg-card-hover transition-colors cursor-pointer"
                      style={{ padding: '10px 14px', fontSize: '14px' }}
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      🚪 로그아웃
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content with Sidebar */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          {/* Mobile Tab Bar */}
          <div className="md:hidden animate-[fadeInUp_0.6s_ease-out]">
            <nav className="flex gap-2 bg-bg-card border border-[var(--border)] rounded-[12px] p-1">
              <button
                onClick={() => setActiveTab('account')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-[10px] transition-all cursor-pointer ${
                  activeTab === 'account'
                    ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                    : 'text-text-secondary'
                }`}
                style={{ padding: '10px 12px' }}
              >
                <span className="text-base">👤</span>
                <span className="font-medium text-sm">계정</span>
              </button>
              <button
                onClick={() => setActiveTab('category')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-[10px] transition-all cursor-pointer ${
                  activeTab === 'category'
                    ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                    : 'text-text-secondary'
                }`}
                style={{ padding: '10px 12px' }}
              >
                <span className="text-base">📂</span>
                <span className="font-medium text-sm">카테고리</span>
              </button>
            </nav>
          </div>

          {/* Desktop Sidebar */}
          <aside className="hidden md:block animate-[fadeInUp_0.6s_ease-out]" style={{ width: '240px', flexShrink: 0 }}>
            <nav className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab('account')}
                className={`flex items-center gap-3 rounded-[12px] text-left transition-all cursor-pointer ${
                  activeTab === 'account'
                    ? 'bg-bg-card border border-[var(--border)] text-text-primary'
                    : 'text-text-secondary hover:bg-bg-card-hover'
                }`}
                style={{ padding: '14px 16px' }}
              >
                <span className="text-xl">👤</span>
                <span className="font-medium" style={{ fontSize: '16px' }}>계정</span>
              </button>
              <button
                onClick={() => setActiveTab('category')}
                className={`flex items-center gap-3 rounded-[12px] text-left transition-all cursor-pointer ${
                  activeTab === 'category'
                    ? 'bg-bg-card border border-[var(--border)] text-text-primary'
                    : 'text-text-secondary hover:bg-bg-card-hover'
                }`}
                style={{ padding: '14px 16px' }}
              >
                <span className="text-xl">📂</span>
                <span className="font-medium" style={{ fontSize: '16px' }}>카테고리</span>
              </button>
            </nav>
          </aside>

          {/* Content Area */}
          <main className="flex-1 animate-[fadeInUp_0.7s_ease-out]">
            {activeTab === 'account' && (
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary" style={{ marginBottom: '6px' }}>
                  계정
                </h1>
                <p className="text-sm sm:text-base text-text-secondary" style={{ marginBottom: '16px' }}>
                  계정 정보를 확인하고 관리합니다.
                </p>

                <div className="flex flex-col" style={{ gap: '16px' }}>
                  {/* 프로필 정보 */}
                  <div className="bg-bg-card border border-[var(--border)] rounded-[14px] sm:rounded-[16px]" style={{ padding: '16px' }}>
                    <h2 className="text-base sm:text-lg font-semibold" style={{ marginBottom: '16px' }}>프로필 정보</h2>
                    <div className="flex flex-col" style={{ gap: '20px' }}>
                      <div>
                        <div className="text-sm text-text-muted" style={{ marginBottom: '6px' }}>이름</div>
                        <div className="text-base text-text-primary font-medium">{userName || '이름 없음'}</div>
                      </div>
                      <div className="border-t border-[var(--border)]" />
                      <div>
                        <div className="text-sm text-text-muted" style={{ marginBottom: '6px' }}>이메일</div>
                        <div className="text-base text-text-primary font-medium">{userEmail}</div>
                      </div>
                    </div>
                  </div>

                  {/* 비밀번호 변경 */}
                  <div className="bg-bg-card border border-[var(--border)] rounded-[14px] sm:rounded-[16px]" style={{ padding: '16px' }}>
                    <h2 className="text-base sm:text-lg font-semibold" style={{ marginBottom: '16px' }}>비밀번호 변경</h2>
                    <form onSubmit={handleChangePassword}>
                      <div className="flex flex-col" style={{ gap: '16px' }}>
                        <div>
                          <label className="block text-sm text-text-muted" style={{ marginBottom: '8px' }}>
                            현재 비밀번호
                          </label>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => {
                              setCurrentPassword(e.target.value);
                              setPasswordError('');
                              setPasswordSuccess('');
                            }}
                            className="w-full bg-bg-secondary border border-[var(--border)] rounded-[10px] text-text-primary text-sm sm:text-base focus:outline-none focus:border-accent-blue transition-colors"
                            style={{ padding: '10px 12px' }}
                            placeholder="현재 비밀번호 입력"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-text-muted" style={{ marginBottom: '8px' }}>
                            새 비밀번호
                          </label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value);
                              setPasswordError('');
                              setPasswordSuccess('');
                            }}
                            className="w-full bg-bg-secondary border border-[var(--border)] rounded-[10px] text-text-primary text-sm sm:text-base focus:outline-none focus:border-accent-blue transition-colors"
                            style={{ padding: '10px 12px' }}
                            placeholder="새 비밀번호 입력 (6자 이상)"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-text-muted" style={{ marginBottom: '8px' }}>
                            새 비밀번호 확인
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              setPasswordError('');
                              setPasswordSuccess('');
                            }}
                            className="w-full bg-bg-secondary border border-[var(--border)] rounded-[10px] text-text-primary text-sm sm:text-base focus:outline-none focus:border-accent-blue transition-colors"
                            style={{ padding: '10px 12px' }}
                            placeholder="새 비밀번호 다시 입력"
                          />
                        </div>
                        {passwordError && (
                          <p className="text-accent-coral text-sm">{passwordError}</p>
                        )}
                        {passwordSuccess && (
                          <p className="text-accent-mint text-sm">{passwordSuccess}</p>
                        )}
                        <div style={{ marginTop: '4px' }}>
                          <button
                            type="submit"
                            disabled={isChangingPassword}
                            className="w-full sm:w-auto bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary rounded-[10px] font-medium text-sm sm:text-base hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ padding: '12px 24px' }}
                          >
                            {isChangingPassword ? '변경 중...' : '비밀번호 변경'}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* 계정 삭제 */}
                  <div className="bg-bg-card border border-accent-coral/30 rounded-[14px] sm:rounded-[16px]" style={{ padding: '16px' }}>
                    <h2 className="text-base sm:text-lg font-semibold text-accent-coral" style={{ marginBottom: '6px' }}>계정 삭제</h2>
                    <p className="text-xs sm:text-sm text-text-secondary" style={{ marginBottom: '16px' }}>
                      계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                    </p>
                    <button
                      onClick={() => setIsDeleteAccountModalOpen(true)}
                      className="w-full sm:w-auto bg-accent-coral text-white rounded-[10px] font-medium text-sm sm:text-base hover:shadow-lg transition-all cursor-pointer"
                      style={{ padding: '12px 24px' }}
                    >
                      계정 삭제
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'category' && (
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary" style={{ marginBottom: '6px' }}>
                  카테고리
                </h1>
                <p className="text-sm sm:text-base text-text-secondary" style={{ marginBottom: '16px' }}>
                  수입과 지출 카테고리를 관리합니다.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
                  {/* 수입 카테고리 */}
                  <div className="bg-bg-card border border-[var(--border)] rounded-[14px] sm:rounded-[16px]" style={{ padding: '16px' }}>
                    <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
                      <h2 className="text-sm sm:text-lg font-semibold flex items-center gap-1 sm:gap-2">
                        <span className="text-sm sm:text-base">💼</span> 수입
                        <span className="text-xs sm:text-sm text-text-muted font-normal">({incomeCategories.length}/20)</span>
                      </h2>
                      <button
                        onClick={() => {
                          setCategoryType('INCOME');
                          setCategoryIcon('💰');
                          setCategoryColor('#10B981');
                          setIsAddCategoryModalOpen(true);
                        }}
                        className="bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary rounded-[8px] sm:rounded-[10px] font-medium text-xs sm:text-sm hover:shadow-lg transition-all cursor-pointer"
                        style={{ padding: '8px 16px' }}
                      >
                        + 추가
                      </button>
                    </div>

                    {isLoadingCategories ? (
                      <div className="text-center text-text-muted py-4 text-sm">로딩 중...</div>
                    ) : incomeCategories.length > 0 ? (
                      <div className="flex flex-col" style={{ gap: '6px' }}>
                        {incomeCategories.map((category) => (
                          <div
                            key={category.id}
                            className="flex items-center bg-bg-secondary rounded-[8px] sm:rounded-[10px] cursor-pointer transition-all hover:bg-bg-card-hover"
                            style={{ padding: '10px' }}
                            onClick={() => {
                              setEditingCategory(category);
                              setCategoryName(category.name);
                              setCategoryType(category.type);
                              setCategoryIcon(category.icon);
                              setCategoryColor(category.color);
                              setIsEditCategoryModalOpen(true);
                            }}
                          >
                            <div
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-[6px] sm:rounded-[8px] flex items-center justify-center text-sm sm:text-base"
                              style={{ marginRight: '10px', backgroundColor: `${category.color}20` }}
                            >
                              {category.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs sm:text-sm font-medium truncate">{category.name}</div>
                            </div>
                            <div className="text-[10px] sm:text-xs text-text-muted">수정 →</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-text-muted py-4 text-xs sm:text-sm">수입 카테고리가 없습니다</div>
                    )}
                  </div>

                  {/* 지출 카테고리 */}
                  <div className="bg-bg-card border border-[var(--border)] rounded-[14px] sm:rounded-[16px]" style={{ padding: '16px' }}>
                    <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
                      <h2 className="text-sm sm:text-lg font-semibold flex items-center gap-1 sm:gap-2">
                        <span className="text-sm sm:text-base">💳</span> 지출
                        <span className="text-xs sm:text-sm text-text-muted font-normal">({expenseCategories.length}/20)</span>
                      </h2>
                      <button
                        onClick={() => {
                          setCategoryType('EXPENSE');
                          setCategoryIcon('🛒');
                          setCategoryColor('#EF4444');
                          setIsAddCategoryModalOpen(true);
                        }}
                        className="bg-gradient-to-br from-accent-coral to-accent-yellow text-bg-primary rounded-[8px] sm:rounded-[10px] font-medium text-xs sm:text-sm hover:shadow-lg transition-all cursor-pointer"
                        style={{ padding: '8px 16px' }}
                      >
                        + 추가
                      </button>
                    </div>

                    {isLoadingCategories ? (
                      <div className="text-center text-text-muted py-4 text-sm">로딩 중...</div>
                    ) : expenseCategories.length > 0 ? (
                      <div className="flex flex-col" style={{ gap: '6px' }}>
                        {expenseCategories.map((category) => (
                          <div
                            key={category.id}
                            className="flex items-center bg-bg-secondary rounded-[8px] sm:rounded-[10px] cursor-pointer transition-all hover:bg-bg-card-hover"
                            style={{ padding: '10px' }}
                            onClick={() => {
                              setEditingCategory(category);
                              setCategoryName(category.name);
                              setCategoryType(category.type);
                              setCategoryIcon(category.icon);
                              setCategoryColor(category.color);
                              setIsEditCategoryModalOpen(true);
                            }}
                          >
                            <div
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-[6px] sm:rounded-[8px] flex items-center justify-center text-sm sm:text-base"
                              style={{ marginRight: '10px', backgroundColor: `${category.color}20` }}
                            >
                              {category.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs sm:text-sm font-medium truncate">{category.name}</div>
                            </div>
                            <div className="text-[10px] sm:text-xs text-text-muted">수정 →</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-text-muted py-4 text-xs sm:text-sm">지출 카테고리가 없습니다</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Add Category Modal */}
      {isAddCategoryModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] animate-[fadeIn_0.2s_ease-out]"
          onClick={() => {
            setIsAddCategoryModalOpen(false);
            setCategoryName('');
            setCategoryType('EXPENSE');
            setCategoryIcon('📦');
            setCategoryColor('#EF4444');
            setNameError('');
          }}
        >
          <div
            className="bg-bg-card border border-[var(--border)] rounded-[24px] w-full max-w-md animate-[fadeInUp_0.3s_ease-out]"
            style={{ padding: '32px', margin: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-text-primary" style={{ marginBottom: '24px' }}>
              카테고리 추가
            </h2>

            <form onSubmit={handleAddCategory}>
              {/* Type Display */}
              <div className="flex rounded-[14px] bg-bg-secondary p-1.5" style={{ marginBottom: '20px' }}>
                <div
                  className={`flex-1 rounded-[10px] font-medium text-center ${
                    categoryType === 'EXPENSE'
                      ? 'bg-gradient-to-br from-accent-coral to-accent-yellow text-bg-primary shadow-lg'
                      : 'text-text-secondary opacity-50'
                  }`}
                  style={{ padding: '10px' }}
                >
                  지출
                </div>
                <div
                  className={`flex-1 rounded-[10px] font-medium text-center ${
                    categoryType === 'INCOME'
                      ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary shadow-lg'
                      : 'text-text-secondary opacity-50'
                  }`}
                  style={{ padding: '10px' }}
                >
                  수입
                </div>
              </div>

              {/* Name Input */}
              <div style={{ marginBottom: '20px' }}>
                <label className="block text-sm font-medium text-text-secondary" style={{ marginBottom: '8px' }}>
                  카테고리 이름
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => {
                    setCategoryName(e.target.value);
                    setNameError('');
                  }}
                  className={`w-full bg-bg-secondary border ${nameError ? 'border-accent-coral' : 'border-[var(--border)]'} rounded-[12px] text-text-primary focus:outline-none focus:border-accent-blue transition-colors`}
                  style={{ padding: '14px 16px' }}
                  placeholder="예: 식비, 교통비 등"
                />
                {nameError && (
                  <p className="text-accent-coral text-xs" style={{ marginTop: '6px' }}>
                    {nameError}
                  </p>
                )}
              </div>

              {/* Icon Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label className="block text-sm font-medium text-text-secondary" style={{ marginBottom: '8px' }}>
                  아이콘
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {iconList.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setCategoryIcon(icon)}
                      className={`w-full aspect-square rounded-[10px] flex items-center justify-center text-xl transition-all cursor-pointer ${
                        categoryIcon === icon
                          ? 'bg-accent-blue text-white shadow-lg scale-110'
                          : 'bg-bg-secondary hover:bg-bg-card-hover'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div style={{ marginBottom: '24px' }}>
                <label className="block text-sm font-medium text-text-secondary" style={{ marginBottom: '8px' }}>
                  색상
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {colorList.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setCategoryColor(color.value)}
                      className={`w-full aspect-square rounded-[10px] transition-all cursor-pointer ${
                        categoryColor === color.value
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-card scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddCategoryModalOpen(false);
                    setCategoryName('');
                    setCategoryType('EXPENSE');
                    setCategoryIcon('📦');
                    setCategoryColor('#EF4444');
                    setNameError('');
                  }}
                  className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer"
                  style={{ padding: '14px' }}
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !categoryName}
                  className={`flex-1 rounded-[12px] font-medium transition-all hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    categoryType === 'EXPENSE'
                      ? 'bg-gradient-to-br from-accent-coral to-accent-yellow'
                      : 'bg-gradient-to-br from-accent-mint to-accent-blue'
                  } text-bg-primary`}
                  style={{ padding: '14px' }}
                >
                  {isSubmitting ? '추가 중...' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {isEditCategoryModalOpen && editingCategory && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] animate-[fadeIn_0.2s_ease-out]"
          onClick={() => {
            setIsEditCategoryModalOpen(false);
            setEditingCategory(null);
            setCategoryName('');
            setCategoryType('EXPENSE');
            setCategoryIcon('📦');
            setCategoryColor('#EF4444');
            setNameError('');
          }}
        >
          <div
            className="bg-bg-card border border-[var(--border)] rounded-[24px] w-full max-w-md animate-[fadeInUp_0.3s_ease-out]"
            style={{ padding: '32px', margin: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-text-primary" style={{ marginBottom: '24px' }}>
              카테고리 수정
            </h2>

            <form onSubmit={handleEditCategory}>
              {/* Type Display (Read-only) */}
              <div className="flex rounded-[14px] bg-bg-secondary p-1.5" style={{ marginBottom: '20px' }}>
                <div
                  className={`flex-1 rounded-[10px] font-medium text-center ${
                    categoryType === 'EXPENSE'
                      ? 'bg-gradient-to-br from-accent-coral to-accent-yellow text-bg-primary shadow-lg'
                      : 'text-text-secondary opacity-50'
                  }`}
                  style={{ padding: '10px' }}
                >
                  지출
                </div>
                <div
                  className={`flex-1 rounded-[10px] font-medium text-center ${
                    categoryType === 'INCOME'
                      ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary shadow-lg'
                      : 'text-text-secondary opacity-50'
                  }`}
                  style={{ padding: '10px' }}
                >
                  수입
                </div>
              </div>

              {/* Name Input */}
              <div style={{ marginBottom: '20px' }}>
                <label className="block text-sm font-medium text-text-secondary" style={{ marginBottom: '8px' }}>
                  카테고리 이름
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => {
                    setCategoryName(e.target.value);
                    setNameError('');
                  }}
                  className={`w-full bg-bg-secondary border ${nameError ? 'border-accent-coral' : 'border-[var(--border)]'} rounded-[12px] text-text-primary focus:outline-none focus:border-accent-blue transition-colors`}
                  style={{ padding: '14px 16px' }}
                  placeholder="예: 식비, 교통비 등"
                />
                {nameError && (
                  <p className="text-accent-coral text-xs" style={{ marginTop: '6px' }}>
                    {nameError}
                  </p>
                )}
              </div>

              {/* Icon Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label className="block text-sm font-medium text-text-secondary" style={{ marginBottom: '8px' }}>
                  아이콘
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {iconList.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setCategoryIcon(icon)}
                      className={`w-full aspect-square rounded-[10px] flex items-center justify-center text-xl transition-all cursor-pointer ${
                        categoryIcon === icon
                          ? 'bg-accent-blue text-white shadow-lg scale-110'
                          : 'bg-bg-secondary hover:bg-bg-card-hover'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div style={{ marginBottom: '24px' }}>
                <label className="block text-sm font-medium text-text-secondary" style={{ marginBottom: '8px' }}>
                  색상
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {colorList.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setCategoryColor(color.value)}
                      className={`w-full aspect-square rounded-[10px] transition-all cursor-pointer ${
                        categoryColor === color.value
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-card scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditCategoryModalOpen(false);
                      setEditingCategory(null);
                      setCategoryName('');
                      setCategoryType('EXPENSE');
                      setCategoryIcon('📦');
                      setCategoryColor('#EF4444');
                      setNameError('');
                    }}
                    className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer"
                    style={{ padding: '14px' }}
                    disabled={isSubmitting}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !categoryName}
                    className={`flex-1 rounded-[12px] font-medium transition-all hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      categoryType === 'EXPENSE'
                        ? 'bg-gradient-to-br from-accent-coral to-accent-yellow'
                        : 'bg-gradient-to-br from-accent-mint to-accent-blue'
                    } text-bg-primary`}
                    style={{ padding: '14px' }}
                  >
                    {isSubmitting ? '수정 중...' : '수정'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeleteCategoryConfirmOpen(true)}
                  className="w-full bg-bg-secondary text-accent-coral border border-accent-coral rounded-[12px] font-medium hover:bg-accent-coral hover:text-bg-primary transition-all cursor-pointer"
                  style={{ padding: '14px' }}
                  disabled={isSubmitting}
                >
                  삭제
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {isDeleteCategoryConfirmOpen && editingCategory && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[300] animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setIsDeleteCategoryConfirmOpen(false)}
        >
          <div
            className="bg-bg-card border border-[var(--border)] rounded-[24px] w-full max-w-sm animate-[fadeInUp_0.3s_ease-out]"
            style={{ padding: '32px', margin: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-text-primary" style={{ marginBottom: '12px' }}>
              카테고리 삭제
            </h2>
            <p className="text-text-secondary" style={{ marginBottom: '24px' }}>
              &apos;{editingCategory.name}&apos; 카테고리를 삭제하시겠습니까?<br />
              이 작업은 되돌릴 수 없습니다.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteCategoryConfirmOpen(false)}
                className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer"
                style={{ padding: '14px' }}
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                onClick={handleDeleteCategory}
                disabled={isSubmitting}
                className="flex-1 bg-accent-coral text-white rounded-[12px] font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ padding: '14px' }}
              >
                {isSubmitting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {isDeleteAccountModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[300] animate-[fadeIn_0.2s_ease-out]"
          onClick={() => {
            setIsDeleteAccountModalOpen(false);
            setDeletePassword('');
            setDeleteError('');
          }}
        >
          <div
            className="bg-bg-card border border-accent-coral/50 rounded-[24px] w-full max-w-md animate-[fadeInUp_0.3s_ease-out]"
            style={{ padding: '32px', margin: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-accent-coral" style={{ marginBottom: '12px' }}>
              계정 삭제
            </h2>
            <p className="text-text-secondary" style={{ marginBottom: '24px' }}>
              정말로 계정을 삭제하시겠습니까?<br />
              모든 데이터가 영구적으로 삭제되며, 이 작업은 되돌릴 수 없습니다.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label className="block text-sm text-text-muted" style={{ marginBottom: '8px' }}>
                비밀번호 확인
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  setDeleteError('');
                }}
                className="w-full bg-bg-secondary border border-[var(--border)] rounded-[10px] text-text-primary focus:outline-none focus:border-accent-coral transition-colors"
                style={{ padding: '12px 14px' }}
                placeholder="비밀번호를 입력하세요"
              />
              {deleteError && (
                <p className="text-accent-coral text-sm" style={{ marginTop: '8px' }}>{deleteError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsDeleteAccountModalOpen(false);
                  setDeletePassword('');
                  setDeleteError('');
                }}
                className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer"
                style={{ padding: '14px' }}
                disabled={isDeletingAccount}
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || !deletePassword}
                className="flex-1 bg-accent-coral text-white rounded-[12px] font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ padding: '14px' }}
              >
                {isDeletingAccount ? '삭제 중...' : '계정 삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
