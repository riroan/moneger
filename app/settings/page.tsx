'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useOutsideClick, useBodyScrollLock } from '@/hooks';
import type { Category, Budget } from '@/types';
import {
  AccountTab,
  CategoryTab,
  BudgetTab,
  CategoryFormModal,
  ConfirmModal,
  BudgetEditModal,
  DeleteAccountModal,
} from '@/components/settings';
import type { CategoryFormData } from '@/components/settings';

type SettingTab = 'account' | 'category' | 'budget';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SettingTab>('account');

  // 카테고리 관리
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryModalMode, setCategoryModalMode] = useState<'add' | 'edit'>('add');
  const [categoryModalType, setCategoryModalType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDeleteCategoryConfirmOpen, setIsDeleteCategoryConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 계정 삭제 상태
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);

  // 프로필 메뉴 상태
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const closeProfileMenu = useCallback(() => setIsProfileMenuOpen(false), []);
  const profileMenuRef = useOutsideClick<HTMLDivElement>(closeProfileMenu, isProfileMenuOpen);

  // 예산 관리 상태
  const [budgetDate, setBudgetDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudgetCategory, setEditingBudgetCategory] = useState<Category | null>(null);
  const [oldestTransactionDate, setOldestTransactionDate] = useState<{ year: number; month: number } | null>(null);

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

  // 카테고리 목록 및 가장 오래된 거래 날짜 가져오기
  useEffect(() => {
    if (!userId) return;

    const fetchInitialData = async () => {
      setIsLoadingCategories(true);
      try {
        const [categoriesRes, oldestDateRes] = await Promise.all([
          fetch(`/api/categories?userId=${userId}`),
          fetch(`/api/transactions/oldest-date?userId=${userId}`),
        ]);

        const [categoriesData, oldestDateData] = await Promise.all([
          categoriesRes.json(),
          oldestDateRes.json(),
        ]);

        if (categoriesData.success) {
          setCategories(categoriesData.data);
        }

        if (oldestDateData.success && oldestDateData.data.year && oldestDateData.data.month) {
          setOldestTransactionDate({ year: oldestDateData.data.year, month: oldestDateData.data.month });
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchInitialData();
  }, [userId]);

  // 예산 데이터 가져오기
  useEffect(() => {
    if (!userId || activeTab !== 'budget') return;

    const fetchBudgets = async () => {
      setIsLoadingBudgets(true);
      try {
        const year = budgetDate.getFullYear();
        const month = budgetDate.getMonth() + 1;
        const response = await fetch(`/api/budgets?userId=${userId}&year=${year}&month=${month}`);
        const data = await response.json();

        if (data.success) {
          setBudgets(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch budgets:', error);
      } finally {
        setIsLoadingBudgets(false);
      }
    };

    fetchBudgets();
  }, [userId, activeTab, budgetDate]);

  // 모달이 열렸을 때 body 스크롤 비활성화
  useBodyScrollLock(isCategoryModalOpen || isDeleteCategoryConfirmOpen || isDeleteAccountModalOpen || isBudgetModalOpen);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    router.push('/login');
  };

  // 카테고리 모달 열기
  const handleOpenAddCategoryModal = (type: 'INCOME' | 'EXPENSE') => {
    setCategoryModalMode('add');
    setCategoryModalType(type);
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategoryModal = (category: Category) => {
    setCategoryModalMode('edit');
    setCategoryModalType(category.type);
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  // 카테고리 추가/수정
  const handleCategorySubmit = async (data: CategoryFormData) => {
    if (!userId) return;

    if (categoryModalMode === 'add') {
      // 카테고리 개수 제한 (최대 20개)
      const currentTypeCategories = categories.filter(c => c.type === data.type);
      if (currentTypeCategories.length >= 20) {
        throw new Error(`${data.type === 'INCOME' ? '수입' : '지출'} 카테고리는 최대 20개까지만 추가할 수 있습니다`);
      }

      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: data.name,
          type: data.type,
          icon: data.icon,
          color: data.color,
          defaultBudget: data.type === 'EXPENSE' && data.defaultBudget
            ? parseInt(data.defaultBudget, 10)
            : null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '카테고리 추가에 실패했습니다');
      }
    } else if (editingCategory) {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: data.name,
          icon: data.icon,
          color: data.color,
          defaultBudget: data.type === 'EXPENSE' && data.defaultBudget
            ? parseInt(data.defaultBudget, 10)
            : null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '카테고리 수정에 실패했습니다');
      }
    }

    // 카테고리 목록 새로고침
    const categoriesResponse = await fetch(`/api/categories?userId=${userId}`);
    const categoriesData = await categoriesResponse.json();
    if (categoriesData.success) {
      setCategories(categoriesData.data);
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

      setIsDeleteCategoryConfirmOpen(false);
      setIsCategoryModalOpen(false);
      setEditingCategory(null);

      // 카테고리 목록 새로고침
      const categoriesResponse = await fetch(`/api/categories?userId=${userId}`);
      const categoriesData = await categoriesResponse.json();
      if (categoriesData.success) {
        setCategories(categoriesData.data);
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      showToast(error instanceof Error ? error.message : '카테고리 삭제에 실패했습니다', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 예산 모달 열기
  const openBudgetModal = (category: Category) => {
    setEditingBudgetCategory(category);
    setIsBudgetModalOpen(true);
  };

  // 예산 저장
  const handleSaveBudget = async (amount: number) => {
    if (!userId || !editingBudgetCategory) return;

    const response = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        categoryId: editingBudgetCategory.id,
        amount,
        year: budgetDate.getFullYear(),
        month: budgetDate.getMonth() + 1,
      }),
    });

    const data = await response.json();
    if (data.success) {
      setBudgets(prev => {
        const existing = prev.findIndex(b => b.categoryId === editingBudgetCategory.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data.data;
          return updated;
        }
        return [...prev, data.data];
      });
    }
  };

  // 로딩 중일 때는 빈 화면 표시
  if (isLoading) {
    return null;
  }

  const getBudgetForCategory = (categoryId: string) => {
    return budgets.find(b => b.categoryId === categoryId);
  };

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
                className={`flex-1 rounded-[8px] font-medium text-sm transition-all cursor-pointer ${
                  activeTab === 'account'
                    ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                style={{ padding: '10px' }}
              >
                계정
              </button>
              <button
                onClick={() => setActiveTab('category')}
                className={`flex-1 rounded-[8px] font-medium text-sm transition-all cursor-pointer ${
                  activeTab === 'category'
                    ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                style={{ padding: '10px' }}
              >
                카테고리
              </button>
              <button
                onClick={() => setActiveTab('budget')}
                className={`flex-1 rounded-[8px] font-medium text-sm transition-all cursor-pointer ${
                  activeTab === 'budget'
                    ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                style={{ padding: '10px' }}
              >
                예산
              </button>
            </nav>
          </div>

          {/* Desktop Sidebar */}
          <aside className="hidden md:block md:w-64 flex-shrink-0 animate-[fadeInUp_0.6s_ease-out]">
            <nav className="bg-bg-card border border-[var(--border)] rounded-[16px]" style={{ padding: '12px' }}>
              <button
                onClick={() => setActiveTab('account')}
                className={`w-full text-left rounded-[10px] font-medium transition-all cursor-pointer flex items-center gap-3 ${
                  activeTab === 'account'
                    ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover'
                }`}
                style={{ padding: '14px 16px', marginBottom: '8px' }}
              >
                <span className="text-lg">👤</span>
                계정
              </button>
              <button
                onClick={() => setActiveTab('category')}
                className={`w-full text-left rounded-[10px] font-medium transition-all cursor-pointer flex items-center gap-3 ${
                  activeTab === 'category'
                    ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover'
                }`}
                style={{ padding: '14px 16px', marginBottom: '8px' }}
              >
                <span className="text-lg">📂</span>
                카테고리
              </button>
              <button
                onClick={() => setActiveTab('budget')}
                className={`w-full text-left rounded-[10px] font-medium transition-all cursor-pointer flex items-center gap-3 ${
                  activeTab === 'budget'
                    ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover'
                }`}
                style={{ padding: '14px 16px' }}
              >
                <span className="text-lg">💰</span>
                예산
              </button>
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 animate-[fadeInUp_0.7s_ease-out]">
            {activeTab === 'account' && userId && (
              <AccountTab
                userName={userName}
                userEmail={userEmail}
                userId={userId}
                onDeleteAccountOpen={() => setIsDeleteAccountModalOpen(true)}
              />
            )}

            {activeTab === 'category' && (
              <CategoryTab
                categories={categories}
                isLoading={isLoadingCategories}
                onAddCategory={handleOpenAddCategoryModal}
                onEditCategory={handleOpenEditCategoryModal}
              />
            )}

            {activeTab === 'budget' && (
              <BudgetTab
                categories={categories}
                budgets={budgets}
                isLoadingCategories={isLoadingCategories}
                isLoadingBudgets={isLoadingBudgets}
                budgetDate={budgetDate}
                oldestTransactionDate={oldestTransactionDate}
                onBudgetDateChange={setBudgetDate}
                onOpenBudgetModal={openBudgetModal}
              />
            )}
          </main>
        </div>
      </div>

      {/* Category Form Modal */}
      <CategoryFormModal
        isOpen={isCategoryModalOpen}
        mode={categoryModalMode}
        initialCategory={editingCategory}
        initialType={categoryModalType}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSubmit={handleCategorySubmit}
        onDelete={() => setIsDeleteCategoryConfirmOpen(true)}
      />

      {/* Delete Category Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteCategoryConfirmOpen && !!editingCategory}
        title="카테고리 삭제"
        message={
          <>
            &apos;{editingCategory?.name}&apos; 카테고리를 삭제하시겠습니까?<br />
            이 작업은 되돌릴 수 없습니다.
          </>
        }
        confirmText="삭제"
        isLoading={isSubmitting}
        onConfirm={handleDeleteCategory}
        onCancel={() => setIsDeleteCategoryConfirmOpen(false)}
      />

      {/* Budget Edit Modal */}
      <BudgetEditModal
        isOpen={isBudgetModalOpen}
        category={editingBudgetCategory}
        budgetDate={budgetDate}
        initialAmount={editingBudgetCategory ? getBudgetForCategory(editingBudgetCategory.id)?.amount : undefined}
        onClose={() => {
          setIsBudgetModalOpen(false);
          setEditingBudgetCategory(null);
        }}
        onSave={handleSaveBudget}
      />

      {/* Delete Account Modal */}
      {userId && (
        <DeleteAccountModal
          isOpen={isDeleteAccountModalOpen}
          userId={userId}
          onClose={() => setIsDeleteAccountModalOpen(false)}
        />
      )}
    </>
  );
}
