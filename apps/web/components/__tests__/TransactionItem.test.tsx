import { render, screen, fireEvent } from '@testing-library/react';
import TransactionItem from '../transactions/TransactionItem';
import type { TransactionWithCategory } from '@/types';

describe('TransactionItem', () => {
  const mockExpenseTransaction: TransactionWithCategory = {
    id: '1',
    userId: 'user-1',
    type: 'EXPENSE',
    amount: 15000,
    description: '점심 식사',
    date: new Date('2024-01-15T12:00:00'),
    categoryId: 'cat-1',
    savingsGoalId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    category: {
      id: 'cat-1',
      name: '식비',
      icon: 'restaurant',
      color: '#EF4444',
      type: 'EXPENSE',
      userId: 'user-1',
      defaultBudget: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  };

  const mockIncomeTransaction: TransactionWithCategory = {
    id: '2',
    userId: 'user-1',
    type: 'INCOME',
    amount: 3000000,
    description: '월급',
    date: new Date('2024-01-25T09:00:00'),
    categoryId: 'cat-2',
    savingsGoalId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    category: {
      id: 'cat-2',
      name: '급여',
      icon: 'money',
      color: '#10B981',
      type: 'INCOME',
      userId: 'user-1',
      defaultBudget: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  };

  const mockSavingsTransaction: TransactionWithCategory = {
    id: '3',
    userId: 'user-1',
    type: 'EXPENSE',
    amount: 500000,
    description: '비상금 저축',
    date: new Date('2024-01-20T10:00:00'),
    categoryId: null,
    savingsGoalId: 'savings-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    category: null,
  };

  it('should render expense transaction correctly', () => {
    render(<TransactionItem transaction={mockExpenseTransaction} />);

    expect(screen.getByText('점심 식사')).toBeInTheDocument();
    expect(screen.getByText('식비')).toBeInTheDocument();
    expect(screen.getByText('15,000')).toBeInTheDocument();
  });

  it('should render income transaction correctly', () => {
    render(<TransactionItem transaction={mockIncomeTransaction} />);

    expect(screen.getByText('월급')).toBeInTheDocument();
    expect(screen.getByText('급여')).toBeInTheDocument();
    expect(screen.getByText('3,000,000')).toBeInTheDocument();
  });

  it('should render savings transaction correctly', () => {
    render(<TransactionItem transaction={mockSavingsTransaction} />);

    expect(screen.getByText('비상금 저축')).toBeInTheDocument();
    expect(screen.getByText('저축')).toBeInTheDocument();
    expect(screen.getByText('500,000')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<TransactionItem transaction={mockExpenseTransaction} onClick={handleClick} />);

    fireEvent.click(screen.getByText('점심 식사'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should show category name when no description', () => {
    const transactionWithoutDescription: TransactionWithCategory = {
      ...mockExpenseTransaction,
      description: '',
    };

    render(<TransactionItem transaction={transactionWithoutDescription} />);

    // Should show category name as the main text
    const categoryNames = screen.getAllByText('식비');
    expect(categoryNames.length).toBeGreaterThan(0);
  });

  it('should show expense with minus sign styling', () => {
    render(<TransactionItem transaction={mockExpenseTransaction} />);

    // Check that minus sign exists
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('should show income with plus sign styling', () => {
    render(<TransactionItem transaction={mockIncomeTransaction} />);

    // Check that plus sign exists
    expect(screen.getByText('+')).toBeInTheDocument();
  });
});
