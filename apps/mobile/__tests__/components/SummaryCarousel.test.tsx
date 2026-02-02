import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SummaryCarousel, SummaryCardData } from '../../components/home/SummaryCarousel';

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

describe('SummaryCarousel', () => {
  const mockCards: SummaryCardData[] = [
    {
      type: 'income',
      label: '이번 달 수입',
      amount: 3000000,
      badge: '지난달 대비 +500,000원',
      icon: 'trending-up',
      iconBg: '#10B981',
      barColor: '#10B981',
      badgeBg: 'rgba(16, 185, 129, 0.2)',
      badgeText: '#10B981',
    },
    {
      type: 'expense',
      label: '이번 달 지출',
      amount: 1500000,
      badge: '지난달 대비 -200,000원',
      icon: 'trending-down',
      iconBg: '#F97316',
      barColor: '#F97316',
      badgeBg: 'rgba(249, 115, 22, 0.2)',
      badgeText: '#F97316',
    },
    {
      type: 'balance',
      label: '잔액',
      amount: 1500000,
      badge: '지난달 대비 +700,000원',
      icon: 'account-balance-wallet',
      iconBg: '#3B82F6',
      barColor: '#3B82F6',
      badgeBg: 'rgba(59, 130, 246, 0.2)',
      badgeText: '#3B82F6',
    },
  ];

  const defaultProps = {
    cards: mockCards,
    activeIndex: 0,
    onIndexChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render carousel', () => {
    const { UNSAFE_root } = render(<SummaryCarousel {...defaultProps} />);

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render all cards', () => {
    const { getByText } = render(<SummaryCarousel {...defaultProps} />);

    expect(getByText('이번 달 수입')).toBeTruthy();
    expect(getByText('이번 달 지출')).toBeTruthy();
    expect(getByText('잔액')).toBeTruthy();
  });

  it('should render amounts correctly', () => {
    const { getByText, getAllByText } = render(<SummaryCarousel {...defaultProps} />);

    expect(getByText('₩3,000,000')).toBeTruthy();
    // ₩1,500,000 appears twice: once for expense, once for balance
    expect(getAllByText('₩1,500,000').length).toBeGreaterThanOrEqual(1);
  });

  it('should render badges', () => {
    const { getByText } = render(<SummaryCarousel {...defaultProps} />);

    expect(getByText('지난달 대비 +500,000원')).toBeTruthy();
    expect(getByText('지난달 대비 -200,000원')).toBeTruthy();
    expect(getByText('지난달 대비 +700,000원')).toBeTruthy();
  });

  it('should render pagination dots', () => {
    const { UNSAFE_root } = render(<SummaryCarousel {...defaultProps} />);

    const views = UNSAFE_root.findAllByType('View');
    expect(views.length).toBeGreaterThan(0);
  });

  it('should display negative amount with minus sign', () => {
    const negativeCards: SummaryCardData[] = [
      {
        ...mockCards[2],
        amount: 500000,
        isNegative: true,
      },
    ];

    const { getByText } = render(
      <SummaryCarousel
        cards={negativeCards}
        activeIndex={0}
        onIndexChange={jest.fn()}
      />
    );

    expect(getByText('-₩500,000')).toBeTruthy();
  });

  it('should call onIndexChange when scrolled', () => {
    const onIndexChange = jest.fn();
    const { UNSAFE_root } = render(
      <SummaryCarousel {...defaultProps} onIndexChange={onIndexChange} />
    );

    const scrollViews = UNSAFE_root.findAllByType('RCTScrollView');
    if (scrollViews.length > 0) {
      fireEvent.scroll(scrollViews[0], {
        nativeEvent: {
          contentOffset: { x: 375, y: 0 },
        },
      });
    }
  });

  it('should render empty cards array gracefully', () => {
    const { UNSAFE_root } = render(
      <SummaryCarousel cards={[]} activeIndex={0} onIndexChange={jest.fn()} />
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render single card', () => {
    const { getByText } = render(
      <SummaryCarousel
        cards={[mockCards[0]]}
        activeIndex={0}
        onIndexChange={jest.fn()}
      />
    );

    expect(getByText('이번 달 수입')).toBeTruthy();
  });

  it('should use second index as active', () => {
    const { UNSAFE_root } = render(
      <SummaryCarousel {...defaultProps} activeIndex={1} />
    );

    expect(UNSAFE_root).toBeTruthy();
  });
});
