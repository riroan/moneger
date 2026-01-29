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
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
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
import { getHolidayDaysInMonth, formatNumber } from '@moneger/shared';

type SettingTab = 'account' | 'category' | 'budget';
type SettingsModal = 'none' | 'category' | 'budget' | 'password' | 'account' | 'calendar';

// Transaction type for calendar
interface CalendarTransaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description?: string;
  date: string;
  categoryId?: string;
  savingsGoalId?: string | null;
  category?: {
    name: string;
    icon: string | null;
    color: string | null;
  };
}

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

const ICON_LIST = Object.keys(CATEGORY_ICONS);

const COLOR_LIST = [
  { name: '빨강', value: '#EF4444' },
  { name: '주황', value: '#F97316' },
  { name: '노랑', value: '#FBBF24' },
  { name: '라임', value: '#84CC16' },
  { name: '초록', value: '#10B981' },
  { name: '청록', value: '#14B8A6' },
  { name: '하늘', value: '#06B6D4' },
  { name: '파랑', value: '#3B82F6' },
  { name: '남색', value: '#6366F1' },
  { name: '보라', value: '#A855F7' },
  { name: '분홍', value: '#EC4899' },
  { name: '회색', value: '#6B7280' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { userId, userName, userEmail, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { showToast } = useToast();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<SettingTab>('account');
  const [activeModal, setActiveModal] = useState<SettingsModal>('none');

  // Category state
  const [categories, setCategories] = useState<CategoryWithBudget[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<'add' | 'edit'>('add');
  const [categoryModalType, setCategoryModalType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [editingCategory, setEditingCategory] = useState<CategoryWithBudget | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('money');
  const [categoryColor, setCategoryColor] = useState('#6366F1');
  const [categoryDefaultBudget, setCategoryDefaultBudget] = useState('');
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
  const [budgetAmount, setBudgetAmount] = useState('');
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
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

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
        // Convert budget response to BudgetItem array
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
      // Set today as default selected date if in current month
      const now = new Date();
      if (calendarDate.getFullYear() === now.getFullYear() && calendarDate.getMonth() === now.getMonth()) {
        setSelectedCalendarDate(now);
      } else {
        setSelectedCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1));
      }
    }
  }, [activeModal, fetchCalendarTransactions, fetchOldestDate, calendarDate]);

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
    setCategoryName('');
    setCategoryIcon('money');
    setCategoryColor('#6366F1');
    setCategoryDefaultBudget('');
    setShowDeleteConfirm(false);
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category: CategoryWithBudget) => {
    setCategoryModalMode('edit');
    setCategoryModalType(category.type);
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryIcon(category.icon || 'money');
    setCategoryColor(category.color || '#6366F1');
    setCategoryDefaultBudget(category.defaultBudget ? category.defaultBudget.toString() : '');
    setShowDeleteConfirm(false);
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async () => {
    if (!userId) return;

    if (!categoryName.trim()) {
      showToast('카테고리 이름을 입력해주세요', 'error');
      return;
    }

    setIsCategorySubmitting(true);
    try {
      const defaultBudget = categoryDefaultBudget ? parseInt(categoryDefaultBudget.replace(/,/g, ''), 10) : null;

      if (categoryModalMode === 'add') {
        const currentTypeCategories = categories.filter(c => c.type === categoryModalType);
        if (currentTypeCategories.length >= 20) {
          showToast(`${categoryModalType === 'INCOME' ? '수입' : '지출'} 카테고리는 최대 20개까지만 추가할 수 있습니다`, 'error');
          return;
        }

        const res = await categoryApi.create({
          userId,
          name: categoryName.trim(),
          type: categoryModalType,
          icon: categoryIcon,
          color: categoryColor,
          defaultBudget,
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
          name: categoryName.trim(),
          icon: categoryIcon,
          color: categoryColor,
          defaultBudget,
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
        setShowDeleteConfirm(false);
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
    const existingBudget = budgets.find(b => b.categoryId === category.id);
    setBudgetAmount(existingBudget ? existingBudget.amount.toLocaleString('ko-KR') : '');
    setIsBudgetModalOpen(true);
  };

  const handleSaveBudget = async () => {
    if (!userId || !editingBudgetCategory) return;

    const amount = parseInt(budgetAmount.replace(/,/g, '') || '0', 10);

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

  const formatBudgetInput = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    if (!num) return '';
    return parseInt(num, 10).toLocaleString('ko-KR');
  };

  const isBudgetPreviousMonthDisabled = () => {
    if (!oldestTransactionDate) return false;
    const oldestMonth = oldestTransactionDate.month - 1; // Convert to 0-indexed
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

  const incomeCategories = categories.filter(c => c.type === 'INCOME');
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

  const getBudgetForCategory = (categoryId: string) => {
    return budgets.find(b => b.categoryId === categoryId);
  };

  const renderCategoryIcon = (iconId: string, size: number = 20, color: string = '#fff') => {
    const iconName = CATEGORY_ICONS[iconId] || CATEGORY_ICONS.money;
    return <MaterialIcons name={iconName} size={size} color={color} />;
  };

  // Calendar helper functions
  const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

  const getCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const getTransactionsForDay = (day: number) => {
    return calendarTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getDate() === day;
    });
  };

  const getDayIndicators = (day: number) => {
    const txs = getTransactionsForDay(day);
    const hasIncome = txs.some(tx => tx.type === 'INCOME' && !tx.savingsGoalId);
    const hasExpense = txs.some(tx => tx.type === 'EXPENSE' && !tx.savingsGoalId);
    const hasSavings = txs.some(tx => tx.savingsGoalId);
    return { hasIncome, hasExpense, hasSavings };
  };

  const getSelectedDateTransactions = () => {
    if (!selectedCalendarDate) return [];
    return calendarTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getDate() === selectedCalendarDate.getDate();
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getSelectedDateSummary = () => {
    const txs = getSelectedDateTransactions();
    const income = txs.filter(tx => tx.type === 'INCOME' && !tx.savingsGoalId).reduce((sum, tx) => sum + tx.amount, 0);
    const expense = txs.filter(tx => tx.type === 'EXPENSE' && !tx.savingsGoalId).reduce((sum, tx) => sum + tx.amount, 0);
    const savings = txs.filter(tx => tx.savingsGoalId).reduce((sum, tx) => sum + tx.amount, 0);
    return { income, expense, savings };
  };

  const isCalendarPrevMonthDisabled = () => {
    if (!oldestTransactionDate) return false;
    const oldestMonth = oldestTransactionDate.month - 1; // Convert to 0-indexed
    return calendarDate.getFullYear() === oldestTransactionDate.year && calendarDate.getMonth() === oldestMonth;
  };

  const handleCalendarPrevMonth = () => {
    if (!isCalendarPrevMonthDisabled()) {
      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
    }
  };

  const handleCalendarNextMonth = () => {
    const nextMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
    const now = new Date();
    if (nextMonth <= new Date(now.getFullYear(), now.getMonth(), 1)) {
      setCalendarDate(nextMonth);
    }
  };

  const isCalendarNextMonthDisabled = () => {
    const nextMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
    const now = new Date();
    return nextMonth > new Date(now.getFullYear(), now.getMonth(), 1);
  };

  const isToday = (day: number) => {
    const now = new Date();
    return (
      calendarDate.getFullYear() === now.getFullYear() &&
      calendarDate.getMonth() === now.getMonth() &&
      day === now.getDate()
    );
  };

  const isSelectedDay = (day: number) => {
    if (!selectedCalendarDate) return false;
    return (
      calendarDate.getFullYear() === selectedCalendarDate.getFullYear() &&
      calendarDate.getMonth() === selectedCalendarDate.getMonth() &&
      day === selectedCalendarDate.getDate()
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    // Profile Section
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
    // Menu Grid
    menuGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 12,
      backgroundColor: colors.bgCard,
      borderRadius: 24,
      marginHorizontal: 16,
      marginTop: 8,
    },
    menuItem: {
      width: '25%',
      alignItems: 'center',
      paddingVertical: 16,
    },
    menuIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    menuLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    // Menu List (single-line layout)
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
    // Full Screen Modal
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
    passwordModalContent: {
      flex: 1,
      padding: 16,
    },
    header: {
      padding: 20,
      paddingTop: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    // Tab navigation (kept for backwards compatibility)
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      marginBottom: 16,
      gap: 8,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    tabButtonActive: {
      backgroundColor: colors.accentMint,
      borderColor: colors.accentMint,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.bgPrimary,
    },
    // Content section
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
    // Profile card
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
    avatarText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.bgPrimary,
    },
    // Form styles
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
    primaryButton: {
      backgroundColor: colors.accentMint,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.bgPrimary,
    },
    // Danger zone
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
    // Old Menu item (kept for backwards compat)
    menuItemOld: {
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
    // Logout
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
    // Category styles
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
    // Budget styles
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
    // Modal styles
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    budgetModalContainer: {
      width: '100%',
      alignItems: 'center',
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
    // Icon/Color grid
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButtonSelected: {
      backgroundColor: colors.accentMint,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    colorButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorButtonSelected: {
      borderWidth: 3,
      borderColor: '#fff',
    },
    // Delete confirm
    deleteConfirmBox: {
      backgroundColor: 'rgba(248, 113, 113, 0.1)',
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      borderWidth: 1,
      borderColor: '#F87171',
    },
    deleteConfirmText: {
      fontSize: 13,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 12,
      lineHeight: 20,
    },
    deleteConfirmButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    deleteConfirmCancel: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
    },
    deleteConfirmCancelText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    deleteConfirmDelete: {
      flex: 1,
      backgroundColor: '#F87171',
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
    },
    deleteConfirmDeleteText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    // Amount input
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    currencySymbol: {
      fontSize: 16,
      color: colors.textSecondary,
      marginRight: 4,
    },
    amountInput: {
      flex: 1,
      fontSize: 16,
      color: colors.textPrimary,
      paddingVertical: 14,
    },
    loadingContainer: {
      padding: 32,
      alignItems: 'center',
    },
    budgetEditModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    budgetEditModalContent: {
      width: '90%',
      maxWidth: 400,
      backgroundColor: colors.bgCard,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    // Calendar styles
    calendarContainer: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    calendarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    calendarTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    calendarMonthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    calendarMonthText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      minWidth: 100,
      textAlign: 'center',
    },
    calendarNavButton: {
      padding: 8,
    },
    calendarNavButtonDisabled: {
      opacity: 0.3,
    },
    calendarGrid: {
      paddingHorizontal: 12,
      paddingTop: 12,
    },
    calendarDayNames: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    calendarDayName: {
      flex: 1,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '600',
      paddingVertical: 8,
    },
    calendarWeekRow: {
      flexDirection: 'row',
    },
    calendarDayCell: {
      flex: 1,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      margin: 2,
      borderRadius: 8,
    },
    calendarDayCellSelected: {
      borderWidth: 2,
      borderColor: colors.accentMint,
    },
    calendarDayCellToday: {
      backgroundColor: colors.bgSecondary,
    },
    calendarDayText: {
      fontSize: 14,
      color: colors.textPrimary,
    },
    calendarDayTextSunday: {
      color: '#EF4444',
    },
    calendarDayTextSaturday: {
      color: '#3B82F6',
    },
    calendarDayTextMuted: {
      color: colors.textMuted,
    },
    calendarIndicators: {
      flexDirection: 'row',
      gap: 3,
      marginTop: 2,
      height: 6,
    },
    calendarIndicatorDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    calendarSelectedSection: {
      backgroundColor: colors.bgCard,
      marginHorizontal: 12,
      marginTop: 16,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    calendarSelectedHeader: {
      marginBottom: 12,
    },
    calendarSelectedDate: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    calendarSelectedSummary: {
      flexDirection: 'row',
      gap: 12,
    },
    calendarSummaryIncome: {
      fontSize: 14,
      color: colors.accentMint,
      fontWeight: '500',
    },
    calendarSummaryExpense: {
      fontSize: 14,
      color: colors.accentCoral,
      fontWeight: '500',
    },
    calendarTransactionList: {
      gap: 8,
    },
    calendarTransactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    calendarTransactionItemLast: {
      borderBottomWidth: 0,
    },
    calendarTransactionIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    calendarTransactionInfo: {
      flex: 1,
    },
    calendarTransactionCategory: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    calendarTransactionDate: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    calendarTransactionAmount: {
      fontSize: 14,
      fontWeight: '600',
    },
    calendarEmptyText: {
      textAlign: 'center',
      color: colors.textMuted,
      paddingVertical: 20,
    },
  });

  const renderAccountTab = () => (
    <ScrollView>
      {/* Profile */}
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

      {/* App Settings */}
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

      {/* Password Change */}
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

      {/* Delete Account */}
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
      {/* Income Categories */}
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

      {/* Expense Categories */}
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
      {/* Month Selector */}
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

      {/* Budget List */}
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

  // Navigation menu items
  const navigationMenuItems = [
    { id: 'calendar', icon: 'calendar-today' as MaterialIconName, label: '일별 내역', color: '#10B981', onPress: () => setActiveModal('calendar') },
    { id: 'transactions', icon: 'receipt-long' as MaterialIconName, label: '거래 내역', color: '#3B82F6', onPress: () => router.push('/(tabs)/transactions') },
    { id: 'savings', icon: 'savings' as MaterialIconName, label: '저축 목표', color: '#F59E0B', onPress: () => router.push('/(tabs)/savings') },
  ];

  // Settings menu items
  const settingsMenuItems = [
    { id: 'category', icon: 'category' as MaterialIconName, label: '카테고리 관리', color: '#6366F1', onPress: () => setActiveModal('category') },
    { id: 'budget', icon: 'account-balance-wallet' as MaterialIconName, label: '월별 예산 관리', color: '#10B981', onPress: () => setActiveModal('budget') },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
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

        {/* Navigation Menu */}
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

        {/* Settings Menu */}
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

        {/* Budget Edit Modal (nested inside Budget Management Modal) */}
        <Modal
          visible={isBudgetModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsBudgetModalOpen(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <TouchableWithoutFeedback onPress={() => {
              Keyboard.dismiss();
              setIsBudgetModalOpen(false);
            }}>
              <View style={styles.budgetEditModalOverlay}>
                <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                  <View style={styles.budgetEditModalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>예산 설정</Text>
                    <TouchableOpacity
                      onPress={() => setIsBudgetModalOpen(false)}
                      style={styles.modalCloseButton}
                    >
                      <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {editingBudgetCategory && (
                    <View style={styles.modalBody}>
                      <View style={[styles.budgetItem, { marginHorizontal: 0 }]}>
                        <View style={styles.budgetItemHeader}>
                          <View
                            style={[
                              styles.budgetItemIcon,
                              { backgroundColor: `${editingBudgetCategory.color || '#888'}20` },
                            ]}
                          >
                            {renderCategoryIcon(
                              editingBudgetCategory.icon || 'money',
                              20,
                              editingBudgetCategory.color || '#888'
                            )}
                          </View>
                          <View style={styles.budgetItemInfo}>
                            <Text style={styles.budgetItemName}>{editingBudgetCategory.name}</Text>
                            <Text style={styles.budgetItemDefault}>
                              {budgetDate.getFullYear()}년 {budgetDate.getMonth() + 1}월 예산
                            </Text>
                          </View>
                        </View>
                      </View>

                      <Text style={[styles.inputLabel, { marginTop: 16 }]}>예산 금액</Text>
                      <View style={styles.amountInputContainer}>
                        <Text style={styles.currencySymbol}>₩</Text>
                        <TextInput
                          style={styles.amountInput}
                          value={budgetAmount}
                          onChangeText={(text) => setBudgetAmount(formatBudgetInput(text))}
                          placeholder="0"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="number-pad"
                        />
                      </View>

                      {editingBudgetCategory.defaultBudget && editingBudgetCategory.defaultBudget > 0 && (
                        <TouchableOpacity
                          style={[styles.addCategoryButton, { alignSelf: 'flex-start', marginTop: 8 }]}
                          onPress={() => setBudgetAmount(formatNumber(editingBudgetCategory.defaultBudget || 0))}
                        >
                          <Text style={styles.addCategoryButtonText}>
                            기본 예산 적용 (₩{formatNumber(editingBudgetCategory.defaultBudget)})
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setIsBudgetModalOpen(false)}
                      disabled={isBudgetSubmitting}
                    >
                      <Text style={styles.cancelButtonText}>취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveButton, isBudgetSubmitting && styles.saveButtonDisabled]}
                      onPress={handleSaveBudget}
                      disabled={isBudgetSubmitting}
                    >
                      <Text style={styles.saveButtonText}>
                        {isBudgetSubmitting ? '저장 중...' : '저장'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        visible={activeModal === 'calendar'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal('none')}
      >
        <View style={styles.calendarContainer}>
          {/* Header */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => setActiveModal('none')}>
              <MaterialIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.calendarMonthNav}>
              <TouchableOpacity
                style={[
                  styles.calendarNavButton,
                  isCalendarPrevMonthDisabled() && styles.calendarNavButtonDisabled,
                ]}
                onPress={handleCalendarPrevMonth}
                disabled={isCalendarPrevMonthDisabled()}
              >
                <MaterialIcons name="chevron-left" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.calendarMonthText}>
                {calendarDate.getFullYear()}년 {calendarDate.getMonth() + 1}월
              </Text>
              <TouchableOpacity
                style={[
                  styles.calendarNavButton,
                  isCalendarNextMonthDisabled() && styles.calendarNavButtonDisabled,
                ]}
                onPress={handleCalendarNextMonth}
                disabled={isCalendarNextMonthDisabled()}
              >
                <MaterialIcons name="chevron-right" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView>
            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {/* Day names */}
              <View style={styles.calendarDayNames}>
                {DAY_NAMES.map((day, index) => (
                  <Text
                    key={day}
                    style={[
                      styles.calendarDayName,
                      index === 0 && styles.calendarDayTextSunday,
                      index === 6 && styles.calendarDayTextSaturday,
                      index !== 0 && index !== 6 && { color: colors.textSecondary },
                    ]}
                  >
                    {day}
                  </Text>
                ))}
              </View>

              {/* Calendar days */}
              {isLoadingCalendar ? (
                <ActivityIndicator size="large" color={colors.accentMint} style={{ padding: 40 }} />
              ) : (
                (() => {
                  const days = getCalendarDays();
                  const weeks: (number | null)[][] = [];
                  for (let i = 0; i < days.length; i += 7) {
                    weeks.push(days.slice(i, i + 7));
                  }
                  // Pad the last week if needed
                  const lastWeek = weeks[weeks.length - 1];
                  while (lastWeek && lastWeek.length < 7) {
                    lastWeek.push(null);
                  }

                  return weeks.map((week, weekIndex) => (
                    <View key={weekIndex} style={styles.calendarWeekRow}>
                      {week.map((day, dayIndex) => {
                        if (day === null) {
                          return <View key={`empty-${dayIndex}`} style={styles.calendarDayCell} />;
                        }

                        const indicators = getDayIndicators(day);
                        const isSunday = dayIndex === 0;
                        const isSaturday = dayIndex === 6;
                        const holidayDays = getHolidayDaysInMonth(calendarDate.getFullYear(), calendarDate.getMonth() + 1);
                        const isHoliday = holidayDays.has(day);

                        return (
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.calendarDayCell,
                              isToday(day) && styles.calendarDayCellToday,
                              isSelectedDay(day) && styles.calendarDayCellSelected,
                            ]}
                            onPress={() => setSelectedCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day))}
                          >
                            <Text
                              style={[
                                styles.calendarDayText,
                                (isSunday || isHoliday) && styles.calendarDayTextSunday,
                                isSaturday && !isHoliday && styles.calendarDayTextSaturday,
                              ]}
                            >
                              {day}
                            </Text>
                            <View style={styles.calendarIndicators}>
                              {indicators.hasIncome && (
                                <View style={[styles.calendarIndicatorDot, { backgroundColor: colors.accentMint }]} />
                              )}
                              {indicators.hasExpense && (
                                <View style={[styles.calendarIndicatorDot, { backgroundColor: colors.accentCoral }]} />
                              )}
                              {indicators.hasSavings && (
                                <View style={[styles.calendarIndicatorDot, { backgroundColor: '#3B82F6' }]} />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ));
                })()
              )}
            </View>

            {/* Selected Date Section */}
            {selectedCalendarDate && (
              <View style={styles.calendarSelectedSection}>
                <View style={styles.calendarSelectedHeader}>
                  <Text style={styles.calendarSelectedDate}>
                    {selectedCalendarDate.getMonth() + 1}월 {selectedCalendarDate.getDate()}일
                  </Text>
                  <View style={styles.calendarSelectedSummary}>
                    <Text style={styles.calendarSummaryIncome}>
                      +{formatNumber(getSelectedDateSummary().income)}
                    </Text>
                    <Text style={styles.calendarSummaryExpense}>
                      -{formatNumber(getSelectedDateSummary().expense)}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#3B82F6', fontWeight: '500' }}>
                      -{formatNumber(getSelectedDateSummary().savings)}
                    </Text>
                  </View>
                </View>

                <View style={styles.calendarTransactionList}>
                  {getSelectedDateTransactions().length === 0 ? (
                    <Text style={styles.calendarEmptyText}>거래 내역이 없습니다</Text>
                  ) : (
                    getSelectedDateTransactions().map((tx, index, arr) => (
                      <View
                        key={tx.id}
                        style={[
                          styles.calendarTransactionItem,
                          index === arr.length - 1 && styles.calendarTransactionItemLast,
                        ]}
                      >
                        <View
                          style={[
                            styles.calendarTransactionIcon,
                            { backgroundColor: tx.savingsGoalId ? '#3B82F620' : (tx.category?.color || '#6B7280') + '20' },
                          ]}
                        >
                          {tx.savingsGoalId ? (
                            <MaterialIcons name="savings" size={18} color="#3B82F6" />
                          ) : tx.category?.icon ? (
                            renderCategoryIcon(tx.category.icon, 18, tx.category.color || '#6B7280')
                          ) : (
                            <MaterialIcons name="attach-money" size={18} color="#6B7280" />
                          )}
                        </View>
                        <View style={styles.calendarTransactionInfo}>
                          <Text style={styles.calendarTransactionCategory}>
                            {tx.savingsGoalId ? (tx.description || '저축') : (tx.description || tx.category?.name || '기타')}
                          </Text>
                          <Text style={styles.calendarTransactionDate}>
                            {new Date(tx.date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            {tx.savingsGoalId ? ' · 저축' : (tx.category?.name && tx.description ? ` · ${tx.category.name}` : '')}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.calendarTransactionAmount,
                            { color: tx.savingsGoalId ? '#3B82F6' : (tx.type === 'INCOME' ? colors.accentMint : colors.accentCoral) },
                          ]}
                        >
                          {tx.savingsGoalId ? '-' : (tx.type === 'INCOME' ? '+' : '-')}₩{formatNumber(tx.amount)}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        visible={activeModal === 'password'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal('none')}
      >
        <View style={styles.fullScreenModal}>
          <View style={styles.fullModalHeader}>
            <TouchableOpacity onPress={() => setActiveModal('none')}>
              <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.fullModalTitle}>비밀번호 변경</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.passwordModalContent}>
            <View style={styles.card}>
              <Text style={styles.inputLabel}>현재 비밀번호</Text>
              <TextInput
                style={styles.textInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="현재 비밀번호 입력"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>새 비밀번호</Text>
              <TextInput
                style={styles.textInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="새 비밀번호 입력 (6자 이상)"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>새 비밀번호 확인</Text>
              <TextInput
                style={styles.textInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="새 비밀번호 다시 입력"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.primaryButton, { marginTop: 24 }]}
                onPress={handleChangePassword}
                disabled={isChangingPassword}
              >
                <Text style={styles.primaryButtonText}>
                  {isChangingPassword ? '변경 중...' : '비밀번호 변경'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

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

      {/* Category Modal */}
      <Modal
        visible={isCategoryModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCategoryModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsCategoryModalOpen(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {categoryModalMode === 'add' ? '카테고리 추가' : '카테고리 수정'}
              </Text>
              <TouchableOpacity
                onPress={() => setIsCategoryModalOpen(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>카테고리 이름</Text>
              <TextInput
                style={styles.textInput}
                value={categoryName}
                onChangeText={setCategoryName}
                placeholder="예: 식비, 교통비"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>아이콘</Text>
              <View style={styles.iconGrid}>
                {ICON_LIST.map((iconId) => (
                  <TouchableOpacity
                    key={iconId}
                    style={[
                      styles.iconButton,
                      categoryIcon === iconId && styles.iconButtonSelected,
                    ]}
                    onPress={() => setCategoryIcon(iconId)}
                  >
                    {renderCategoryIcon(
                      iconId,
                      20,
                      categoryIcon === iconId ? colors.bgPrimary : colors.textSecondary
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>색상</Text>
              <View style={styles.colorGrid}>
                {COLOR_LIST.map((color) => (
                  <TouchableOpacity
                    key={color.value}
                    style={[
                      styles.colorButton,
                      { backgroundColor: color.value },
                      categoryColor === color.value && styles.colorButtonSelected,
                    ]}
                    onPress={() => setCategoryColor(color.value)}
                  >
                    {categoryColor === color.value && (
                      <MaterialIcons name="check" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {categoryModalType === 'EXPENSE' && (
                <>
                  <Text style={styles.inputLabel}>기본 예산 (선택)</Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencySymbol}>₩</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={categoryDefaultBudget}
                      onChangeText={(text) => setCategoryDefaultBudget(formatBudgetInput(text))}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                    />
                  </View>
                </>
              )}

              {categoryModalMode === 'edit' && !showDeleteConfirm && (
                <View style={styles.deleteConfirmBox}>
                  <Text style={styles.deleteConfirmText}>
                    카테고리를 삭제하시겠습니까?
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteConfirmDelete}
                    onPress={() => setShowDeleteConfirm(true)}
                  >
                    <Text style={styles.deleteConfirmDeleteText}>삭제하기</Text>
                  </TouchableOpacity>
                </View>
              )}

              {showDeleteConfirm && (
                <View style={styles.deleteConfirmBox}>
                  <Text style={styles.deleteConfirmText}>
                    '{editingCategory?.name}' 카테고리를 삭제하시겠습니까?{'\n'}이 작업은 되돌릴 수 없습니다.
                  </Text>
                  <View style={styles.deleteConfirmButtons}>
                    <TouchableOpacity
                      style={styles.deleteConfirmCancel}
                      onPress={() => setShowDeleteConfirm(false)}
                      disabled={isCategorySubmitting}
                    >
                      <Text style={styles.deleteConfirmCancelText}>취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.deleteConfirmDelete, isCategorySubmitting && styles.saveButtonDisabled]}
                      onPress={handleDeleteCategory}
                      disabled={isCategorySubmitting}
                    >
                      <Text style={styles.deleteConfirmDeleteText}>
                        {isCategorySubmitting ? '삭제 중...' : '삭제'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsCategoryModalOpen(false)}
                disabled={isCategorySubmitting}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isCategorySubmitting && styles.saveButtonDisabled]}
                onPress={handleCategorySubmit}
                disabled={isCategorySubmitting}
              >
                <Text style={styles.saveButtonText}>
                  {isCategorySubmitting ? '저장 중...' : '저장'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={isDeleteAccountModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeleteAccountModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
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
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
