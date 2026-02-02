import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AddGoalModal } from '../../components/savings/AddGoalModal';

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

describe('AddGoalModal', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    isSubmitting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal when visible', () => {
    const { getByText } = render(<AddGoalModal {...defaultProps} />);

    expect(getByText('저축 목표 추가')).toBeTruthy();
  });

  it('should not render content when not visible', () => {
    const { queryByText } = render(
      <AddGoalModal {...defaultProps} visible={false} />
    );

    expect(queryByText('저축 목표 추가')).toBeNull();
  });

  it('should render goal name input with placeholder', () => {
    const { getByPlaceholderText } = render(<AddGoalModal {...defaultProps} />);

    expect(getByPlaceholderText('예: 내 집 마련, 여행 자금')).toBeTruthy();
  });

  it('should render labels', () => {
    const { getByText } = render(<AddGoalModal {...defaultProps} />);

    expect(getByText('목표 이름')).toBeTruthy();
    expect(getByText('아이콘')).toBeTruthy();
    expect(getByText('목표 금액')).toBeTruthy();
    expect(getByText('현재 저축액 (선택)')).toBeTruthy();
  });

  it('should call onClose when cancel button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <AddGoalModal {...defaultProps} onClose={onClose} />
    );

    fireEvent.press(getByText('취소'));

    expect(onClose).toHaveBeenCalled();
  });

  it('should render icon section', () => {
    const { getByText } = render(<AddGoalModal {...defaultProps} />);

    // Should have icon label
    expect(getByText('아이콘')).toBeTruthy();
  });

  it('should update goal name when typed', () => {
    const { getByPlaceholderText } = render(<AddGoalModal {...defaultProps} />);

    const input = getByPlaceholderText('예: 내 집 마련, 여행 자금');
    fireEvent.changeText(input, '여행 자금');

    expect(input.props.value).toBe('여행 자금');
  });

  it('should render date selectors', () => {
    const { getByText } = render(<AddGoalModal {...defaultProps} />);

    expect(getByText('시작 날짜')).toBeTruthy();
    expect(getByText('목표 날짜')).toBeTruthy();
  });

  it('should render submit button', () => {
    const { getByText } = render(<AddGoalModal {...defaultProps} />);

    expect(getByText('추가')).toBeTruthy();
  });

  it('should show saving text when submitting', () => {
    const { getByText } = render(
      <AddGoalModal {...defaultProps} isSubmitting={true} />
    );

    expect(getByText('저장 중...')).toBeTruthy();
  });

  it('should render year and month texts', () => {
    const { getAllByText } = render(<AddGoalModal {...defaultProps} />);

    // Should have year texts
    const yearTexts = getAllByText(/\d{4}년/);
    expect(yearTexts.length).toBeGreaterThanOrEqual(2);

    // Should have month texts
    const monthTexts = getAllByText(/\d{1,2}월/);
    expect(monthTexts.length).toBeGreaterThanOrEqual(2);
  });
});
