'use client';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

export default function AmountInput({
  value,
  onChange,
  error,
  placeholder = '0',
}: AmountInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div>
      <label className="block text-sm text-text-secondary font-medium" style={{ marginBottom: '8px' }}>
        금액
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-base">₩</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          className={`w-full bg-bg-secondary border rounded-[12px] text-right text-text-primary text-lg focus:outline-none transition-colors ${
            error
              ? 'border-accent-coral focus:border-accent-coral'
              : 'border-[var(--border)] focus:border-accent-mint'
          }`}
          style={{ padding: '14px 16px', paddingLeft: '32px' }}
        />
      </div>
      {error && (
        <p className="text-accent-coral text-sm" style={{ marginTop: '6px' }}>
          {error}
        </p>
      )}
    </div>
  );
}
