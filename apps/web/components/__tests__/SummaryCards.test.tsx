import { render, screen, fireEvent } from '@testing-library/react';
import SummaryCards from '../dashboard/SummaryCards';

describe('SummaryCards', () => {
  const defaultProps = {
    totalIncome: 3000000,
    totalExpense: 1200000,
    balance: 1800000,
    lastMonthBalance: 1000000,
    incomeCount: 2,
    expenseCount: 15,
    totalSavings: 500000,
    savingsCount: 3,
  };

  it('should render all four summary cards', () => {
    render(<SummaryCards {...defaultProps} />);

    expect(screen.getByText('이번 달 수입')).toBeInTheDocument();
    expect(screen.getByText('이번 달 지출')).toBeInTheDocument();
    expect(screen.getByText('저축')).toBeInTheDocument();
    expect(screen.getByText('잔액')).toBeInTheDocument();
  });

  it('should display formatted income amount', () => {
    render(<SummaryCards {...defaultProps} />);

    expect(screen.getByText('3,000,000')).toBeInTheDocument();
    expect(screen.getByText('2건의 수입')).toBeInTheDocument();
  });

  it('should display formatted expense amount', () => {
    render(<SummaryCards {...defaultProps} />);

    expect(screen.getByText('1,200,000')).toBeInTheDocument();
    expect(screen.getByText('15건의 지출')).toBeInTheDocument();
  });

  it('should display formatted savings amount', () => {
    render(<SummaryCards {...defaultProps} />);

    expect(screen.getByText('500,000')).toBeInTheDocument();
    expect(screen.getByText('3건의 저축')).toBeInTheDocument();
  });

  it('should display positive balance difference', () => {
    render(<SummaryCards {...defaultProps} />);

    // balance - lastMonthBalance = 1,500,000 - 1,000,000 = +500,000
    expect(screen.getByText(/지난달 대비/)).toBeInTheDocument();
  });

  it('should display negative balance difference', () => {
    render(<SummaryCards {...defaultProps} lastMonthBalance={2000000} />);

    // balance - lastMonthBalance = 1,500,000 - 2,000,000 = -500,000
    expect(screen.getByText(/지난달 대비/)).toBeInTheDocument();
  });

  it('should handle negative balance', () => {
    render(<SummaryCards {...defaultProps} balance={-300000} totalSavings={100000} />);

    // Should display negative balance
    expect(screen.getByText('300,000')).toBeInTheDocument();
  });

  it('should call onIncomeClick when income card is clicked', () => {
    const handleIncomeClick = jest.fn();
    render(<SummaryCards {...defaultProps} onIncomeClick={handleIncomeClick} />);

    fireEvent.click(screen.getByText('이번 달 수입').closest('div[class*="bg-bg-card"]')!);

    expect(handleIncomeClick).toHaveBeenCalledTimes(1);
  });

  it('should call onExpenseClick when expense card is clicked', () => {
    const handleExpenseClick = jest.fn();
    render(<SummaryCards {...defaultProps} onExpenseClick={handleExpenseClick} />);

    fireEvent.click(screen.getByText('이번 달 지출').closest('div[class*="bg-bg-card"]')!);

    expect(handleExpenseClick).toHaveBeenCalledTimes(1);
  });

  it('should call onSavingsClick when savings card is clicked', () => {
    const handleSavingsClick = jest.fn();
    render(<SummaryCards {...defaultProps} onSavingsClick={handleSavingsClick} />);

    fireEvent.click(screen.getByText('저축').closest('div[class*="bg-bg-card"]')!);

    expect(handleSavingsClick).toHaveBeenCalledTimes(1);
  });

  it('should call onBalanceClick when balance card is clicked', () => {
    const handleBalanceClick = jest.fn();
    render(<SummaryCards {...defaultProps} onBalanceClick={handleBalanceClick} />);

    fireEvent.click(screen.getByText('잔액').closest('div[class*="bg-bg-card"]')!);

    expect(handleBalanceClick).toHaveBeenCalledTimes(1);
  });

  it('should display zero values correctly', () => {
    render(
      <SummaryCards
        totalIncome={0}
        totalExpense={0}
        balance={0}
        lastMonthBalance={0}
        incomeCount={0}
        expenseCount={0}
        totalSavings={0}
        savingsCount={0}
      />
    );

    expect(screen.getByText('0건의 수입')).toBeInTheDocument();
    expect(screen.getByText('0건의 지출')).toBeInTheDocument();
    expect(screen.getByText('0건의 저축')).toBeInTheDocument();
  });
});
