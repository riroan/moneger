'use client';

import { useState, useEffect, useRef } from 'react';

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
  const [categorySearch, setCategorySearch] = useState('');
  const categoryRef = useRef<HTMLDivElement>(null);

  const currentCategories = categories.filter(cat => cat.type === transactionType);
  const filteredCategories = currentCategories.filter(cat =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
    (cat.icon && cat.icon.includes(categorySearch))
  );

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!isCategoryOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
        setCategorySearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCategoryOpen]);

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setSelectedCategory('');
    setAmountError('');
    setDescriptionError('');
    setCategoryError('');
    setIsCategoryOpen(false);
    setCategorySearch('');
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

    if (parseInt(rawValue) > 100000000000) {
      setAmountError('1000억 원을 초과할 수 없습니다');
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

          {/* Category */}
          <div ref={categoryRef}>
            <label className="block text-sm text-text-secondary font-medium" style={{ marginBottom: '8px' }}>
              카테고리
            </label>
            <div className="relative">
              <div
                className={`w-full bg-bg-secondary border rounded-[12px] text-text-primary focus-within:border-accent-mint transition-colors flex items-center ${
                  categoryError
                    ? 'border-accent-coral focus-within:border-accent-coral'
                    : 'border-[var(--border)]'
                }`}
                style={{ padding: '14px 16px' }}
              >
                {selectedCategory && !isCategoryOpen && (
                  <span className="text-text-primary" style={{ marginRight: '5px' }}>
                    {(() => {
                      const cat = currentCategories.find(c => c.id === selectedCategory);
                      return cat ? `${cat.icon}` : '';
                    })()}
                  </span>
                )}
                <input
                  type="text"
                  placeholder={selectedCategory ? '' : '카테고리 검색 또는 선택'}
                  value={isCategoryOpen ? categorySearch : (selectedCategory ? currentCategories.find(c => c.id === selectedCategory)?.name || '' : '')}
                  onChange={(e) => {
                    setCategorySearch(e.target.value);
                    if (!isCategoryOpen) setIsCategoryOpen(true);
                  }}
                  onFocus={() => {
                    setIsCategoryOpen(true);
                    setCategorySearch('');
                  }}
                  className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-muted"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryOpen(!isCategoryOpen);
                    if (!isCategoryOpen) setCategorySearch('');
                  }}
                  className="ml-2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {isCategoryOpen && (
                <div
                  className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-[var(--border)] rounded-[12px] overflow-y-auto z-10"
                  style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)', maxHeight: '240px' }}
                >
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(category.id);
                          setCategoryError('');
                          setIsCategoryOpen(false);
                          setCategorySearch('');
                        }}
                        className={`w-full text-left hover:bg-bg-card-hover transition-colors border-b border-[var(--border)] last:border-b-0 cursor-pointer flex items-center gap-3 ${
                          selectedCategory === category.id ? 'bg-bg-card-hover text-accent-mint' : 'text-text-primary'
                        }`}
                        style={{ padding: '12px 16px', fontSize: '15px' }}
                      >
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                      </button>
                    ))
                  ) : (
                    <div className="text-text-muted text-center" style={{ padding: '12px 16px', fontSize: '14px' }}>
                      일치하는 카테고리가 없습니다
                    </div>
                  )}
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
