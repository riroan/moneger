import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TransactionGroup } from '../../components/transactions/TransactionGroup';

// Mock themeStore
jest.mock('../../stores/themeStore', () => ({
  useThemeStore: () => ({
    theme: 'dark',
  }),
}));

// Mock shared package
jest.mock('@moneger/shared', () => ({
  formatNumber: (num: number) => num.toLocaleString('ko-KR'),
  formatDateWithDay: (date: string) => {
    const d = new Date(date);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
  },
  formatTime: (date: string) => {
    const d = new Date(date);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  },
}));

// Mock expo vector icons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

// Mock Icons
jest.mock('../../constants/Icons', () => ({
  getIconName: (icon: string | null) => icon || 'attach-money',
  MaterialIconName: {},
}));

describe('TransactionGroup', () => {
  const mockTransactions = [
    {
      id: '1',
      amount: 50000,
      type: 'EXPENSE' as const,
      description: '점심 식사',
      date: '2024-01-15T12:30:00',
      categoryId: 'cat-1',
      category: {
        name: '식비',
        icon: 'restaurant',
        color: '#EF4444',
      },
    },
    {
      id: '2',
      amount: 3000000,
      type: 'INCOME' as const,
      description: '월급',
      date: '2024-01-15T09:00:00',
      categoryId: 'cat-2',
      category: {
        name: '급여',
        icon: 'attach-money',
        color: '#10B981',
      },
    },
  ];

  const defaultProps = {
    date: '2024-01-15',
    transactions: mockTransactions,
    onPressTransaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render date header', () => {
    const { getByText } = render(<TransactionGroup {...defaultProps} />);

    expect(getByText('1월 15일 (월)')).toBeTruthy();
  });

  it('should render all transactions', () => {
    const { getByText } = render(<TransactionGroup {...defaultProps} />);

    expect(getByText('점심 식사')).toBeTruthy();
    expect(getByText('월급')).toBeTruthy();
  });

  it('should render transaction descriptions', () => {
    const { getByText } = render(<TransactionGroup {...defaultProps} />);

    expect(getByText('점심 식사')).toBeTruthy();
    expect(getByText('월급')).toBeTruthy();
  });

  it('should render category names', () => {
    const { getByText } = render(<TransactionGroup {...defaultProps} />);

    expect(getByText('식비')).toBeTruthy();
    expect(getByText('급여')).toBeTruthy();
  });

  it('should format expense amount with minus sign', () => {
    const { getByText } = render(<TransactionGroup {...defaultProps} />);

    expect(getByText('-50,000')).toBeTruthy();
  });

  it('should format income amount with plus sign', () => {
    const { getByText } = render(<TransactionGroup {...defaultProps} />);

    expect(getByText('+3,000,000')).toBeTruthy();
  });

  it('should call onPressTransaction when transaction is pressed', () => {
    const onPressTransaction = jest.fn();
    const { getByText } = render(
      <TransactionGroup {...defaultProps} onPressTransaction={onPressTransaction} />
    );

    fireEvent.press(getByText('점심 식사'));

    expect(onPressTransaction).toHaveBeenCalledWith(mockTransactions[0]);
  });

  it('should render 미분류 for transaction without category', () => {
    const transactionsWithoutCategory = [
      {
        id: '3',
        amount: 10000,
        type: 'EXPENSE' as const,
        description: '기타 지출',
        date: '2024-01-15T14:00:00',
        categoryId: null,
      },
    ];

    const { getByText } = render(
      <TransactionGroup
        {...defaultProps}
        transactions={transactionsWithoutCategory}
      />
    );

    expect(getByText('미분류')).toBeTruthy();
  });

  it('should render 내역 없음 for transaction without description', () => {
    const transactionsWithoutDescription = [
      {
        id: '4',
        amount: 20000,
        type: 'EXPENSE' as const,
        description: null,
        date: '2024-01-15T15:00:00',
        categoryId: 'cat-1',
        category: {
          name: '식비',
          icon: 'restaurant',
          color: '#EF4444',
        },
      },
    ];

    const { getByText } = render(
      <TransactionGroup
        {...defaultProps}
        transactions={transactionsWithoutDescription}
      />
    );

    expect(getByText('내역 없음')).toBeTruthy();
  });

  it('should render savings transaction correctly', () => {
    const savingsTransaction = [
      {
        id: '5',
        amount: 100000,
        type: 'EXPENSE' as const,
        description: '저축 입금',
        date: '2024-01-15T10:00:00',
        categoryId: null,
        savingsGoalId: 'savings-1',
      },
    ];

    const { getByText } = render(
      <TransactionGroup
        {...defaultProps}
        transactions={savingsTransaction}
      />
    );

    expect(getByText('저축')).toBeTruthy();
  });

  it('should render time for each transaction', () => {
    const { getByText } = render(<TransactionGroup {...defaultProps} />);

    expect(getByText('12:30')).toBeTruthy();
    expect(getByText('09:00')).toBeTruthy();
  });

  it('should render empty list gracefully', () => {
    const { UNSAFE_root } = render(
      <TransactionGroup {...defaultProps} transactions={[]} />
    );

    expect(UNSAFE_root).toBeTruthy();
  });
});
