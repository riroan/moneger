'use client';

import { useState, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string | null;
}

interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string | null;
  date: string;
  categoryId: string | null;
}

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSubmit: (data: {
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    categoryId: string;
  }) => Promise<void>;
  onDelete: () => void;
  categories: Category[];
  isSubmitting: boolean;
}

export default function EditTransactionModal({
  isOpen,
  transaction,
  onClose,
  onSubmit,
  onDelete,
  categories,
  isSubmitting,
}: EditTransactionModalProps) {
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  useEffect(() => {
    if (transaction) {
      setTransactionType(transaction.type);
      setAmount(transaction.amount.toLocaleString('ko-KR'));
      setDescription(transaction.description || '');
      setSelectedCategory(transaction.categoryId || '');
    }
  }, [transaction]);

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
  };

  if (!isOpen || !transaction) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] animate-[fadeIn_0.2s_ease-out]"
      onClick={handleClose}
    >
      <div
        className="bg-bg-card border border-[var(--border)] rounded-[24px] w-full max-w-md animate-[fadeInUp_0.3s_ease-out]"
        style={{ padding: '32px', margin: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-text-primary" style={{ marginBottom: '24px' }}>
          내역 수정
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Transaction Type Display (Read-only) */}
          <div className="flex rounded-[14px] bg-bg-secondary p-1.5" style={{ marginBottom: '20px' }}>
            <div
              className={`flex-1 rounded-[10px] font-medium transition-all ${
                transactionType === 'EXPENSE'
                  ? 'bg-gradient-to-br from-accent-coral to-accent-yellow text-bg-primary shadow-lg'
                  : 'text-text-secondary'
              }`}
              style={{ padding: '10px', textAlign: 'center', opacity: transactionType === 'EXPENSE' ? 1 : 0.5 }}
            >
              지출
            </div>
            <div
              className={`flex-1 rounded-[10px] font-medium transition-all ${
                transactionType === 'INCOME'
                  ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary shadow-lg'
                  : 'text-text-secondary'
              }`}
              style={{ padding: '10px', textAlign: 'center', opacity: transactionType === 'INCOME' ? 1 : 0.5 }}
            >
              수입
            </div>
          </div>

          {/* Amount Input */}
          <div style={{ marginBottom: '20px' }}>
            <label className="block text-sm font-medium text-text-secondary" style={{ marginBottom: '8px' }}>
              금액
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={handleAmountChange}
              className={`w-full bg-bg-secondary border ${amountError ? 'border-accent-coral' : 'border-[var(--border)]'} rounded-[12px] text-text-primary font-mono text-lg focus:outline-none focus:border-accent-blue transition-colors`}
              style={{ padding: '14px 16px' }}
              placeholder="0"
            />
            {amountError && (
              <p className="text-accent-coral text-xs" style={{ marginTop: '6px' }}>
                {amountError}
              </p>
            )}
          </div>

          {/* Description Input */}
          <div style={{ marginBottom: '20px' }}>
            <label className="block text-sm font-medium text-text-secondary" style={{ marginBottom: '8px' }}>
              내용
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setDescriptionError('');
              }}
              className={`w-full bg-bg-secondary border ${descriptionError ? 'border-accent-coral' : 'border-[var(--border)]'} rounded-[12px] text-text-primary focus:outline-none focus:border-accent-blue transition-colors`}
              style={{ padding: '14px 16px' }}
              placeholder="예: 점심 식사, 월급 등"
            />
            {descriptionError && (
              <p className="text-accent-coral text-xs" style={{ marginTop: '6px' }}>
                {descriptionError}
              </p>
            )}
          </div>

          {/* Category Dropdown */}
          <div style={{ marginBottom: '24px' }}>
            <label className="block text-sm font-medium text-text-secondary" style={{ marginBottom: '8px' }}>
              카테고리
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className={`w-full bg-bg-secondary border ${categoryError ? 'border-accent-coral' : 'border-[var(--border)]'} rounded-[12px] text-left flex items-center justify-between focus:outline-none focus:border-accent-blue transition-colors cursor-pointer`}
                style={{ padding: '14px 16px' }}
              >
                <span className={selectedCategory ? 'text-text-primary' : 'text-text-muted'}>
                  {selectedCategory
                    ? `${currentCategories.find(c => c.id === selectedCategory)?.icon} ${currentCategories.find(c => c.id === selectedCategory)?.name}`
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

          {/* Action Buttons */}
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
              type="button"
              onClick={onDelete}
              className="flex-1 bg-gradient-to-br from-accent-coral to-red-600 text-bg-primary rounded-[12px] font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ padding: '14px' }}
              disabled={isSubmitting}
            >
              삭제
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
              {isSubmitting ? '수정 중...' : '수정'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
