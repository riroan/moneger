'use client';

import { useState, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string | null;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    categoryId: string;
  }) => Promise<void>;
  categories: Category[];
  isSubmitting: boolean;
}

export default function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
  isSubmitting,
}: TransactionModalProps) {
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const currentCategories = categories.filter(cat => cat.type === transactionType);

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setSelectedCategory('');
    setAmountError('');
    setDescriptionError('');
    setCategoryError('');
    setIsCategoryOpen(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const rawValue = value.replace(/,/g, '');

    if (rawValue === '') {
      setAmount('');
      setAmountError('');
      return;
    }

    if (!/^\d+$/.test(rawValue)) {
      setAmountError('숫자만 입력할 수 있습니다');
      return;
    }

    if (parseInt(rawValue) === 0) {
      setAmountError('0보다 큰 금액을 입력하세요');
      setAmount(rawValue);
      return;
    }

    const formattedValue = parseInt(rawValue).toLocaleString('ko-KR');
    setAmount(formattedValue);
    setAmountError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;

    if (!amount || amountError) {
      setAmountError('금액을 입력해주세요');
      hasError = true;
    }

    if (!description || description.trim() === '') {
      setDescriptionError('내용을 입력해주세요');
      hasError = true;
    }

    if (!selectedCategory) {
      setCategoryError('카테고리를 선택해주세요');
      hasError = true;
    }

    if (hasError) return;

    const rawAmount = parseInt(amount.replace(/,/g, ''));

    await onSubmit({
      type: transactionType,
      amount: rawAmount,
      description: description.trim(),
      categoryId: selectedCategory,
    });

    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
      onClick={handleClose}
    >
      <div
        className="bg-bg-card border border-[var(--border)] rounded-[24px] animate-[fadeIn_0.3s_ease-out]"
        style={{
          width: '90%',
          maxWidth: '520px',
          padding: '32px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
          <h2 className="text-xl font-bold">내역 추가</h2>
          <button
            onClick={handleClose}
            className="text-text-secondary hover:text-text-primary transition-colors text-2xl w-8 h-8 flex items-center justify-center cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Transaction Type Toggle */}
        <div className="flex gap-3" style={{ marginBottom: '24px' }}>
          <button
            onClick={() => {
              setTransactionType('EXPENSE');
              setSelectedCategory('');
            }}
            className={`flex-1 rounded-[12px] font-medium transition-all cursor-pointer ${
              transactionType === 'EXPENSE'
                ? 'bg-gradient-to-br from-accent-coral to-accent-yellow text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-card-hover'
            }`}
            style={{ padding: '14px' }}
          >
            💳 지출
          </button>
          <button
            onClick={() => {
              setTransactionType('INCOME');
              setSelectedCategory('');
            }}
            className={`flex-1 rounded-[12px] font-medium transition-all cursor-pointer ${
              transactionType === 'INCOME'
                ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-card-hover'
            }`}
            style={{ padding: '14px' }}
          >
            💼 수입
          </button>
        </div>

        {/* Form Fields */}
        <form className="flex flex-col" style={{ gap: '20px' }} onSubmit={handleSubmit}>
          {/* Amount */}
          <div>
            <label className="block text-sm text-text-secondary font-medium" style={{ marginBottom: '8px' }}>
              금액
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={handleAmountChange}
              className={`w-full bg-bg-secondary border rounded-[12px] text-text-primary font-mono text-lg focus:outline-none transition-colors ${
                amountError
                  ? 'border-accent-coral focus:border-accent-coral'
                  : 'border-[var(--border)] focus:border-accent-mint'
              }`}
              style={{ padding: '14px 16px' }}
            />
            {amountError && (
              <p className="text-accent-coral text-sm" style={{ marginTop: '6px' }}>
                {amountError}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-text-secondary font-medium" style={{ marginBottom: '8px' }}>
              내용
            </label>
            <input
              type="text"
              placeholder="예: 점심 식사, 월급 등"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (e.target.value.trim()) {
                  setDescriptionError('');
                }
              }}
              className={`w-full bg-bg-secondary border rounded-[12px] text-text-primary focus:outline-none transition-colors ${
                descriptionError
                  ? 'border-accent-coral focus:border-accent-coral'
                  : 'border-[var(--border)] focus:border-accent-mint'
              }`}
              style={{ padding: '14px 16px' }}
            />
            {descriptionError && (
              <p className="text-accent-coral text-xs" style={{ marginTop: '6px' }}>
                {descriptionError}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm text-text-secondary font-medium" style={{ marginBottom: '8px' }}>
              카테고리
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className={`w-full bg-bg-secondary border rounded-[12px] text-text-primary focus:outline-none transition-colors cursor-pointer text-left flex items-center justify-between ${
                  categoryError
                    ? 'border-accent-coral focus:border-accent-coral'
                    : 'border-[var(--border)] focus:border-accent-mint'
                }`}
                style={{ padding: '14px 16px' }}
              >
                <span className={selectedCategory ? 'text-text-primary' : 'text-text-muted'}>
                  {selectedCategory
                    ? (() => {
                        const cat = currentCategories.find(c => c.id === selectedCategory);
                        return cat ? `${cat.icon} ${cat.name}` : '카테고리 선택';
                      })()
                    : '카테고리 선택'}
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={`transition-transform text-text-secondary ${isCategoryOpen ? 'rotate-180' : ''}`}
                >
                  <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {isCategoryOpen && (
                <div
                  className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-[var(--border)] rounded-[12px] overflow-y-auto z-10"
                  style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)', maxHeight: '240px' }}
                >
                  {currentCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setCategoryError('');
                        setIsCategoryOpen(false);
                      }}
                      className="w-full text-left hover:bg-bg-card-hover transition-colors text-text-primary border-b border-[var(--border)] last:border-b-0 cursor-pointer"
                      style={{ padding: '12px 16px', fontSize: '15px' }}
                    >
                      {category.icon} {category.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {categoryError && (
              <p className="text-accent-coral text-xs" style={{ marginTop: '6px' }}>
                {categoryError}
              </p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3" style={{ marginTop: '8px' }}>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer"
              style={{ padding: '14px' }}
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!amountError || !amount}
              className={`flex-1 rounded-[12px] font-medium transition-all hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                transactionType === 'EXPENSE'
                  ? 'bg-gradient-to-br from-accent-coral to-accent-yellow'
                  : 'bg-gradient-to-br from-accent-mint to-accent-blue'
              } text-bg-primary`}
              style={{ padding: '14px' }}
            >
              {isSubmitting ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
