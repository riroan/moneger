import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { MaterialIconName } from '../../constants/Icons';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useRefreshStore } from '../../stores/refreshStore';
import { useToast } from '../../contexts/ToastContext';
import { Colors } from '../../constants/Colors';
import { savingsApi, SavingsGoal } from '../../lib/api';
import { AMOUNT_LIMITS, SAVINGS_GOAL, formatNumber, formatAmountInput } from '@moneger/shared';

const MAX_GOALS = SAVINGS_GOAL.MAX_COUNT;

// Icon mapping for savings goals
const GOAL_ICONS: Record<string, MaterialIconName> = {
  home: 'home',
  car: 'directions-car',
  school: 'school',
  travel: 'flight',
  device: 'devices',
  gift: 'card-giftcard',
  health: 'favorite',
  savings: 'savings',
};

// Quick amount options for deposit
const QUICK_AMOUNTS = [10000, 50000, 100000, 500000];

export default function SavingsScreen() {
  const { userId } = useAuthStore();
  const { theme } = useThemeStore();
  const { triggerRefresh } = useRefreshStore();
  const { showToast } = useToast();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);

  // Add modal form states
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalIcon, setNewGoalIcon] = useState('savings');
  const [newGoalTargetAmount, setNewGoalTargetAmount] = useState('');
  const [newGoalCurrentAmount, setNewGoalCurrentAmount] = useState('');
  const [newGoalStartYear, setNewGoalStartYear] = useState(new Date().getFullYear());
  const [newGoalStartMonth, setNewGoalStartMonth] = useState(new Date().getMonth() + 1);
  const [newGoalTargetYear, setNewGoalTargetYear] = useState(new Date().getFullYear() + 1);
  const [newGoalTargetMonth, setNewGoalTargetMonth] = useState(12);
  const [isSaving, setIsSaving] = useState(false);

  // Deposit modal form states
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositAmountExceeded, setDepositAmountExceeded] = useState(false);

  // Add modal amount exceeded states
  const [targetAmountExceeded, setTargetAmountExceeded] = useState(false);
  const [currentAmountExceeded, setCurrentAmountExceeded] = useState(false);

  // Edit modal amount exceeded state
  const [editTargetAmountExceeded, setEditTargetAmountExceeded] = useState(false);

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [editGoalName, setEditGoalName] = useState('');
  const [editGoalIcon, setEditGoalIcon] = useState('savings');
  const [editGoalTargetAmount, setEditGoalTargetAmount] = useState('');
  const [editGoalTargetYear, setEditGoalTargetYear] = useState(new Date().getFullYear() + 1);
  const [editGoalTargetMonth, setEditGoalTargetMonth] = useState(12);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditDeleteConfirm, setShowEditDeleteConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const res = await savingsApi.getAll(userId);
      if (res.success && res.data) {
        setGoals(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch savings:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // 큰 숫자를 간결하게 표시 (억, 조 단위)
  const formatCompactNumber = (amount: number) => {
    if (amount >= 1_000_000_000_000) {
      const jo = Math.floor(amount / 1_000_000_000_000);
      const eok = Math.floor((amount % 1_000_000_000_000) / 100_000_000);
      if (eok > 0) {
        return `${jo}조 ${eok}억`;
      }
      return `${jo}조`;
    }
    if (amount >= 100_000_000) {
      const eok = Math.floor(amount / 100_000_000);
      const man = Math.floor((amount % 100_000_000) / 10_000);
      if (man > 0) {
        return `${eok}억 ${formatNumber(man)}만`;
      }
      return `${eok}억`;
    }
    if (amount >= 10_000) {
      const man = Math.floor(amount / 10_000);
      return `${formatNumber(man)}만`;
    }
    return formatNumber(amount);
  };

  // Calculate totals
  const totalSavings = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalMonthlyRemaining = goals.reduce(
    (sum, goal) => sum + Math.max(0, goal.monthlyTarget - goal.thisMonthSavings),
    0
  );
  const overallProgress = totalTarget > 0 ? Math.round((totalSavings / totalTarget) * 100) : 0;

  const renderGoalIcon = (iconName: string, size: number = 20, color: string = '#FBBF24') => {
    const iconKey = GOAL_ICONS[iconName] || GOAL_ICONS.savings;
    return <MaterialIcons name={iconKey} size={size} color={color} />;
  };

  // Reset add modal form
  const resetAddModal = () => {
    setNewGoalName('');
    setNewGoalIcon('savings');
    setNewGoalTargetAmount('');
    setNewGoalCurrentAmount('');
    const now = new Date();
    setNewGoalStartYear(now.getFullYear());
    setNewGoalStartMonth(now.getMonth() + 1);
    setNewGoalTargetYear(now.getFullYear() + 1);
    setNewGoalTargetMonth(12);
    setTargetAmountExceeded(false);
    setCurrentAmountExceeded(false);
  };

  // Handle add goal
  const handleAddGoal = async () => {
    if (!userId) return;

    if (!newGoalName.trim()) {
      showToast('목표 이름을 입력해주세요', 'error');
      return;
    }

    const targetNum = parseInt(newGoalTargetAmount.replace(/,/g, '') || '0', 10);
    if (targetNum <= 0) {
      showToast('목표 금액을 입력해주세요', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await savingsApi.create({
        userId,
        name: newGoalName.trim(),
        icon: newGoalIcon,
        targetAmount: targetNum,
        currentAmount: parseInt(newGoalCurrentAmount.replace(/,/g, '') || '0', 10),
        startYear: newGoalStartYear,
        startMonth: newGoalStartMonth,
        targetYear: newGoalTargetYear,
        targetMonth: newGoalTargetMonth,
      });

      if (res.success) {
        showToast('저축 목표가 추가되었습니다', 'success');
        setIsAddModalOpen(false);
        resetAddModal();
        fetchData();
        triggerRefresh();
      } else {
        showToast(res.error || '저축 목표 추가에 실패했습니다', 'error');
      }
    } catch (error) {
      showToast('저축 목표 추가에 실패했습니다', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle deposit
  const handleDeposit = async () => {
    if (!userId || !selectedGoal) return;

    const depositNum = parseInt(depositAmount.replace(/,/g, '') || '0', 10);
    if (depositNum <= 0) {
      showToast('저축 금액을 입력해주세요', 'error');
      return;
    }

    setIsDepositing(true);
    try {
      const res = await savingsApi.deposit(selectedGoal.id, userId, depositNum);

      if (res.success) {
        showToast('저축이 완료되었습니다', 'success');
        setIsDepositModalOpen(false);
        setSelectedGoal(null);
        setDepositAmount('');
        fetchData();
        triggerRefresh();
      } else {
        showToast(res.error || '저축에 실패했습니다', 'error');
      }
    } catch (error) {
      showToast('저축에 실패했습니다', 'error');
    } finally {
      setIsDepositing(false);
    }
  };

  // Handle delete goal
  const handleDeleteGoal = (goal: SavingsGoal) => {
    Alert.alert(
      '저축 목표 삭제',
      `'${goal.name}' 목표를 삭제하시겠습니까?\n\n삭제하면 저축 내역도 함께 삭제됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            if (!userId) return;
            try {
              const res = await savingsApi.delete(goal.id, userId);
              if (res.success) {
                showToast('저축 목표가 삭제되었습니다', 'success');
                fetchData();
                triggerRefresh();
              } else {
                showToast(res.error || '삭제에 실패했습니다', 'error');
              }
            } catch (error) {
              showToast('삭제에 실패했습니다', 'error');
            }
          },
        },
      ]
    );
  };

  // Open deposit modal
  const openDepositModal = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setDepositAmount('');
    setDepositAmountExceeded(false);
    setIsDepositModalOpen(true);
  };

  // Handle quick amount
  const handleQuickAmount = (amount: number) => {
    const current = parseInt(depositAmount.replace(/,/g, '') || '0', 10);
    const newAmount = current + amount;
    if (newAmount > AMOUNT_LIMITS.TRANSACTION_MAX) {
      setDepositAmountExceeded(true);
      setDepositAmount(formatNumber(AMOUNT_LIMITS.TRANSACTION_MAX));
    } else {
      setDepositAmountExceeded(false);
      setDepositAmount(formatNumber(newAmount));
    }
  };

  // Format input as currency with max limit (using shared formatAmountInput)
  const formatInputAmountWithCheck = (text: string, maxAmount: number = AMOUNT_LIMITS.MAX) =>
    formatAmountInput(text, maxAmount);

  // Handle toggle primary goal (same as web implementation)
  const handleTogglePrimary = async (goal: SavingsGoal) => {
    if (!userId) return;

    try {
      const res = await savingsApi.togglePrimary(goal.id, userId, !goal.isPrimary);

      if (res.success) {
        showToast(
          goal.isPrimary ? '대표 저축이 해제되었습니다' : '대표 저축으로 설정되었습니다',
          'success'
        );
        fetchData();
        triggerRefresh();
      } else {
        showToast(res.error || '대표 저축 변경에 실패했습니다', 'error');
      }
    } catch (error) {
      showToast('대표 저축 변경에 실패했습니다', 'error');
    }
  };

  // Parse target date string to year and month
  const parseTargetDate = (targetDate: string): { year: number; month: number } => {
    const match = targetDate.match(/(\d{4})년\s*(\d{1,2})월/);
    if (match) {
      return { year: parseInt(match[1], 10), month: parseInt(match[2], 10) };
    }
    return { year: new Date().getFullYear() + 1, month: 12 };
  };

  // Open edit modal
  const openEditModal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setEditGoalName(goal.name);
    setEditGoalIcon(goal.icon);
    setEditGoalTargetAmount(formatNumber(goal.targetAmount));
    const { year, month } = parseTargetDate(goal.targetDate);
    setEditGoalTargetYear(year);
    setEditGoalTargetMonth(month);
    setShowEditDeleteConfirm(false);
    setEditTargetAmountExceeded(false);
    setIsEditModalOpen(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingGoal(null);
    setShowEditDeleteConfirm(false);
    setEditTargetAmountExceeded(false);
  };

  // Handle edit goal
  const handleEditGoal = async () => {
    if (!userId || !editingGoal) return;

    if (!editGoalName.trim()) {
      showToast('목표 이름을 입력해주세요', 'error');
      return;
    }

    const targetNum = parseInt(editGoalTargetAmount.replace(/,/g, '') || '0', 10);
    if (targetNum <= 0) {
      showToast('목표 금액을 입력해주세요', 'error');
      return;
    }

    setIsEditing(true);
    try {
      const res = await savingsApi.update(editingGoal.id, {
        userId,
        name: editGoalName.trim(),
        icon: editGoalIcon,
        targetAmount: targetNum,
        targetYear: editGoalTargetYear,
        targetMonth: editGoalTargetMonth,
      });

      if (res.success) {
        showToast('저축 목표가 수정되었습니다', 'success');
        closeEditModal();
        fetchData();
        triggerRefresh();
      } else {
        showToast(res.error || '저축 목표 수정에 실패했습니다', 'error');
      }
    } catch (error) {
      showToast('저축 목표 수정에 실패했습니다', 'error');
    } finally {
      setIsEditing(false);
    }
  };

  // Handle delete from edit modal
  const handleDeleteFromEdit = async () => {
    if (!userId || !editingGoal) return;

    setIsEditing(true);
    try {
      const res = await savingsApi.delete(editingGoal.id, userId);
      if (res.success) {
        showToast('저축 목표가 삭제되었습니다', 'success');
        closeEditModal();
        fetchData();
        triggerRefresh();
      } else {
        showToast(res.error || '삭제에 실패했습니다', 'error');
      }
    } catch (error) {
      showToast('삭제에 실패했습니다', 'error');
    } finally {
      setIsEditing(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Summary cards
    summarySection: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    summaryCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    summaryValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    summaryValueMint: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.accentMint,
    },
    summaryValueBlue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#3B82F6',
    },
    summarySubtext: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 4,
    },
    summaryNeeded: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: 'normal',
    },
    progressBarContainer: {
      height: 8,
      backgroundColor: colors.bgSecondary,
      borderRadius: 4,
      overflow: 'hidden',
      marginTop: 8,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: colors.accentMint,
    },
    // Goals section
    goalsSection: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    sectionCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    sectionCount: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: 'normal',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    addButtonText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    // Goal card
    goalCard: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
    },
    goalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    goalIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: 'rgba(251, 191, 36, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    goalStarBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    goalInfo: {
      flex: 1,
    },
    goalNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    goalName: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    goalPrimaryBadge: {
      fontSize: 11,
      color: '#FBBF24',
      fontWeight: '500',
    },
    goalDate: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    goalAmountContainer: {
      alignItems: 'flex-end',
      marginBottom: 12,
    },
    goalCurrentAmount: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    goalTargetRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    goalTargetAmount: {
      fontSize: 12,
      color: colors.textMuted,
    },
    goalPercent: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.accentMint,
      marginLeft: 4,
    },
    goalProgressBar: {
      height: 8,
      backgroundColor: colors.bgCard,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 12,
    },
    goalProgressFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: colors.accentMint,
    },
    goalFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    depositButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(52, 211, 153, 0.15)',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
    },
    depositButtonText: {
      fontSize: 13,
      color: colors.accentMint,
      fontWeight: '500',
    },
    goalMonthlyStatus: {
      alignItems: 'flex-end',
      flexShrink: 1,
      maxWidth: '55%',
    },
    goalMonthlyLabel: {
      fontSize: 11,
      color: colors.textMuted,
      marginBottom: 2,
    },
    goalMonthlyComplete: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.accentMint,
    },
    goalMonthlyNeeded: {
      fontSize: 13,
      color: colors.textPrimary,
    },
    goalMonthlyNeededLabel: {
      color: colors.textMuted,
    },
    // Empty state
    emptyState: {
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 8,
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
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
      marginTop: 16,
    },
    textInput: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButtonSelected: {
      backgroundColor: colors.accentMint,
    },
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    amountInputExceeded: {
      borderColor: '#F87171',
      borderWidth: 2,
    },
    amountExceededText: {
      fontSize: 12,
      color: '#F87171',
      marginTop: 6,
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
    dateRow: {
      flexDirection: 'row',
      gap: 12,
    },
    datePickerContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateButton: {
      padding: 4,
    },
    dateText: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '500',
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
      color: '#0D1117',
    },
    // Deposit Modal styles
    depositGoalInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgSecondary,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
    },
    depositGoalIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: 'rgba(251, 191, 36, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    depositGoalDetails: {
      flex: 1,
    },
    depositGoalName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    depositGoalProgress: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    depositGoalPercent: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.accentMint,
    },
    remainingAmountBox: {
      backgroundColor: 'rgba(52, 211, 153, 0.1)',
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      marginBottom: 16,
    },
    remainingAmountLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 4,
    },
    remainingAmountValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.accentMint,
    },
    quickAmountsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    quickAmountButton: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    quickAmountText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    fullAmountButton: {
      backgroundColor: 'rgba(52, 211, 153, 0.2)',
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginTop: 8,
      alignSelf: 'flex-start',
    },
    fullAmountText: {
      fontSize: 12,
      color: colors.accentMint,
    },
    depositPreview: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 12,
      marginTop: 16,
    },
    depositPreviewLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 8,
    },
    depositPreviewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    depositPreviewAmount: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    depositPreviewPercent: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.accentMint,
    },
    depositPreviewBar: {
      height: 8,
      backgroundColor: colors.bgCard,
      borderRadius: 4,
      overflow: 'hidden',
      marginTop: 8,
    },
    depositPreviewBarFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: colors.accentMint,
    },
    // Edit Modal styles
    editReadOnlyHint: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 4,
    },
    editModalButtons: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 20,
    },
    editDeleteButton: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#F87171',
    },
    editDeleteButtonText: {
      fontSize: 15,
      fontWeight: '500',
      color: '#F87171',
    },
    editDeleteConfirmBox: {
      backgroundColor: 'rgba(248, 113, 113, 0.1)',
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      borderWidth: 1,
      borderColor: '#F87171',
    },
    editDeleteConfirmText: {
      fontSize: 13,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 12,
      lineHeight: 20,
    },
    editDeleteConfirmButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    editDeleteConfirmCancel: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
    },
    editDeleteConfirmCancelText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    editDeleteConfirmDelete: {
      flex: 1,
      backgroundColor: '#F87171',
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
    },
    editDeleteConfirmDeleteText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentMint} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentMint}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>저축</Text>
          <Text style={styles.subtitle}>목표를 향해 차근차근 모아보세요</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summarySection}>
          {/* Total Savings */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>총 저축액</Text>
            <Text style={styles.summaryValue}>₩{formatNumber(totalSavings)}</Text>
            <Text style={styles.summarySubtext}>목표 ₩{formatNumber(totalTarget)}</Text>
          </View>

          {/* This Month */}
          <View style={[styles.summaryCard, { marginTop: 12 }]}>
            <Text style={styles.summaryLabel}>이번 달 저축</Text>
            {totalMonthlyRemaining === 0 ? (
              <Text style={styles.summaryValueMint}>목표 달성!</Text>
            ) : (
              <Text style={styles.summaryValue} numberOfLines={1}>
                {formatCompactNumber(totalMonthlyRemaining)}
                <Text style={styles.summaryNeeded}> 더 필요</Text>
              </Text>
            )}
            <Text style={styles.summarySubtext}>{goals.length}개 목표 기준</Text>
          </View>

          {/* Overall Progress */}
          <View style={[styles.summaryCard, { marginTop: 12 }]}>
            <Text style={styles.summaryLabel}>전체 달성률</Text>
            <Text style={styles.summaryValueBlue}>{overallProgress}%</Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(overallProgress, 100)}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Goals Section */}
        <View style={styles.goalsSection}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <MaterialIcons name="savings" size={20} color="#FBBF24" />
                <Text style={styles.sectionTitle}>
                  저축 목표 <Text style={styles.sectionCount}>({goals.length}/{MAX_GOALS})</Text>
                </Text>
              </View>
              {goals.length < MAX_GOALS && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setIsAddModalOpen(true)}
                >
                  <MaterialIcons name="add" size={14} color={colors.textMuted} />
                  <Text style={styles.addButtonText}>목표 추가</Text>
                </TouchableOpacity>
              )}
            </View>

            {goals.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="savings" size={40} color={colors.textMuted} />
                <Text style={styles.emptyText}>저축 목표가 없습니다</Text>
              </View>
            ) : (
              goals.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  style={styles.goalCard}
                  activeOpacity={0.7}
                  onPress={() => openEditModal(goal)}
                >
                  {/* Goal Header */}
                  <View style={styles.goalHeader}>
                    <TouchableOpacity
                      style={styles.goalIconContainer}
                      onPress={() => handleTogglePrimary(goal)}
                      activeOpacity={0.7}
                    >
                      {renderGoalIcon(goal.icon, 20, '#FBBF24')}
                      <View
                        style={[
                          styles.goalStarBadge,
                          { backgroundColor: goal.isPrimary ? '#FBBF24' : 'rgba(156, 163, 175, 0.5)' },
                        ]}
                      >
                        <MaterialIcons
                          name={goal.isPrimary ? 'star' : 'star-outline'}
                          size={10}
                          color={goal.isPrimary ? '#fff' : 'rgba(255,255,255,0.7)'}
                        />
                      </View>
                    </TouchableOpacity>
                    <View style={styles.goalInfo}>
                      <View style={styles.goalNameRow}>
                        <Text style={styles.goalName}>{goal.name}</Text>
                        {goal.isPrimary && <Text style={styles.goalPrimaryBadge}>대표</Text>}
                      </View>
                      <Text style={styles.goalDate}>{goal.targetDate}</Text>
                    </View>
                  </View>

                  {/* Amount */}
                  <View style={styles.goalAmountContainer}>
                    <Text style={styles.goalCurrentAmount}>₩{formatNumber(goal.currentAmount)}</Text>
                    <View style={styles.goalTargetRow}>
                      <Text style={styles.goalTargetAmount}>/ ₩{formatNumber(goal.targetAmount)}</Text>
                      <Text style={styles.goalPercent}>({goal.progressPercent}%)</Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.goalProgressBar}>
                    <View
                      style={[
                        styles.goalProgressFill,
                        { width: `${Math.min(goal.progressPercent, 100)}%` },
                      ]}
                    />
                  </View>

                  {/* Footer */}
                  <View style={styles.goalFooter}>
                    <TouchableOpacity
                      style={styles.depositButton}
                      activeOpacity={0.7}
                      onPress={() => openDepositModal(goal)}
                    >
                      <MaterialIcons name="add" size={16} color={colors.accentMint} />
                      <Text style={styles.depositButtonText}>저축하기</Text>
                    </TouchableOpacity>
                    <View style={styles.goalMonthlyStatus}>
                      {goal.thisMonthSavings >= goal.monthlyTarget ? (
                        <Text style={styles.goalMonthlyComplete}>이번 달 완료!</Text>
                      ) : (
                        <>
                          <Text style={styles.goalMonthlyLabel}>이번 달</Text>
                          <Text style={styles.goalMonthlyNeeded} numberOfLines={1}>
                            {formatCompactNumber(goal.monthlyTarget - goal.thisMonthSavings)}
                            <Text style={styles.goalMonthlyNeededLabel}> 더 필요</Text>
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add Savings Goal Modal */}
      <Modal
        visible={isAddModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsAddModalOpen(false);
          resetAddModal();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setIsAddModalOpen(false);
              resetAddModal();
            }}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>저축 목표 추가</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsAddModalOpen(false);
                  resetAddModal();
                }}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Goal Name */}
              <Text style={styles.inputLabel}>목표 이름</Text>
              <TextInput
                style={styles.textInput}
                value={newGoalName}
                onChangeText={setNewGoalName}
                placeholder="예: 내 집 마련, 여행 자금"
                placeholderTextColor={colors.textMuted}
              />

              {/* Icon Selection */}
              <Text style={styles.inputLabel}>아이콘</Text>
              <View style={styles.iconGrid}>
                {Object.keys(GOAL_ICONS).map((iconId) => (
                  <TouchableOpacity
                    key={iconId}
                    style={[
                      styles.iconButton,
                      newGoalIcon === iconId && styles.iconButtonSelected,
                    ]}
                    onPress={() => setNewGoalIcon(iconId)}
                  >
                    {renderGoalIcon(iconId, 24, newGoalIcon === iconId ? '#fff' : colors.textSecondary)}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Target Amount */}
              <Text style={styles.inputLabel}>목표 금액</Text>
              <View style={[styles.amountInputContainer, targetAmountExceeded && styles.amountInputExceeded]}>
                <Text style={styles.currencySymbol}>₩</Text>
                <TextInput
                  style={styles.amountInput}
                  value={newGoalTargetAmount}
                  onChangeText={(text) => {
                    const result = formatInputAmountWithCheck(text);
                    setNewGoalTargetAmount(result.value);
                    setTargetAmountExceeded(result.exceeded);
                  }}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              {targetAmountExceeded && (
                <Text style={styles.amountExceededText}>
                  100조 원을 초과할 수 없습니다.
                </Text>
              )}

              {/* Current Amount */}
              <Text style={styles.inputLabel}>현재 저축액 (선택)</Text>
              <View style={[styles.amountInputContainer, currentAmountExceeded && styles.amountInputExceeded]}>
                <Text style={styles.currencySymbol}>₩</Text>
                <TextInput
                  style={styles.amountInput}
                  value={newGoalCurrentAmount}
                  onChangeText={(text) => {
                    const result = formatInputAmountWithCheck(text);
                    setNewGoalCurrentAmount(result.value);
                    setCurrentAmountExceeded(result.exceeded);
                  }}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              {currentAmountExceeded && (
                <Text style={styles.amountExceededText}>
                  100조 원을 초과할 수 없습니다.
                </Text>
              )}

              {/* Start Date */}
              <Text style={styles.inputLabel}>시작 날짜</Text>
              <View style={styles.dateRow}>
                <View style={styles.datePickerContainer}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      const newYear = newGoalStartYear > 2020 ? newGoalStartYear - 1 : newGoalStartYear;
                      setNewGoalStartYear(newYear);
                    }}
                  >
                    <MaterialIcons name="chevron-left" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={styles.dateText}>{newGoalStartYear}년</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      const maxYear = new Date().getFullYear();
                      const newYear = newGoalStartYear < maxYear ? newGoalStartYear + 1 : newGoalStartYear;
                      setNewGoalStartYear(newYear);
                    }}
                  >
                    <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.datePickerContainer}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      const newMonth = newGoalStartMonth > 1 ? newGoalStartMonth - 1 : 12;
                      setNewGoalStartMonth(newMonth);
                    }}
                  >
                    <MaterialIcons name="chevron-left" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={styles.dateText}>{newGoalStartMonth}월</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      const newMonth = newGoalStartMonth < 12 ? newGoalStartMonth + 1 : 1;
                      setNewGoalStartMonth(newMonth);
                    }}
                  >
                    <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Target Date */}
              <Text style={styles.inputLabel}>목표 날짜</Text>
              <View style={styles.dateRow}>
                <View style={styles.datePickerContainer}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      const newYear = newGoalTargetYear > new Date().getFullYear() ? newGoalTargetYear - 1 : newGoalTargetYear;
                      setNewGoalTargetYear(newYear);
                    }}
                  >
                    <MaterialIcons name="chevron-left" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={styles.dateText}>{newGoalTargetYear}년</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      const newYear = newGoalTargetYear < new Date().getFullYear() + 10 ? newGoalTargetYear + 1 : newGoalTargetYear;
                      setNewGoalTargetYear(newYear);
                    }}
                  >
                    <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.datePickerContainer}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      const newMonth = newGoalTargetMonth > 1 ? newGoalTargetMonth - 1 : 12;
                      setNewGoalTargetMonth(newMonth);
                    }}
                  >
                    <MaterialIcons name="chevron-left" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={styles.dateText}>{newGoalTargetMonth}월</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      const newMonth = newGoalTargetMonth < 12 ? newGoalTargetMonth + 1 : 1;
                      setNewGoalTargetMonth(newMonth);
                    }}
                  >
                    <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsAddModalOpen(false);
                  resetAddModal();
                }}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleAddGoal}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>{isSaving ? '저장 중...' : '추가'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Deposit Modal */}
      <Modal
        visible={isDepositModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsDepositModalOpen(false);
          setSelectedGoal(null);
          setDepositAmount('');
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setIsDepositModalOpen(false);
              setSelectedGoal(null);
              setDepositAmount('');
            }}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>저축하기</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsDepositModalOpen(false);
                  setSelectedGoal(null);
                  setDepositAmount('');
                }}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedGoal && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Goal Info */}
                <View style={styles.depositGoalInfo}>
                  <View style={styles.depositGoalIcon}>
                    {renderGoalIcon(selectedGoal.icon, 24, '#FBBF24')}
                  </View>
                  <View style={styles.depositGoalDetails}>
                    <Text style={styles.depositGoalName}>{selectedGoal.name}</Text>
                    <Text style={styles.depositGoalProgress}>현재 ₩{formatNumber(selectedGoal.currentAmount)}</Text>
                    <Text style={styles.depositGoalProgress}>목표 ₩{formatNumber(selectedGoal.targetAmount)}</Text>
                  </View>
                  <Text style={styles.depositGoalPercent}>{selectedGoal.progressPercent}%</Text>
                </View>

                {/* Remaining Amount */}
                <View style={styles.remainingAmountBox}>
                  <Text style={styles.remainingAmountLabel}>목표까지 남은 금액</Text>
                  <Text style={styles.remainingAmountValue}>
                    ₩{formatNumber(Math.max(selectedGoal.targetAmount - selectedGoal.currentAmount, 0))}
                  </Text>
                </View>

                {/* Deposit Amount Input */}
                <Text style={styles.inputLabel}>저축 금액</Text>
                <View style={[styles.amountInputContainer, depositAmountExceeded && styles.amountInputExceeded]}>
                  <Text style={styles.currencySymbol}>₩</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={depositAmount}
                    onChangeText={(text) => {
                      const result = formatInputAmountWithCheck(text, AMOUNT_LIMITS.TRANSACTION_MAX);
                      setDepositAmount(result.value);
                      setDepositAmountExceeded(result.exceeded);
                    }}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    autoFocus
                  />
                </View>
                {depositAmountExceeded && (
                  <Text style={styles.amountExceededText}>
                    1000억 원을 초과할 수 없습니다.
                  </Text>
                )}

                {/* Quick Amount Buttons */}
                <View style={styles.quickAmountsRow}>
                  {QUICK_AMOUNTS.map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={styles.quickAmountButton}
                      onPress={() => handleQuickAmount(amount)}
                    >
                      <Text style={styles.quickAmountText}>+{formatNumber(amount)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Full Amount Button */}
                {selectedGoal.targetAmount - selectedGoal.currentAmount > 0 && (
                  <TouchableOpacity
                    style={styles.fullAmountButton}
                    onPress={() => {
                      const remainingAmount = selectedGoal.targetAmount - selectedGoal.currentAmount;
                      if (remainingAmount > AMOUNT_LIMITS.TRANSACTION_MAX) {
                        setDepositAmountExceeded(true);
                        setDepositAmount(formatNumber(AMOUNT_LIMITS.TRANSACTION_MAX));
                      } else {
                        setDepositAmountExceeded(false);
                        setDepositAmount(formatNumber(remainingAmount));
                      }
                    }}
                  >
                    <Text style={styles.fullAmountText}>
                      전액 (₩{formatNumber(Math.min(selectedGoal.targetAmount - selectedGoal.currentAmount, AMOUNT_LIMITS.TRANSACTION_MAX))})
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Preview */}
                {parseInt(depositAmount.replace(/,/g, '') || '0', 10) > 0 && (
                  <View style={styles.depositPreview}>
                    <Text style={styles.depositPreviewLabel}>저축 후 예상</Text>
                    <View style={styles.depositPreviewRow}>
                      <Text style={styles.depositPreviewAmount}>
                        ₩{formatNumber(selectedGoal.currentAmount + parseInt(depositAmount.replace(/,/g, '') || '0', 10))}
                      </Text>
                      <Text style={styles.depositPreviewPercent}>
                        {Math.min(Math.round(((selectedGoal.currentAmount + parseInt(depositAmount.replace(/,/g, '') || '0', 10)) / selectedGoal.targetAmount) * 100), 100)}%
                      </Text>
                    </View>
                    <View style={styles.depositPreviewBar}>
                      <View
                        style={[
                          styles.depositPreviewBarFill,
                          {
                            width: `${Math.min(Math.round(((selectedGoal.currentAmount + parseInt(depositAmount.replace(/,/g, '') || '0', 10)) / selectedGoal.targetAmount) * 100), 100)}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsDepositModalOpen(false);
                  setSelectedGoal(null);
                  setDepositAmount('');
                }}
                disabled={isDepositing}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (isDepositing || !depositAmount || parseInt(depositAmount.replace(/,/g, ''), 10) <= 0) && styles.saveButtonDisabled,
                ]}
                onPress={handleDeposit}
                disabled={isDepositing || !depositAmount || parseInt(depositAmount.replace(/,/g, ''), 10) <= 0}
              >
                <Text style={styles.saveButtonText}>{isDepositing ? '저축 중...' : '저축하기'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Savings Goal Modal */}
      <Modal
        visible={isEditModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeEditModal}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>저축 목표 수정</Text>
              <TouchableOpacity onPress={closeEditModal} style={styles.modalCloseButton}>
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Goal Name */}
              <Text style={styles.inputLabel}>목표 이름</Text>
              <TextInput
                style={styles.textInput}
                value={editGoalName}
                onChangeText={setEditGoalName}
                placeholder="예: 내 집 마련, 여행 자금"
                placeholderTextColor={colors.textMuted}
              />

              {/* Icon Selection */}
              <Text style={styles.inputLabel}>아이콘</Text>
              <View style={styles.iconGrid}>
                {Object.keys(GOAL_ICONS).map((iconId) => (
                  <TouchableOpacity
                    key={iconId}
                    style={[
                      styles.iconButton,
                      editGoalIcon === iconId && styles.iconButtonSelected,
                    ]}
                    onPress={() => setEditGoalIcon(iconId)}
                  >
                    {renderGoalIcon(iconId, 24, editGoalIcon === iconId ? '#fff' : colors.textSecondary)}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Target Amount */}
              <Text style={styles.inputLabel}>목표 금액</Text>
              <View style={[styles.amountInputContainer, editTargetAmountExceeded && styles.amountInputExceeded]}>
                <Text style={styles.currencySymbol}>₩</Text>
                <TextInput
                  style={styles.amountInput}
                  value={editGoalTargetAmount}
                  onChangeText={(text) => {
                    const result = formatInputAmountWithCheck(text);
                    setEditGoalTargetAmount(result.value);
                    setEditTargetAmountExceeded(result.exceeded);
                  }}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              {editTargetAmountExceeded && (
                <Text style={styles.amountExceededText}>
                  100조 원을 초과할 수 없습니다.
                </Text>
              )}

              {/* Current Amount (Read-only) */}
              <Text style={styles.inputLabel}>현재 저축액</Text>
              <View style={[styles.amountInputContainer, { opacity: 0.6 }]}>
                <Text style={styles.currencySymbol}>₩</Text>
                <Text style={[styles.amountInput, { paddingVertical: 14 }]}>
                  {editingGoal ? formatNumber(editingGoal.currentAmount) : '0'}
                </Text>
              </View>
              <Text style={styles.editReadOnlyHint}>
                저축액은 '저축하기' 버튼으로만 변경할 수 있습니다
              </Text>

              {/* Target Date */}
              <Text style={styles.inputLabel}>목표 날짜</Text>
              <View style={styles.dateRow}>
                <View style={styles.datePickerContainer}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      const newYear = editGoalTargetYear > new Date().getFullYear() ? editGoalTargetYear - 1 : editGoalTargetYear;
                      setEditGoalTargetYear(newYear);
                    }}
                  >
                    <MaterialIcons name="chevron-left" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={styles.dateText}>{editGoalTargetYear}년</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      const newYear = editGoalTargetYear < new Date().getFullYear() + 10 ? editGoalTargetYear + 1 : editGoalTargetYear;
                      setEditGoalTargetYear(newYear);
                    }}
                  >
                    <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.datePickerContainer}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      const newMonth = editGoalTargetMonth > 1 ? editGoalTargetMonth - 1 : 12;
                      setEditGoalTargetMonth(newMonth);
                    }}
                  >
                    <MaterialIcons name="chevron-left" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={styles.dateText}>{editGoalTargetMonth}월</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      const newMonth = editGoalTargetMonth < 12 ? editGoalTargetMonth + 1 : 1;
                      setEditGoalTargetMonth(newMonth);
                    }}
                  >
                    <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Delete Confirmation */}
              {showEditDeleteConfirm && (
                <View style={styles.editDeleteConfirmBox}>
                  <Text style={styles.editDeleteConfirmText}>
                    '{editingGoal?.name}' 목표를 삭제하시겠습니까?{'\n'}이 작업은 되돌릴 수 없습니다.
                  </Text>
                  <View style={styles.editDeleteConfirmButtons}>
                    <TouchableOpacity
                      style={styles.editDeleteConfirmCancel}
                      onPress={() => setShowEditDeleteConfirm(false)}
                      disabled={isEditing}
                    >
                      <Text style={styles.editDeleteConfirmCancelText}>취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editDeleteConfirmDelete, isEditing && styles.saveButtonDisabled]}
                      onPress={handleDeleteFromEdit}
                      disabled={isEditing}
                    >
                      <Text style={styles.editDeleteConfirmDeleteText}>
                        {isEditing ? '삭제 중...' : '삭제'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Buttons */}
            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeEditModal}
                disabled={isEditing}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editDeleteButton}
                onPress={() => setShowEditDeleteConfirm(true)}
                disabled={isEditing || showEditDeleteConfirm}
              >
                <Text style={styles.editDeleteButtonText}>삭제</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isEditing && styles.saveButtonDisabled]}
                onPress={handleEditGoal}
                disabled={isEditing}
              >
                <Text style={styles.saveButtonText}>{isEditing ? '저장 중...' : '저장'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
