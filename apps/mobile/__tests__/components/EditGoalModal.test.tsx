import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EditGoalModal, SavingsGoalForEdit } from '../../components/savings/EditGoalModal';

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
    MAX: 100000000000000,
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

describe('EditGoalModal', () => {
  const mockGoal: SavingsGoalForEdit = {
    id: 'goal-1',
    name: '여행 자금',
    icon: 'travel',
    targetAmount: 1000000,
    targetDate: '2027년 12월',
  };

  const defaultProps = {
    visible: true,
    goal: mockGoal,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    onDelete: jest.fn(),
    isSubmitting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal when visible', () => {
    const { getByText } = render(<EditGoalModal {...defaultProps} />);

    expect(getByText('저축 목표 수정')).toBeTruthy();
  });

  it('should return null when goal is null', () => {
    const { toJSON } = render(
      <EditGoalModal {...defaultProps} goal={null} />
    );

    expect(toJSON()).toBeNull();
  });

  it('should display goal name in input', () => {
    const { getByDisplayValue } = render(<EditGoalModal {...defaultProps} />);

    expect(getByDisplayValue('여행 자금')).toBeTruthy();
  });

  it('should display target amount in input', () => {
    const { getByDisplayValue } = render(<EditGoalModal {...defaultProps} />);

    expect(getByDisplayValue('1,000,000')).toBeTruthy();
  });

  it('should render labels', () => {
    const { getByText } = render(<EditGoalModal {...defaultProps} />);

    expect(getByText('목표 이름')).toBeTruthy();
    expect(getByText('아이콘')).toBeTruthy();
    expect(getByText('목표 금액')).toBeTruthy();
    expect(getByText('목표 날짜')).toBeTruthy();
  });

  it('should call onClose when cancel button is pressed', () => {
    const onClose = jest.fn();
    const { getAllByText } = render(
      <EditGoalModal {...defaultProps} onClose={onClose} />
    );

    // 취소 button exists
    const cancelButtons = getAllByText('취소');
    fireEvent.press(cancelButtons[0]);

    expect(onClose).toHaveBeenCalled();
  });

  it('should update goal name when typed', () => {
    const { getByDisplayValue } = render(<EditGoalModal {...defaultProps} />);

    const input = getByDisplayValue('여행 자금');
    fireEvent.changeText(input, '새로운 목표');

    expect(getByDisplayValue('새로운 목표')).toBeTruthy();
  });

  it('should render submit button', () => {
    const { getByText } = render(<EditGoalModal {...defaultProps} />);

    expect(getByText('저장')).toBeTruthy();
  });

  it('should show saving text when submitting', () => {
    const { getByText } = render(
      <EditGoalModal {...defaultProps} isSubmitting={true} />
    );

    expect(getByText('저장 중...')).toBeTruthy();
  });

  it('should render delete button', () => {
    const { getByText } = render(<EditGoalModal {...defaultProps} />);

    expect(getByText('삭제')).toBeTruthy();
  });

  it('should show delete confirmation when delete button is pressed', () => {
    const { getByText } = render(<EditGoalModal {...defaultProps} />);

    fireEvent.press(getByText('삭제'));

    expect(getByText('정말로 이 저축 목표를 삭제하시겠습니까?\n저축 내역도 함께 삭제됩니다.')).toBeTruthy();
  });

  it('should call onDelete when confirm delete is pressed', () => {
    const onDelete = jest.fn();
    const { getByText, getAllByText } = render(
      <EditGoalModal {...defaultProps} onDelete={onDelete} />
    );

    // First press delete to show confirmation
    fireEvent.press(getByText('삭제'));

    // Then press the confirm delete button
    const deleteButtons = getAllByText('삭제');
    fireEvent.press(deleteButtons[deleteButtons.length - 1]);

    expect(onDelete).toHaveBeenCalled();
  });

  it('should hide delete confirmation when cancel is pressed in confirmation', () => {
    const { getByText, getAllByText, queryByText } = render(<EditGoalModal {...defaultProps} />);

    // First press delete to show confirmation
    fireEvent.press(getByText('삭제'));

    // Then press cancel in the confirmation
    const cancelButtons = getAllByText('취소');
    fireEvent.press(cancelButtons[cancelButtons.length - 1]);

    // Confirmation text should disappear
    expect(queryByText('정말로 이 저축 목표를 삭제하시겠습니까?')).toBeNull();
  });

  it('should parse target date correctly', () => {
    const { getByText } = render(<EditGoalModal {...defaultProps} />);

    // Should display the year and month from targetDate
    expect(getByText('2027년')).toBeTruthy();
    expect(getByText('12월')).toBeTruthy();
  });

  it('should call onSubmit with updated data', () => {
    const onSubmit = jest.fn();
    const { getByText, getByDisplayValue } = render(
      <EditGoalModal {...defaultProps} onSubmit={onSubmit} />
    );

    // Update name
    const nameInput = getByDisplayValue('여행 자금');
    fireEvent.changeText(nameInput, '새로운 목표');

    // Submit
    fireEvent.press(getByText('저장'));

    expect(onSubmit).toHaveBeenCalledWith({
      name: '새로운 목표',
      icon: 'travel',
      targetAmount: 1000000,
      targetYear: 2027,
      targetMonth: 12,
    });
  });
});
