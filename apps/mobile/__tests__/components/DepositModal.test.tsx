import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DepositModal, SavingsGoalForDeposit } from '../../components/savings/DepositModal';

// Mock themeStore
jest.mock('../../stores/themeStore', () => ({
  useThemeStore: () => ({
    theme: 'dark',
  }),
}));

// Mock shared package
jest.mock('@moneger/shared', () => ({
  AMOUNT_LIMITS: {
    TRANSACTION_MAX: 100000000000,
  },
  formatNumber: (num: number) => num.toLocaleString('ko-KR'),
  formatAmountInput: (text: string, maxAmount: number) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    const value = numericValue ? parseInt(numericValue, 10).toLocaleString('ko-KR') : '';
    const numericAmount = parseInt(numericValue || '0', 10);
    return {
      value,
      exceeded: numericAmount > maxAmount,
    };
  },
}));

// Mock expo vector icons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

describe('DepositModal', () => {
  const mockGoal: SavingsGoalForDeposit = {
    id: 'goal-1',
    name: '여행 자금',
    icon: 'flight',
    targetAmount: 1000000,
    currentAmount: 500000,
    progressPercent: 50,
  };

  const defaultProps = {
    visible: true,
    goal: mockGoal,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    isSubmitting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal when visible', () => {
    const { getAllByText } = render(<DepositModal {...defaultProps} />);

    // 저축하기 appears in title and button
    expect(getAllByText('저축하기').length).toBeGreaterThanOrEqual(1);
  });

  it('should return null when goal is null', () => {
    const { toJSON } = render(
      <DepositModal {...defaultProps} goal={null} />
    );

    expect(toJSON()).toBeNull();
  });

  it('should display goal name', () => {
    const { getByText } = render(<DepositModal {...defaultProps} />);

    expect(getByText('여행 자금')).toBeTruthy();
  });

  it('should display goal progress percentage', () => {
    const { getByText } = render(<DepositModal {...defaultProps} />);

    expect(getByText('50%')).toBeTruthy();
  });

  it('should display current and target amounts', () => {
    const { getByText } = render(<DepositModal {...defaultProps} />);

    expect(getByText('현재 ₩500,000')).toBeTruthy();
    expect(getByText('목표 ₩1,000,000')).toBeTruthy();
  });

  it('should display remaining amount', () => {
    const { getByText } = render(<DepositModal {...defaultProps} />);

    expect(getByText('목표까지 남은 금액')).toBeTruthy();
    expect(getByText('₩500,000')).toBeTruthy();
  });

  it('should render amount input with placeholder', () => {
    const { getByPlaceholderText } = render(<DepositModal {...defaultProps} />);

    expect(getByPlaceholderText('0')).toBeTruthy();
  });

  it('should render quick amount buttons', () => {
    const { getByText } = render(<DepositModal {...defaultProps} />);

    expect(getByText('+10,000')).toBeTruthy();
    expect(getByText('+50,000')).toBeTruthy();
    expect(getByText('+100,000')).toBeTruthy();
    expect(getByText('+500,000')).toBeTruthy();
  });

  it('should render full amount button', () => {
    const { getByText } = render(<DepositModal {...defaultProps} />);

    // Full amount shows the remaining amount
    expect(getByText('전액 (₩500,000)')).toBeTruthy();
  });

  it('should call onClose when cancel button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <DepositModal {...defaultProps} onClose={onClose} />
    );

    fireEvent.press(getByText('취소'));

    expect(onClose).toHaveBeenCalled();
  });

  it('should add quick amount when button is pressed', () => {
    const { getByText, getByPlaceholderText } = render(
      <DepositModal {...defaultProps} />
    );

    fireEvent.press(getByText('+10,000'));

    const input = getByPlaceholderText('0');
    expect(input.props.value).toBe('10,000');
  });

  it('should show saving text when submitting', () => {
    const { getByText } = render(
      <DepositModal {...defaultProps} isSubmitting={true} />
    );

    expect(getByText('저축 중...')).toBeTruthy();
  });

  it('should call onSubmit with amount when submit is pressed', () => {
    const onSubmit = jest.fn();
    const { getByText, getAllByText } = render(
      <DepositModal {...defaultProps} onSubmit={onSubmit} />
    );

    // Add amount first
    fireEvent.press(getByText('+10,000'));

    // Then submit - 저축하기 appears twice (title and button), click the button (second one)
    fireEvent.press(getAllByText('저축하기')[1]);

    expect(onSubmit).toHaveBeenCalledWith(10000);
  });

  it('should not call onSubmit when amount is 0', () => {
    const onSubmit = jest.fn();
    const { getAllByText } = render(
      <DepositModal {...defaultProps} onSubmit={onSubmit} />
    );

    // Submit without entering amount - 저축하기 appears twice (title and button)
    fireEvent.press(getAllByText('저축하기')[1]);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should display preview when amount is entered', () => {
    const { getByText } = render(<DepositModal {...defaultProps} />);

    // Add amount
    fireEvent.press(getByText('+100,000'));

    // Should show preview
    expect(getByText('저축 후 예상')).toBeTruthy();
    expect(getByText('₩600,000')).toBeTruthy();
    expect(getByText('60%')).toBeTruthy();
  });

  it('should set full amount when full amount button is pressed', () => {
    const { getByText, getByPlaceholderText } = render(
      <DepositModal {...defaultProps} />
    );

    fireEvent.press(getByText('전액 (₩500,000)'));

    const input = getByPlaceholderText('0');
    expect(input.props.value).toBe('500,000');
  });

  it('should not show full amount button when goal is complete', () => {
    const completedGoal: SavingsGoalForDeposit = {
      ...mockGoal,
      currentAmount: 1000000,
      progressPercent: 100,
    };

    const { queryByText } = render(
      <DepositModal {...defaultProps} goal={completedGoal} />
    );

    expect(queryByText(/전액/)).toBeNull();
  });
});
