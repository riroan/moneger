import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SavingsGoalCard from '../../components/cards/SavingsGoalCard';

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
  getIconName: (icon: string) => icon || 'savings',
}));

// Mock ProgressBar
jest.mock('../../components/common', () => ({
  ProgressBar: 'ProgressBar',
}));

describe('SavingsGoalCard', () => {
  const defaultProps = {
    name: '여행 자금',
    icon: 'flight',
    currentAmount: 500000,
    targetAmount: 1000000,
    progressPercent: 50,
  };

  it('should render goal name', () => {
    const { getByText } = render(<SavingsGoalCard {...defaultProps} />);

    expect(getByText('여행 자금')).toBeTruthy();
  });

  it('should render current and target amounts', () => {
    const { getByText } = render(<SavingsGoalCard {...defaultProps} />);

    expect(getByText('₩500,000')).toBeTruthy();
    expect(getByText('/ ₩1,000,000')).toBeTruthy();
  });

  it('should render progress percentage', () => {
    const { getByText } = render(<SavingsGoalCard {...defaultProps} />);

    expect(getByText('50% 달성')).toBeTruthy();
  });

  it('should render 100% progress', () => {
    const props = { ...defaultProps, progressPercent: 100 };
    const { getByText } = render(<SavingsGoalCard {...props} />);

    expect(getByText('100% 달성')).toBeTruthy();
  });

  it('should round progress percentage', () => {
    const props = { ...defaultProps, progressPercent: 75.6 };
    const { getByText } = render(<SavingsGoalCard {...props} />);

    expect(getByText('76% 달성')).toBeTruthy();
  });

  it('should render primary badge when isPrimary is true', () => {
    const props = { ...defaultProps, isPrimary: true };
    const { getByText } = render(<SavingsGoalCard {...props} />);

    expect(getByText('대표 목표')).toBeTruthy();
  });

  it('should not render primary badge when isPrimary is false', () => {
    const { queryByText } = render(<SavingsGoalCard {...defaultProps} />);

    expect(queryByText('대표 목표')).toBeNull();
  });

  it('should be pressable when onPress is provided', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SavingsGoalCard {...defaultProps} onPress={onPress} />
    );

    fireEvent.press(getByText('여행 자금'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should not be pressable when onPress is not provided', () => {
    const { UNSAFE_root } = render(<SavingsGoalCard {...defaultProps} />);

    // Check that there's no TouchableOpacity wrapping the content
    const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
    expect(touchables.length).toBe(0);
  });

  it('should render with compact style', () => {
    const { UNSAFE_root } = render(
      <SavingsGoalCard {...defaultProps} compact={true} />
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render zero amounts correctly', () => {
    const props = {
      ...defaultProps,
      currentAmount: 0,
      targetAmount: 1000000,
      progressPercent: 0,
    };

    const { getByText } = render(<SavingsGoalCard {...props} />);

    expect(getByText('₩0')).toBeTruthy();
    expect(getByText('0% 달성')).toBeTruthy();
  });

  it('should render large amounts correctly', () => {
    const props = {
      ...defaultProps,
      currentAmount: 50000000,
      targetAmount: 100000000,
      progressPercent: 50,
    };

    const { getByText } = render(<SavingsGoalCard {...props} />);

    expect(getByText('₩50,000,000')).toBeTruthy();
    expect(getByText('/ ₩100,000,000')).toBeTruthy();
  });
});
