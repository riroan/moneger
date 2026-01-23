import { render, screen } from '@testing-library/react';
import TodaySummaryCard from '../dashboard/TodaySummaryCard';

describe('TodaySummaryCard', () => {
  const mockData = {
    date: '2024-01-15',
    year: 2024,
    month: 1,
    day: 15,
    dayOfWeek: 1, // Monday
    expense: { total: 30000, count: 2 },
    income: { total: 100000, count: 1 },
    savings: { total: 50000, count: 1 },
  };

  it('should render loading state', () => {
    render(<TodaySummaryCard data={null} isLoading={true} />);

    // Check for loading skeleton
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('should return null when no data and not loading', () => {
    const { container } = render(<TodaySummaryCard data={null} isLoading={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('should display today date correctly', () => {
    render(<TodaySummaryCard data={mockData} isLoading={false} />);

    expect(screen.getByText(/오늘/)).toBeInTheDocument();
    expect(screen.getByText(/1월 15일 월/)).toBeInTheDocument();
  });

  it('should display income data', () => {
    render(<TodaySummaryCard data={mockData} isLoading={false} />);

    expect(screen.getByText('수입')).toBeInTheDocument();
    expect(screen.getByText('100,000')).toBeInTheDocument();
  });

  it('should display expense data', () => {
    render(<TodaySummaryCard data={mockData} isLoading={false} />);

    expect(screen.getByText('지출')).toBeInTheDocument();
    expect(screen.getByText('30,000')).toBeInTheDocument();
    expect(screen.getByText('(2건)')).toBeInTheDocument();
  });

  it('should display savings data', () => {
    render(<TodaySummaryCard data={mockData} isLoading={false} />);

    expect(screen.getByText('저축')).toBeInTheDocument();
    expect(screen.getByText('50,000')).toBeInTheDocument();
  });

  it('should display transaction counts', () => {
    render(<TodaySummaryCard data={mockData} isLoading={false} />);

    // income and savings both have 1 count
    const oneCountElements = screen.getAllByText('(1건)');
    expect(oneCountElements.length).toBe(2);
  });

  it('should show dash for zero income', () => {
    const dataWithNoIncome = {
      ...mockData,
      income: { total: 0, count: 0 },
    };

    render(<TodaySummaryCard data={dataWithNoIncome} isLoading={false} />);

    // Should show "-" for income
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('should show dash for zero expense', () => {
    const dataWithNoExpense = {
      ...mockData,
      expense: { total: 0, count: 0 },
    };

    render(<TodaySummaryCard data={dataWithNoExpense} isLoading={false} />);

    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('should show no transactions message when all are zero', () => {
    const emptyData = {
      ...mockData,
      expense: { total: 0, count: 0 },
      income: { total: 0, count: 0 },
      savings: { total: 0, count: 0 },
    };

    render(<TodaySummaryCard data={emptyData} isLoading={false} />);

    expect(screen.getByText('오늘 거래 내역이 없습니다')).toBeInTheDocument();
  });

  it('should display correct day of week', () => {
    const sundayData = { ...mockData, dayOfWeek: 0 };
    const { rerender } = render(<TodaySummaryCard data={sundayData} isLoading={false} />);
    expect(screen.getByText(/일\)/)).toBeInTheDocument();

    const saturdayData = { ...mockData, dayOfWeek: 6 };
    rerender(<TodaySummaryCard data={saturdayData} isLoading={false} />);
    expect(screen.getByText(/토\)/)).toBeInTheDocument();
  });
});
