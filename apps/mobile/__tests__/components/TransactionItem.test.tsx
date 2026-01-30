import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TransactionItem from '../../components/TransactionItem';

// Mock themeStore
jest.mock('../../stores/themeStore', () => ({
  useThemeStore: () => ({
    theme: 'dark',
  }),
}));

// Mock Icons module
jest.mock('../../constants/Icons', () => ({
  getIconName: (icon: string | null) => icon || 'attach-money',
}));

// Mock shared package
jest.mock('@moneger/shared', () => ({
  formatNumber: (num: number) => num.toLocaleString('ko-KR'),
  formatTime: (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  },
}));

describe('TransactionItem', () => {
  const mockExpenseTransaction = {
    id: '1',
    amount: 50000,
    type: 'EXPENSE' as const,
    description: '점심 식사',
    date: '2024-01-15T12:30:00',
    category: {
      name: '식비',
      icon: 'restaurant',
      color: '#EF4444',
    },
  };

  const mockIncomeTransaction = {
    id: '2',
    amount: 3000000,
    type: 'INCOME' as const,
    description: '월급',
    date: '2024-01-25T09:00:00',
    category: {
      name: '급여',
      icon: 'money',
      color: '#10B981',
    },
  };

  const mockSavingsTransaction = {
    id: '3',
    amount: 500000,
    type: 'EXPENSE' as const,
    description: '저축 입금',
    date: '2024-01-20T10:00:00',
    savingsGoalId: 'savings-1',
    category: null,
  };

  it('should render expense transaction correctly', () => {
    const { getByText } = render(
      <TransactionItem transaction={mockExpenseTransaction} />
    );

    expect(getByText('점심 식사')).toBeTruthy();
    expect(getByText('식비')).toBeTruthy();
    expect(getByText('-₩50,000')).toBeTruthy();
  });

  it('should render income transaction correctly', () => {
    const { getByText } = render(
      <TransactionItem transaction={mockIncomeTransaction} />
    );

    expect(getByText('월급')).toBeTruthy();
    expect(getByText('급여')).toBeTruthy();
    expect(getByText('+₩3,000,000')).toBeTruthy();
  });

  it('should render savings transaction correctly', () => {
    const { getByText } = render(
      <TransactionItem transaction={mockSavingsTransaction} />
    );

    expect(getByText('저축 입금')).toBeTruthy();
    expect(getByText('저축')).toBeTruthy();
  });

  it('should display default description for expense without description', () => {
    const transactionWithoutDescription = {
      ...mockExpenseTransaction,
      description: null,
    };

    const { getByText } = render(
      <TransactionItem transaction={transactionWithoutDescription} />
    );

    expect(getByText('지출')).toBeTruthy();
  });

  it('should display default description for income without description', () => {
    const transactionWithoutDescription = {
      ...mockIncomeTransaction,
      description: null,
    };

    const { getByText } = render(
      <TransactionItem transaction={transactionWithoutDescription} />
    );

    expect(getByText('수입')).toBeTruthy();
  });

  it('should display 미분류 for transaction without category', () => {
    const transactionWithoutCategory = {
      id: '4',
      amount: 10000,
      type: 'EXPENSE' as const,
      description: '기타 지출',
      date: '2024-01-15T12:30:00',
      category: null,
    };

    const { getByText } = render(
      <TransactionItem transaction={transactionWithoutCategory} />
    );

    expect(getByText('미분류')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const mockOnPress = jest.fn();

    const { getByText } = render(
      <TransactionItem
        transaction={mockExpenseTransaction}
        onPress={mockOnPress}
      />
    );

    fireEvent.press(getByText('점심 식사'));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should render divider when showDivider is true', () => {
    const { UNSAFE_root } = render(
      <TransactionItem
        transaction={mockExpenseTransaction}
        showDivider={true}
      />
    );

    // Check that divider View exists (height: 1)
    const allViews = UNSAFE_root.findAllByType('View');
    const dividerExists = allViews.some(view => {
      const style = view.props.style;
      return style && (style.height === 1 || (Array.isArray(style) && style.some(s => s?.height === 1)));
    });
    expect(dividerExists).toBe(true);
  });

  it('should not be pressable when onPress is not provided', () => {
    const { UNSAFE_root } = render(
      <TransactionItem transaction={mockExpenseTransaction} />
    );

    // Check that TouchableOpacity is not used when onPress is not provided
    const touchableOpacities = UNSAFE_root.findAllByType('TouchableOpacity' as any);
    expect(touchableOpacities.length).toBe(0);
  });
});
