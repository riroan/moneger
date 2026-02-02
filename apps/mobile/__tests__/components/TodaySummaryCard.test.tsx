import React from 'react';
import { render } from '@testing-library/react-native';
import TodaySummaryCard from '../../components/cards/TodaySummaryCard';

// Mock themeStore
jest.mock('../../stores/themeStore', () => ({
  useThemeStore: () => ({
    theme: 'dark',
  }),
}));

// Mock shared package
jest.mock('@moneger/shared', () => ({
  formatNumber: (num: number) => num.toLocaleString('ko-KR'),
}));

// Mock expo vector icons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

// Mock Icons
jest.mock('../../constants/Icons', () => ({
  UI_ICONS: { today: 'today' },
}));

describe('TodaySummaryCard', () => {
  const defaultProps = {
    month: 1,
    day: 15,
    dayOfWeek: 3, // 수요일
    income: { total: 0, count: 0 },
    expense: { total: 0, count: 0 },
    savings: { total: 0, count: 0 },
  };

  it('should render card with date', () => {
    const { getByText } = render(<TodaySummaryCard {...defaultProps} />);

    expect(getByText('오늘의 내역')).toBeTruthy();
    expect(getByText('1월 15일 (수)')).toBeTruthy();
  });

  it('should show empty message when no transactions', () => {
    const { getByText } = render(<TodaySummaryCard {...defaultProps} />);

    expect(getByText('오늘은 아직 내역이 없어요')).toBeTruthy();
  });

  it('should display income correctly', () => {
    const props = {
      ...defaultProps,
      income: { total: 100000, count: 2 },
    };

    const { getByText, getAllByText } = render(<TodaySummaryCard {...props} />);

    expect(getByText('수입')).toBeTruthy();
    expect(getByText('2건')).toBeTruthy();
    // +₩100,000 appears twice: once for income, once for balance
    expect(getAllByText('+₩100,000').length).toBeGreaterThanOrEqual(1);
  });

  it('should display expense correctly', () => {
    const props = {
      ...defaultProps,
      expense: { total: 50000, count: 3 },
    };

    const { getByText, getAllByText } = render(<TodaySummaryCard {...props} />);

    expect(getByText('지출')).toBeTruthy();
    expect(getByText('3건')).toBeTruthy();
    // -₩50,000 appears twice: once for expense, once for balance
    expect(getAllByText('-₩50,000').length).toBeGreaterThanOrEqual(1);
  });

  it('should display savings correctly', () => {
    const props = {
      ...defaultProps,
      savings: { total: 30000, count: 1 },
    };

    const { getByText } = render(<TodaySummaryCard {...props} />);

    expect(getByText('저축')).toBeTruthy();
    expect(getByText('1건')).toBeTruthy();
    expect(getByText('₩30,000')).toBeTruthy();
  });

  it('should calculate positive balance correctly', () => {
    const props = {
      ...defaultProps,
      income: { total: 100000, count: 1 },
      expense: { total: 30000, count: 2 },
      savings: { total: 20000, count: 1 },
    };

    const { getByText } = render(<TodaySummaryCard {...props} />);

    expect(getByText('합계')).toBeTruthy();
    expect(getByText('+₩50,000')).toBeTruthy(); // 100000 - 30000 - 20000
  });

  it('should calculate negative balance correctly', () => {
    const props = {
      ...defaultProps,
      income: { total: 10000, count: 1 },
      expense: { total: 50000, count: 2 },
      savings: { total: 0, count: 0 },
    };

    const { getByText } = render(<TodaySummaryCard {...props} />);

    expect(getByText('-₩40,000')).toBeTruthy(); // 10000 - 50000
  });

  it('should display dash when income count is 0', () => {
    const props = {
      ...defaultProps,
      expense: { total: 10000, count: 1 },
    };

    const { getAllByText } = render(<TodaySummaryCard {...props} />);

    // Should find dash for income (and possibly savings)
    const dashes = getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('should render different day of week correctly', () => {
    const props = { ...defaultProps, dayOfWeek: 0 }; // 일요일
    const { getByText } = render(<TodaySummaryCard {...props} />);
    expect(getByText('1월 15일 (일)')).toBeTruthy();

    const props2 = { ...defaultProps, dayOfWeek: 6 }; // 토요일
    const { getByText: getByText2 } = render(<TodaySummaryCard {...props2} />);
    expect(getByText2('1월 15일 (토)')).toBeTruthy();
  });

  it('should render all transaction types when present', () => {
    const props = {
      ...defaultProps,
      income: { total: 100000, count: 1 },
      expense: { total: 50000, count: 2 },
      savings: { total: 30000, count: 1 },
    };

    const { getByText } = render(<TodaySummaryCard {...props} />);

    expect(getByText('수입')).toBeTruthy();
    expect(getByText('지출')).toBeTruthy();
    expect(getByText('저축')).toBeTruthy();
    expect(getByText('합계')).toBeTruthy();
  });
});
