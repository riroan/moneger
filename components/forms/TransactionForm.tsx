'use client';

import { useEffect } from 'react';
import { useTransactionForm, type TransactionFormData } from '@/hooks/useTransactionForm';
import AmountInput from './AmountInput';
import CategoryDropdown from './CategoryDropdown';
import type { Category, TransactionWithCategory } from '@/types';

interface TransactionFormProps {
  mode: 'add' | 'edit';
  initialTransaction?: TransactionWithCategory | null;
  categories: Category[];
  isSubmitting: boolean;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function TransactionForm({
  mode,
  initialTransaction,
  categories,
  isSubmitting,
  onSubmit,
  onCancel,
  onDelete,
}: TransactionFormProps) {
  const { formState, errors, setters, validate, getFormData, reset } = useTransactionForm({
    initialTransaction,
    mode,
  });

  // Reset form when modal closes
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    await onSubmit(getFormData());

    if (mode === 'add') {
      reset();
    }
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      {/* Transaction Type Toggle */}
      {mode === 'add' ? (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setters.setType('EXPENSE')}
            className={`flex-1 rounded-[12px] font-medium transition-all cursor-pointer p-3.5 ${
              formState.type === 'EXPENSE'
                ? 'bg-gradient-to-br from-accent-coral to-accent-yellow text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-card-hover'
            }`}
          >
            💳 지출
          </button>
          <button
            type="button"
            onClick={() => setters.setType('INCOME')}
            className={`flex-1 rounded-[12px] font-medium transition-all cursor-pointer p-3.5 ${
              formState.type === 'INCOME'
                ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-card-hover'
            }`}
          >
            💼 수입
          </button>
        </div>
      ) : (
        <div className="flex rounded-[14px] bg-bg-secondary p-1.5">
          <div
            className={`flex-1 rounded-[10px] font-medium transition-all p-2.5 text-center ${
              formState.type === 'EXPENSE'
                ? 'bg-gradient-to-br from-accent-coral to-accent-yellow text-bg-primary shadow-lg'
                : 'text-text-secondary opacity-50'
            }`}
          >
            지출
          </div>
          <div
            className={`flex-1 rounded-[10px] font-medium transition-all p-2.5 text-center ${
              formState.type === 'INCOME'
                ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary shadow-lg'
                : 'text-text-secondary opacity-50'
            }`}
          >
            수입
          </div>
        </div>
      )}

      {/* Description Input */}
      <div>
        <label className="block text-sm text-text-secondary font-medium mb-2">
          내용
        </label>
        <input
          type="text"
          placeholder="예: 점심 식사, 월급 등"
          value={formState.description}
          onChange={(e) => setters.setDescription(e.target.value)}
          className={`w-full bg-bg-secondary border rounded-[12px] text-text-primary focus:outline-none transition-colors py-3.5 px-4 ${
            errors.descriptionError
              ? 'border-accent-coral focus:border-accent-coral'
              : 'border-[var(--border)] focus:border-accent-mint'
          }`}
        />
        {errors.descriptionError && (
          <p className="text-accent-coral text-xs mt-1.5">
            {errors.descriptionError}
          </p>
        )}
      </div>

      {/* Amount Input */}
      <AmountInput
        value={formState.amount}
        onChange={setters.setAmount}
        error={errors.amountError}
      />

      {/* Category Dropdown */}
      <CategoryDropdown
        categories={categories}
        selectedId={formState.selectedCategory}
        onSelect={setters.setCategory}
        type={formState.type}
        error={errors.categoryError}
      />

      {/* Action Buttons */}
      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer p-3.5"
          disabled={isSubmitting}
        >
          취소
        </button>
        {mode === 'edit' && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="flex-1 bg-bg-secondary text-accent-coral border border-accent-coral rounded-[12px] font-medium hover:bg-accent-coral hover:text-bg-primary transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed p-3.5"
            disabled={isSubmitting}
          >
            삭제
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !!errors.amountError || !formState.amount}
          className={`flex-1 rounded-[12px] font-medium transition-all hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed p-3.5 ${
            formState.type === 'EXPENSE'
              ? 'bg-gradient-to-br from-accent-coral to-accent-yellow'
              : 'bg-gradient-to-br from-accent-mint to-accent-blue'
          } text-bg-primary`}
        >
          {isSubmitting ? (mode === 'add' ? '추가 중...' : '수정 중...') : (mode === 'add' ? '추가' : '수정')}
        </button>
      </div>
    </form>
  );
}
