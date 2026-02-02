import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AmountInput from '../../components/common/AmountInput';

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

describe('AmountInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with default placeholder', () => {
    const { getByPlaceholderText } = render(
      <AmountInput value="" onChange={mockOnChange} />
    );

    expect(getByPlaceholderText('0')).toBeTruthy();
  });

  it('should render with custom placeholder', () => {
    const { getByPlaceholderText } = render(
      <AmountInput value="" onChange={mockOnChange} placeholder="금액 입력" />
    );

    expect(getByPlaceholderText('금액 입력')).toBeTruthy();
  });

  it('should render currency symbol', () => {
    const { getByText } = render(
      <AmountInput value="" onChange={mockOnChange} />
    );

    expect(getByText('₩')).toBeTruthy();
  });

  it('should render label when provided', () => {
    const { getByText } = render(
      <AmountInput value="" onChange={mockOnChange} label="거래 금액" />
    );

    expect(getByText('거래 금액')).toBeTruthy();
  });

  it('should call onChange when text is entered', () => {
    const { getByPlaceholderText } = render(
      <AmountInput value="" onChange={mockOnChange} />
    );

    const input = getByPlaceholderText('0');
    fireEvent.changeText(input, '50000');

    expect(mockOnChange).toHaveBeenCalledWith('50,000', false);
  });

  it('should display exceeded message when exceeded prop is true', () => {
    const { getByText } = render(
      <AmountInput value="1,000,000,000,000" onChange={mockOnChange} exceeded={true} />
    );

    expect(getByText('1000억 원을 초과할 수 없습니다.')).toBeTruthy();
  });

  it('should display custom max amount message when exceeded with custom maxAmount', () => {
    const { getByText } = render(
      <AmountInput
        value="150,000"
        onChange={mockOnChange}
        exceeded={true}
        maxAmount={100000}
      />
    );

    expect(getByText('최대 100,000원까지 입력 가능합니다.')).toBeTruthy();
  });

  it('should display the value prop', () => {
    const { getByDisplayValue } = render(
      <AmountInput value="50,000" onChange={mockOnChange} />
    );

    expect(getByDisplayValue('50,000')).toBeTruthy();
  });

  it('should format numeric input correctly', () => {
    const { getByPlaceholderText } = render(
      <AmountInput value="" onChange={mockOnChange} />
    );

    const input = getByPlaceholderText('0');
    fireEvent.changeText(input, '1234567');

    expect(mockOnChange).toHaveBeenCalledWith('1,234,567', false);
  });

  it('should strip non-numeric characters', () => {
    const { getByPlaceholderText } = render(
      <AmountInput value="" onChange={mockOnChange} />
    );

    const input = getByPlaceholderText('0');
    fireEvent.changeText(input, 'abc123def456');

    expect(mockOnChange).toHaveBeenCalledWith('123,456', false);
  });

  it('should handle empty input', () => {
    const { getByPlaceholderText } = render(
      <AmountInput value="50,000" onChange={mockOnChange} />
    );

    const input = getByPlaceholderText('0');
    fireEvent.changeText(input, '');

    expect(mockOnChange).toHaveBeenCalledWith('', false);
  });
});
