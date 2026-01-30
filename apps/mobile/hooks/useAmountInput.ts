import { useState, useCallback, useMemo } from 'react';
import { formatAmountInput, AMOUNT_LIMITS } from '@moneger/shared';

interface UseAmountInputOptions {
  maxAmount?: number;
  initialValue?: string;
}

interface UseAmountInputReturn {
  value: string;
  exceeded: boolean;
  numericValue: number;
  handleChange: (text: string) => void;
  reset: () => void;
  setValue: (value: string) => void;
}

export function useAmountInput(
  options: UseAmountInputOptions = {}
): UseAmountInputReturn {
  const { maxAmount = AMOUNT_LIMITS.TRANSACTION_MAX, initialValue = '' } = options;
  const [value, setValue] = useState(initialValue);
  const [exceeded, setExceeded] = useState(false);

  const handleChange = useCallback(
    (text: string) => {
      const result = formatAmountInput(text, maxAmount);
      setValue(result.value);
      setExceeded(result.exceeded);
    },
    [maxAmount]
  );

  const numericValue = useMemo(
    () => parseInt(value.replace(/,/g, '') || '0', 10),
    [value]
  );

  const reset = useCallback(() => {
    setValue('');
    setExceeded(false);
  }, []);

  return {
    value,
    exceeded,
    numericValue,
    handleChange,
    reset,
    setValue,
  };
}
