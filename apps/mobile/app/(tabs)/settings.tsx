import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import type { MaterialIconName } from '../../constants/Icons';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useToast } from '../../contexts/ToastContext';
import { Colors } from '../../constants/Colors';
import { authApi, categoryApi, budgetApi, transactionApi, CategoryWithBudget, BudgetItem } from '../../lib/api';
import { formatNumber } from '@moneger/shared';
import {
  CalendarModal,
  CategoryEditModal,
  BudgetEditModal,
  type CalendarTransaction,
  type CategoryForEdit,
  type CategoryForBudget,
} from '../../components/settings';

type SettingsModal = 'none' | 'category' | 'budget' | 'password' | 'account' | 'calendar';

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, MaterialIconName> = {
  star: 'star',
  box: 'inventory-2',
  restaurant: 'restaurant',
  car: 'directions-car',
  home: 'home',
  work: 'work',
  game: 'sports-esports',
  movie: 'movie',
  cart: 'shopping-cart',
  money: 'attach-money',
  card: 'credit-card',
  hospital: 'local-hospital',
  book: 'menu-book',
  flight: 'flight',
  gift: 'card-giftcard',
  cafe: 'local-cafe',
  food: 'fastfood',
  person: 'person',
  heart: 'favorite',
  bag: 'shopping-bag',
  payment: 'payments',
  music: 'music-note',
  fitness: 'fitness-center',
  pet: 'pets',
};

export default function SettingsScreen() {
  const router = useRouter();
  const { userId, userName, userEmail, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { showToast } = useToast();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const [activeModal, setActiveModal] = useState<SettingsModal>('none');

  // Category state
  const [categories, setCategories] = useState<CategoryWithBudget[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<'add' | 'edit'>('add');
  const [categoryModalType, setCategoryModalType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [editingCategory, setEditingCategory] = useState<CategoryWithBudget | null>(null);
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);

  // Budget state
  const [budgetDate, setBudgetDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false);
  const [oldestTransactionDate, setOldestTransactionDate] = useState<{ year: number; month: number } | null>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudgetCategory, setEditingBudgetCategory] = useState<CategoryWithBudget | null>(null);
  const [isBudgetSubmitting, setIsBudgetSubmitting] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete account state
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [calendarTransactions, setCalendarTransactions] = useState<CalendarTransaction[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  const fetchCategories = useCallback(async () => {
    if (!userId) return;
    setIsLoadingCategories(true);
    try {
      const res = await categoryApi.getAll(userId);
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setIsLoadingCategories(false);
    }
  }, [userId]);

  const fetchBudgets = useCallback(async () => {
    if (!userId) return;
    setIsLoadingBudgets(true);
    try {
      const year = budgetDate.getFullYear();
      const month = budgetDate.getMonth() + 1;
      const res = await budgetApi.getAll(userId, year, month);
      if (res.success && res.data) {
        const budgetItems: BudgetItem[] = res.data.map(b => ({
          id: b.id,
          amount: b.amount,
          categoryId: b.categoryId,
          year,
          month,
        }));
        setBudgets(budgetItems);
      }
    } catch (error) {
      console.error('Failed to fetch budgets:', error);
    } finally {
      setIsLoadingBudgets(false);
    }
  }, [userId, budgetDate]);

  const fetchOldestDate = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await transactionApi.getOldestDate(userId);
      if (res.success && res.data) {
        setOldestTransactionDate(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch oldest date:', error);
    }
  }, [userId]);

  const fetchCalendarTransactions = useCallback(async () => {
    if (!userId) return;
    setIsLoadingCalendar(true);
    try {
      const year = calendarDate.getFullYear();
      const month = calendarDate.getMonth() + 1;
      const res = await transactionApi.getAll(userId, year, month);
      if (res.success && res.data) {
        setCalendarTransactions(res.data as CalendarTransaction[]);
      }
    } catch (error) {
      console.error('Failed to fetch calendar transactions:', error);
    } finally {
      setIsLoadingCalendar(false);
    }
  }, [userId, calendarDate]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (activeModal === 'budget') {
      fetchBudgets();
      fetchOldestDate();
    }
  }, [activeModal, fetchBudgets, fetchOldestDate]);

  useEffect(() => {
    if (activeModal === 'calendar') {
      fetchCalendarTransactions();
      fetchOldestDate();
    }
  }, [activeModal, fetchCalendarTransactions, fetchOldestDate]);

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

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
    } catch (error) {
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
    } catch (error) {
      showToast('계정 삭제에 실패했습니다', 'error');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Category functions
  const openAddCategoryModal = (type: 'INCOME' | 'EXPENSE') => {
    setCategoryModalMode('add');
    setCategoryModalType(type);
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category: CategoryWithBudget) => {
    setCategoryModalMode('edit');
    setCategoryModalType(category.type);
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (data: {
    name: string;
    icon: string;
    color: string;
    defaultBudget: number | null;
  }) => {
    if (!userId) return;

    setIsCategorySubmitting(true);
    try {
      if (categoryModalMode === 'add') {
        const currentTypeCategories = categories.filter(c => c.type === categoryModalType);
        if (currentTypeCategories.length >= 20) {
          showToast(`${categoryModalType === 'INCOME' ? '수입' : '지출'} 카테고리는 최대 20개까지만 추가할 수 있습니다`, 'error');
          return;
        }

        const res = await categoryApi.create({
          userId,
          name: data.name,
          type: categoryModalType,
          icon: data.icon,
          color: data.color,
          defaultBudget: data.defaultBudget,
        });

        if (res.success) {
          showToast('카테고리가 추가되었습니다', 'success');
          setIsCategoryModalOpen(false);
          fetchCategories();
        } else {
          showToast(res.error || '카테고리 추가에 실패했습니다', 'error');
        }
      } else if (editingCategory) {
        const res = await categoryApi.update(editingCategory.id, {
          userId,
          name: data.name,
          icon: data.icon,
          color: data.color,
          defaultBudget: data.defaultBudget,
        });

        if (res.success) {
          showToast('카테고리가 수정되었습니다', 'success');
          setIsCategoryModalOpen(false);
          fetchCategories();
        } else {
          showToast(res.error || '카테고리 수정에 실패했습니다', 'error');
        }
      }
    } catch (error) {
      showToast('카테고리 저장에 실패했습니다', 'error');
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!userId || !editingCategory) return;

    setIsCategorySubmitting(true);
    try {
      const res = await categoryApi.delete(editingCategory.id, userId);
      if (res.success) {
        showToast('카테고리가 삭제되었습니다', 'success');
        setIsCategoryModalOpen(false);
        fetchCategories();
      } else {
        showToast(res.error || '카테고리 삭제에 실패했습니다', 'error');
      }
    } catch (error) {
      showToast('카테고리 삭제에 실패했습니다', 'error');
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  // Budget functions
  const openBudgetModal = (category: CategoryWithBudget) => {
    setEditingBudgetCategory(category);
    setIsBudgetModalOpen(true);
  };

  const handleSaveBudget = async (amount: number) => {
    if (!userId || !editingBudgetCategory) return;

    setIsBudgetSubmitting(true);
    try {
      const res = await budgetApi.set({
        userId,
        categoryId: editingBudgetCategory.id,
        amount,
        year: budgetDate.getFullYear(),
        month: budgetDate.getMonth() + 1,
      });

      if (res.success) {
        showToast('예산이 저장되었습니다', 'success');
        setIsBudgetModalOpen(false);
        fetchBudgets();
      } else {
        showToast(res.error || '예산 저장에 실패했습니다', 'error');
      }
    } catch (error) {
      console.error('Failed to save budget:', error);
      showToast('예산 저장에 실패했습니다', 'error');
    } finally {
      setIsBudgetSubmitting(false);
    }
  };

  const isBudgetPreviousMonthDisabled = () => {
    if (!oldestTransactionDate) return false;
    const oldestMonth = oldestTransactionDate.month - 1;
    return budgetDate.getFullYear() === oldestTransactionDate.year && budgetDate.getMonth() === oldestMonth;
  };

  const handleBudgetPreviousMonth = () => {
    if (!isBudgetPreviousMonthDisabled()) {
      setBudgetDate(new Date(budgetDate.getFullYear(), budgetDate.getMonth() - 1, 1));
    }
  };

  const isBudgetNextMonthDisabled = () => {
    const nextMonth = new Date(budgetDate.getFullYear(), budgetDate.getMonth() + 1, 1);
    const now = new Date();
    return nextMonth > new Date(now.getFullYear(), now.getMonth(), 1);
  };

  const handleBudgetNextMonth = () => {
    if (!isBudgetNextMonthDisabled()) {
      setBudgetDate(new Date(budgetDate.getFullYear(), budgetDate.getMonth() + 1, 1));
    }
  };

  // Calendar navigation
  const isCalendarPrevMonthDisabled = () => {
    if (!oldestTransactionDate) return false;
    const oldestMonth = oldestTransactionDate.month - 1;
    return calendarDate.getFullYear() === oldestTransactionDate.year && calendarDate.getMonth() === oldestMonth;
  };

  const handleCalendarPrevMonth = () => {
    if (!isCalendarPrevMonthDisabled()) {
      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
    }
  };

  const isCalendarNextMonthDisabled = () => {
    const nextMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
    const now = new Date();
    return nextMonth > new Date(now.getFullYear(), now.getMonth(), 1);
  };

  const handleCalendarNextMonth = () => {
    if (!isCalendarNextMonthDisabled()) {
      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
    }
  };

  const incomeCategories = categories.filter(c => c.type === 'INCOME');
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

  const getBudgetForCategory = (categoryId: string) => {
    return budgets.find(b => b.categoryId === categoryId);
  };

  const renderCategoryIcon = (iconId: string, size: number = 20, color: string = '#fff') => {
    const iconName = CATEGORY_ICONS[iconId] || CATEGORY_ICONS.money;
    return <MaterialIcons name={iconName} size={size} color={color} />;
  };

  // Convert CategoryWithBudget to CategoryForEdit
  const getCategoryForEdit = (category: CategoryWithBudget | null): CategoryForEdit | null => {
    if (!category) return null;
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color,
      defaultBudget: category.defaultBudget ?? null,
    };
  };

  // Convert CategoryWithBudget to CategoryForBudget
  const getCategoryForBudget = (category: CategoryWithBudget | null): CategoryForBudget | null => {
    if (!category) return null;
    return {
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      defaultBudget: category.defaultBudget ?? null,
    };
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    profileSection: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      paddingTop: 10,
    },
    profileAvatar: {
      width: 60,
      height: 60,
      borderRadius: 20,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.bgPrimary,
    },
    profileInfo: {
      flex: 1,
      marginLeft: 16,
    },
    profileName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    profileEmail: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 2,
    },
    profileSettingsButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuListCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      marginHorizontal: 16,
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    menuListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    menuItemFirst: {
      borderTopWidth: 0,
    },
    menuListIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    menuListText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    bottomSpacer: {
      height: 100,
    },
    fullScreenModal: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    fullModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    fullModalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    section: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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
      borderRadius: 16,
      backgroundColor: colors.accentMint,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    formContainer: {
      padding: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    textInput: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    submitButton: {
      backgroundColor: colors.accentMint,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.bgPrimary,
    },
    menuItemOld: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    menuIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    menuText: {
      flex: 1,
      fontSize: 16,
      color: colors.textPrimary,
    },
    dangerCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(248, 113, 113, 0.3)',
      padding: 16,
    },
    dangerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#F87171',
      marginBottom: 6,
    },
    dangerText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    dangerButton: {
      backgroundColor: '#F87171',
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    dangerButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    logoutButton: {
      backgroundColor: colors.accentCoral,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 24,
      marginHorizontal: 20,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
    },
    version: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 24,
      marginBottom: 40,
    },
    categoryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      paddingBottom: 12,
    },
    categoryTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    categoryCount: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: 'normal',
    },
    addCategoryButton: {
      backgroundColor: colors.accentMint,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    addCategoryButtonText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.bgPrimary,
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      marginHorizontal: 12,
      marginBottom: 8,
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
    },
    categoryIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    categoryName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    categoryEditHint: {
      fontSize: 12,
      color: colors.textMuted,
    },
    emptyCategory: {
      padding: 24,
      alignItems: 'center',
    },
    emptyCategoryText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    loadingContainer: {
      padding: 32,
      alignItems: 'center',
    },
    budgetMonthSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 12,
      marginHorizontal: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 16,
    },
    budgetMonthButton: {
      padding: 8,
    },
    budgetMonthButtonDisabled: {
      opacity: 0.3,
    },
    budgetMonthText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      minWidth: 100,
      textAlign: 'center',
    },
    budgetItem: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 14,
      padding: 14,
      marginHorizontal: 12,
      marginBottom: 10,
    },
    budgetItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    budgetItemIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    budgetItemInfo: {
      flex: 1,
    },
    budgetItemName: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    budgetItemDefault: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    budgetItemHint: {
      fontSize: 11,
      color: colors.textMuted,
    },
    budgetItemAmount: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 12,
      paddingTop: 12,
      alignItems: 'flex-end',
    },
    budgetAmountValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.accentMint,
    },
    budgetAmountEmpty: {
      fontSize: 14,
      color: colors.textMuted,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    modalContent: {
      width: '90%',
      maxWidth: 400,
      maxHeight: '85%',
      backgroundColor: colors.bgCard,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    modalCloseButton: {
      padding: 4,
    },
    modalBody: {
      maxHeight: 400,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    saveButton: {
      flex: 1,
      backgroundColor: colors.accentMint,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.bgPrimary,
    },
  });

  const renderAccountTab = () => (
    <ScrollView>
      <View style={[styles.section, { paddingTop: 16 }]}>
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
        <Text style={styles.sectionTitle}>앱 설정</Text>
        <View style={styles.card}>
          <View style={[styles.menuItemOld, styles.menuItemFirst]}>
            <View style={styles.menuIcon}>
              <MaterialIcons
                name={theme === 'dark' ? 'dark-mode' : 'light-mode'}
                size={20}
                color={colors.accentMint}
              />
            </View>
            <Text style={styles.menuText}>다크 모드</Text>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{
                false: colors.bgSecondary,
                true: colors.accentMint,
              }}
              thumbColor="#ffffff"
            />
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

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>

      <Text style={styles.version}>MONEGER v1.0.0</Text>
    </ScrollView>
  );

  const renderCategoryTab = () => (
    <ScrollView>
      <View style={[styles.section, { paddingTop: 16 }]}>
        <View style={styles.card}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryTitle}>
              <MaterialIcons name="trending-up" size={16} color={colors.accentMint} /> 수입{' '}
              <Text style={styles.categoryCount}>({incomeCategories.length}/20)</Text>
            </Text>
            <TouchableOpacity
              style={styles.addCategoryButton}
              onPress={() => openAddCategoryModal('INCOME')}
            >
              <Text style={styles.addCategoryButtonText}>+ 추가</Text>
            </TouchableOpacity>
          </View>

          {isLoadingCategories ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accentMint} />
            </View>
          ) : incomeCategories.length === 0 ? (
            <View style={styles.emptyCategory}>
              <Text style={styles.emptyCategoryText}>수입 카테고리가 없습니다</Text>
            </View>
          ) : (
            incomeCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() => openEditCategoryModal(category)}
              >
                <View
                  style={[
                    styles.categoryIconContainer,
                    { backgroundColor: `${category.color || '#888'}20` },
                  ]}
                >
                  {renderCategoryIcon(category.icon || 'money', 18, category.color || '#888')}
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryEditHint}>수정 →</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.card}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryTitle}>
              <MaterialIcons name="trending-down" size={16} color={colors.accentCoral} /> 지출{' '}
              <Text style={styles.categoryCount}>({expenseCategories.length}/20)</Text>
            </Text>
            <TouchableOpacity
              style={[styles.addCategoryButton, { backgroundColor: colors.accentCoral }]}
              onPress={() => openAddCategoryModal('EXPENSE')}
            >
              <Text style={styles.addCategoryButtonText}>+ 추가</Text>
            </TouchableOpacity>
          </View>

          {isLoadingCategories ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accentCoral} />
            </View>
          ) : expenseCategories.length === 0 ? (
            <View style={styles.emptyCategory}>
              <Text style={styles.emptyCategoryText}>지출 카테고리가 없습니다</Text>
            </View>
          ) : (
            expenseCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() => openEditCategoryModal(category)}
              >
                <View
                  style={[
                    styles.categoryIconContainer,
                    { backgroundColor: `${category.color || '#888'}20` },
                  ]}
                >
                  {renderCategoryIcon(category.icon || 'money', 18, category.color || '#888')}
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryEditHint}>수정 →</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );

  const renderBudgetTab = () => (
    <ScrollView>
      <View style={[styles.budgetMonthSelector, { marginTop: 16 }]}>
        <TouchableOpacity
          style={[styles.budgetMonthButton, isBudgetPreviousMonthDisabled() && styles.budgetMonthButtonDisabled]}
          onPress={handleBudgetPreviousMonth}
          disabled={isBudgetPreviousMonthDisabled()}
        >
          <MaterialIcons name="chevron-left" size={24} color={isBudgetPreviousMonthDisabled() ? colors.textMuted : colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.budgetMonthText}>
          {budgetDate.getFullYear()}년 {budgetDate.getMonth() + 1}월
        </Text>
        <TouchableOpacity
          style={[styles.budgetMonthButton, isBudgetNextMonthDisabled() && styles.budgetMonthButtonDisabled]}
          onPress={handleBudgetNextMonth}
          disabled={isBudgetNextMonthDisabled()}
        >
          <MaterialIcons name="chevron-right" size={24} color={isBudgetNextMonthDisabled() ? colors.textMuted : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.card}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryTitle}>
              <MaterialIcons name="account-balance-wallet" size={16} color={colors.accentCoral} /> 지출 카테고리별 예산
            </Text>
          </View>

          {isLoadingBudgets || isLoadingCategories ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accentMint} />
            </View>
          ) : expenseCategories.length === 0 ? (
            <View style={styles.emptyCategory}>
              <Text style={styles.emptyCategoryText}>지출 카테고리가 없습니다</Text>
            </View>
          ) : (
            expenseCategories.map((category) => {
              const budget = getBudgetForCategory(category.id);
              const hasMonthlyBudget = budget && budget.amount > 0;
              const hasDefaultBudget = category.defaultBudget && category.defaultBudget > 0;

              return (
                <TouchableOpacity
                  key={category.id}
                  style={styles.budgetItem}
                  onPress={() => openBudgetModal(category)}
                >
                  <View style={styles.budgetItemHeader}>
                    <View
                      style={[
                        styles.budgetItemIcon,
                        { backgroundColor: `${category.color || '#888'}20` },
                      ]}
                    >
                      {renderCategoryIcon(category.icon || 'money', 20, category.color || '#888')}
                    </View>
                    <View style={styles.budgetItemInfo}>
                      <Text style={styles.budgetItemName}>{category.name}</Text>
                      {hasDefaultBudget && (
                        <Text style={styles.budgetItemDefault}>
                          기본 ₩{formatNumber(category.defaultBudget || 0)}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.budgetItemHint}>설정 →</Text>
                  </View>
                  <View style={styles.budgetItemAmount}>
                    {hasMonthlyBudget ? (
                      <Text style={styles.budgetAmountValue}>₩{formatNumber(budget.amount)}</Text>
                    ) : (
                      <Text style={styles.budgetAmountEmpty}>미설정</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>
    </ScrollView>
  );

  const navigationMenuItems = [
    { id: 'calendar', icon: 'calendar-today' as MaterialIconName, label: '일별 내역', color: '#10B981', onPress: () => setActiveModal('calendar') },
    { id: 'transactions', icon: 'receipt-long' as MaterialIconName, label: '거래 내역', color: '#3B82F6', onPress: () => router.push('/(tabs)/transactions') },
    { id: 'savings', icon: 'savings' as MaterialIconName, label: '저축 목표', color: '#F59E0B', onPress: () => router.push('/(tabs)/savings') },
  ];

  const settingsMenuItems = [
    { id: 'category', icon: 'category' as MaterialIconName, label: '카테고리 관리', color: '#6366F1', onPress: () => setActiveModal('category') },
    { id: 'budget', icon: 'account-balance-wallet' as MaterialIconName, label: '월별 예산 관리', color: '#10B981', onPress: () => setActiveModal('budget') },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.accentMint }]}>
            <Text style={styles.avatarText}>
              {(userName || userEmail || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName || '사용자'}</Text>
            <Text style={styles.profileEmail}>{userEmail || ''}</Text>
          </View>
          <TouchableOpacity style={styles.profileSettingsButton} onPress={() => setActiveModal('account')}>
            <MaterialIcons name="settings" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.menuListCard}>
          {navigationMenuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuListItem, index === 0 && styles.menuItemFirst]}
              onPress={item.onPress}
            >
              <View style={[styles.menuListIcon, { backgroundColor: item.color + '20' }]}>
                <MaterialIcons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.menuListText}>{item.label}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.menuListCard, { marginTop: 16 }]}>
          {settingsMenuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuListItem, index === 0 && styles.menuItemFirst]}
              onPress={item.onPress}
            >
              <View style={[styles.menuListIcon, { backgroundColor: item.color + '20' }]}>
                <MaterialIcons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.menuListText}>{item.label}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Category Management Modal */}
      <Modal
        visible={activeModal === 'category'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal('none')}
      >
        <View style={styles.fullScreenModal}>
          <View style={styles.fullModalHeader}>
            <TouchableOpacity onPress={() => setActiveModal('none')}>
              <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.fullModalTitle}>카테고리 관리</Text>
            <View style={{ width: 24 }} />
          </View>
          {renderCategoryTab()}
        </View>
      </Modal>

      {/* Budget Management Modal */}
      <Modal
        visible={activeModal === 'budget'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal('none')}
      >
        <View style={styles.fullScreenModal}>
          <View style={styles.fullModalHeader}>
            <TouchableOpacity onPress={() => setActiveModal('none')}>
              <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.fullModalTitle}>월별 예산 관리</Text>
            <View style={{ width: 24 }} />
          </View>
          {renderBudgetTab()}
        </View>

        {/* Budget Edit Modal */}
        <BudgetEditModal
          visible={isBudgetModalOpen}
          category={getCategoryForBudget(editingBudgetCategory)}
          year={budgetDate.getFullYear()}
          month={budgetDate.getMonth() + 1}
          currentAmount={editingBudgetCategory ? (getBudgetForCategory(editingBudgetCategory.id)?.amount || 0) : 0}
          onClose={() => setIsBudgetModalOpen(false)}
          onSubmit={handleSaveBudget}
          isSubmitting={isBudgetSubmitting}
        />
      </Modal>

      {/* Calendar Modal */}
      <CalendarModal
        visible={activeModal === 'calendar'}
        onClose={() => setActiveModal('none')}
        transactions={calendarTransactions}
        isLoading={isLoadingCalendar}
        calendarDate={calendarDate}
        onPrevMonth={handleCalendarPrevMonth}
        onNextMonth={handleCalendarNextMonth}
        isPrevMonthDisabled={isCalendarPrevMonthDisabled()}
        isNextMonthDisabled={isCalendarNextMonthDisabled()}
      />

      {/* Account Settings Modal */}
      <Modal
        visible={activeModal === 'account'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal('none')}
      >
        <View style={styles.fullScreenModal}>
          <View style={styles.fullModalHeader}>
            <TouchableOpacity onPress={() => setActiveModal('none')}>
              <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.fullModalTitle}>계정 설정</Text>
            <View style={{ width: 24 }} />
          </View>
          {renderAccountTab()}
        </View>
      </Modal>

      {/* Category Edit Modal */}
      <CategoryEditModal
        visible={isCategoryModalOpen}
        mode={categoryModalMode}
        categoryType={categoryModalType}
        category={getCategoryForEdit(editingCategory)}
        onClose={() => setIsCategoryModalOpen(false)}
        onSubmit={handleCategorySubmit}
        onDelete={handleDeleteCategory}
        isSubmitting={isCategorySubmitting}
      />

      {/* Delete Account Modal */}
      <Modal
        visible={isDeleteAccountModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeleteAccountModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsDeleteAccountModalOpen(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#F87171' }]}>계정 삭제</Text>
              <TouchableOpacity
                onPress={() => setIsDeleteAccountModalOpen(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.dangerText, { marginBottom: 24 }]}>
                계정을 삭제하면 모든 거래 내역, 카테고리, 예산, 저축 목표 등 모든 데이터가 영구적으로 삭제됩니다.{'\n\n'}
                이 작업은 되돌릴 수 없습니다.
              </Text>

              <Text style={styles.inputLabel}>비밀번호 확인</Text>
              <TextInput
                style={styles.textInput}
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder="비밀번호를 입력하세요"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsDeleteAccountModalOpen(false);
                  setDeletePassword('');
                }}
                disabled={isDeletingAccount}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dangerButton, { flex: 1 }, isDeletingAccount && styles.saveButtonDisabled]}
                onPress={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                <Text style={styles.dangerButtonText}>
                  {isDeletingAccount ? '삭제 중...' : '계정 삭제'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
