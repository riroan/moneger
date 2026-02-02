import React from 'react';
import { render } from '@testing-library/react-native';
import SummaryCard from '../../components/cards/SummaryCard';

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

describe('SummaryCard', () => {
  const incomeCardProps = {
    type: 'income' as const,
    label: '이번 달 수입',
    amount: 3000000,
    badge: '지난달 대비 +500,000원',
    icon: 'trending-up' as const,
    iconBg: '#10B981',
    barColor: '#10B981',
    badgeBg: 'rgba(16, 185, 129, 0.2)',
    badgeText: '#10B981',
  };

  const expenseCardProps = {
    type: 'expense' as const,
    label: '이번 달 지출',
    amount: 1500000,
    badge: '지난달 대비 -200,000원',
    icon: 'trending-down' as const,
    iconBg: '#F97316',
    barColor: '#F97316',
    badgeBg: 'rgba(249, 115, 22, 0.2)',
    badgeText: '#F97316',
  };

  const balanceCardProps = {
    type: 'balance' as const,
    label: '잔액',
    amount: 1500000,
    badge: '지난달 대비 +700,000원',
    icon: 'account-balance-wallet' as const,
    iconBg: '#3B82F6',
    barColor: '#3B82F6',
    badgeBg: 'rgba(59, 130, 246, 0.2)',
    badgeText: '#3B82F6',
  };

  it('should render income card correctly', () => {
    const { getByText } = render(<SummaryCard {...incomeCardProps} />);

    expect(getByText('이번 달 수입')).toBeTruthy();
    expect(getByText('₩3,000,000')).toBeTruthy();
    expect(getByText('지난달 대비 +500,000원')).toBeTruthy();
  });

  it('should render expense card correctly', () => {
    const { getByText } = render(<SummaryCard {...expenseCardProps} />);

    expect(getByText('이번 달 지출')).toBeTruthy();
    expect(getByText('₩1,500,000')).toBeTruthy();
    expect(getByText('지난달 대비 -200,000원')).toBeTruthy();
  });

  it('should render balance card correctly', () => {
    const { getByText } = render(<SummaryCard {...balanceCardProps} />);

    expect(getByText('잔액')).toBeTruthy();
    expect(getByText('₩1,500,000')).toBeTruthy();
    expect(getByText('지난달 대비 +700,000원')).toBeTruthy();
  });

  it('should display negative amount with minus sign', () => {
    const { getByText } = render(
      <SummaryCard {...balanceCardProps} amount={500000} isNegative={true} />
    );

    expect(getByText('-₩500,000')).toBeTruthy();
  });

  it('should display zero amount correctly', () => {
    const { getByText } = render(
      <SummaryCard {...incomeCardProps} amount={0} />
    );

    expect(getByText('₩0')).toBeTruthy();
  });

  it('should display large amount correctly', () => {
    const { getByText } = render(
      <SummaryCard {...incomeCardProps} amount={100000000} />
    );

    expect(getByText('₩100,000,000')).toBeTruthy();
  });

  it('should render with custom badge text', () => {
    const { getByText } = render(
      <SummaryCard {...incomeCardProps} badge="예산의 80% 사용" />
    );

    expect(getByText('예산의 80% 사용')).toBeTruthy();
  });

  it('should render savings card type', () => {
    const savingsCardProps = {
      type: 'savings' as const,
      label: '이번 달 저축',
      amount: 500000,
      badge: '목표 대비 50% 달성',
      icon: 'savings' as const,
      iconBg: '#8B5CF6',
      barColor: '#8B5CF6',
      badgeBg: 'rgba(139, 92, 246, 0.2)',
      badgeText: '#8B5CF6',
    };

    const { getByText } = render(<SummaryCard {...savingsCardProps} />);

    expect(getByText('이번 달 저축')).toBeTruthy();
    expect(getByText('₩500,000')).toBeTruthy();
    expect(getByText('목표 대비 50% 달성')).toBeTruthy();
  });

  it('should handle absolute value for negative amounts', () => {
    const { getByText } = render(
      <SummaryCard {...balanceCardProps} amount={-500000} isNegative={true} />
    );

    // isNegative adds '-' prefix, and amount is displayed as absolute value
    expect(getByText('-₩500,000')).toBeTruthy();
  });

  it('should render label correctly', () => {
    const { getByText } = render(
      <SummaryCard {...incomeCardProps} label="테스트 라벨" />
    );

    expect(getByText('테스트 라벨')).toBeTruthy();
  });

  it('should render without crashing with minimum props', () => {
    const minimalProps = {
      type: 'income' as const,
      label: '라벨',
      amount: 0,
      badge: '뱃지',
      icon: 'attach-money' as const,
      iconBg: '#000',
      barColor: '#000',
      badgeBg: '#000',
      badgeText: '#fff',
    };

    const { UNSAFE_root } = render(<SummaryCard {...minimalProps} />);
    expect(UNSAFE_root).toBeTruthy();
  });
});
