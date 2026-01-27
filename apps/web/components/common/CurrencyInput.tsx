'use client';

import { formatNumber } from '@/utils/formatters';
import { AMOUNT_LIMITS } from '@/lib/constants';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxAmount?: number;
  hasError?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export default function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  maxAmount = AMOUNT_LIMITS.MAX,
  hasError = false,
  disabled = false,
  autoFocus = false,
  className = '',
}: CurrencyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, '');
    if (numericValue === '' || parseInt(numericValue, 10) <= maxAmount) {
      onChange(numericValue);
    }
  };

  const displayValue = value ? formatNumber(parseInt(value, 10)) : '';

  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-base">
        ₩
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`w-full bg-bg-secondary border rounded-[12px] text-right text-lg text-text-primary focus:outline-none focus:border-accent-mint transition-colors py-3.5 pr-4 pl-8 ${
          hasError ? 'border-accent-coral' : 'border-[var(--border)]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      />
    </div>
  );
}
