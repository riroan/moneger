import { render, screen, fireEvent } from '@testing-library/react';
import TransactionItem from '../transactions/TransactionItem';
import type { TransactionWithCategory } from '@/types';

describe('TransactionItem', () => {
  const mockExpenseTransaction: TransactionWithCategory = {
    id: '1',
    type: 'EXPENSE',
    amount: 15000,
    description: '점심 식사',
    date: '2024-01-15T12:00:00.000Z',
    categoryId: 'cat-1',
    savingsGoalId: null,
    category: {
      id: 'cat-1',
      name: '식비',
      icon: 'restaurant',
      color: '#EF4444',
      type: 'EXPENSE',
      categoryGroup: 'SPENDING',
    },
  };

  const mockIncomeTransaction: TransactionWithCategory = {
    id: '2',
    type: 'INCOME',
    amount: 3000000,
    description: '월급',
    date: '2024-01-25T09:00:00.000Z',
    categoryId: 'cat-2',
    savingsGoalId: null,
    category: {
      id: 'cat-2',
      name: '급여',
      icon: 'money',
      color: '#10B981',
      type: 'INCOME',
      categoryGroup: 'SPENDING',
    },
  };

  const mockSavingsTransaction: TransactionWithCategory = {
    id: '3',
    type: 'EXPENSE',
    amount: 500000,
    description: '비상금 저축',
    date: '2024-01-20T10:00:00.000Z',
    categoryId: null,
    savingsGoalId: 'savings-1',
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
    expect(screen.getByText('저축 납입')).toBeInTheDocument();
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
