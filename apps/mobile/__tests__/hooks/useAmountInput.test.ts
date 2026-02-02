import { renderHook, act } from '@testing-library/react-native';
import { useAmountInput } from '../../hooks/useAmountInput';

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

describe('useAmountInput', () => {
  it('should initialize with empty value', () => {
    const { result } = renderHook(() => useAmountInput());

    expect(result.current.value).toBe('');
    expect(result.current.exceeded).toBe(false);
    expect(result.current.numericValue).toBe(0);
  });

  it('should initialize with initial value', () => {
    const { result } = renderHook(() =>
      useAmountInput({ initialValue: '1,000' })
    );

    expect(result.current.value).toBe('1,000');
    expect(result.current.numericValue).toBe(1000);
  });

  it('should handle value change', () => {
    const { result } = renderHook(() => useAmountInput());

    act(() => {
      result.current.handleChange('50000');
    });

    expect(result.current.value).toBe('50,000');
    expect(result.current.numericValue).toBe(50000);
    expect(result.current.exceeded).toBe(false);
  });

  it('should format value with commas', () => {
    const { result } = renderHook(() => useAmountInput());

    act(() => {
      result.current.handleChange('1234567');
    });

    expect(result.current.value).toBe('1,234,567');
    expect(result.current.numericValue).toBe(1234567);
  });

  it('should detect exceeded amount', () => {
    const { result } = renderHook(() =>
      useAmountInput({ maxAmount: 100000 })
    );

    act(() => {
      result.current.handleChange('150000');
    });

    expect(result.current.exceeded).toBe(true);
  });

  it('should reset value', () => {
    const { result } = renderHook(() => useAmountInput());

    act(() => {
      result.current.handleChange('50000');
    });

    expect(result.current.value).toBe('50,000');

    act(() => {
      result.current.reset();
    });

    expect(result.current.value).toBe('');
    expect(result.current.exceeded).toBe(false);
    expect(result.current.numericValue).toBe(0);
  });

  it('should set value directly', () => {
    const { result } = renderHook(() => useAmountInput());

    act(() => {
      result.current.setValue('100,000');
    });

    expect(result.current.value).toBe('100,000');
    expect(result.current.numericValue).toBe(100000);
  });

  it('should handle empty string input', () => {
    const { result } = renderHook(() => useAmountInput());

    act(() => {
      result.current.handleChange('50000');
    });

    act(() => {
      result.current.handleChange('');
    });

    expect(result.current.value).toBe('');
    expect(result.current.numericValue).toBe(0);
  });

  it('should strip non-numeric characters', () => {
    const { result } = renderHook(() => useAmountInput());

    act(() => {
      result.current.handleChange('abc123def456');
    });

    expect(result.current.value).toBe('123,456');
    expect(result.current.numericValue).toBe(123456);
  });

  it('should use default maxAmount when not provided', () => {
    const { result } = renderHook(() => useAmountInput());

    act(() => {
      result.current.handleChange('99999999999');
    });

    expect(result.current.exceeded).toBe(false);
  });
});
