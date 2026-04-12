'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MdKeyboardArrowDown } from 'react-icons/md';
import { CurrencyInput } from '@/components/common';
import { useOutsideClickWithRef } from '@/hooks';
import CategoryDropdown from '@/components/forms/CategoryDropdown';
import type { Category } from '@/types';

interface AddRecurringModalProps {
  isOpen: boolean;
  userId: string;
  onClose: () => void;
  onSave: () => void;
}

export default function AddRecurringModal({ isOpen, userId, onClose, onSave }: AddRecurringModalProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [descriptionError, setDescriptionError] = useState('');
  const [amountError, setAmountError] = useState('');

  // 지출일 드롭다운
  const [isDayOpen, setIsDayOpen] = useState(false);
  const [dayDropdownPos, setDayDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const dayRef = useRef<HTMLDivElement>(null);
  const dayButtonRef = useRef<HTMLButtonElement>(null);

  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const closeDayDropdown = useCallback(() => setIsDayOpen(false), []);
  useOutsideClickWithRef(dayRef, closeDayDropdown);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`/api/categories?userId=${userId}`);
      const json = await res.json();
      if (json.data) setCategories(json.data);
    } catch { /* ignore */ }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen, fetchCategories]);

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setDayOfMonth(1);
    setCategoryId('');
    setDescriptionError('');
    setAmountError('');
    setIsDayOpen(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    let hasError = false;

    if (!description.trim()) {
      setDescriptionError('설명을 입력해주세요');
      hasError = true;
    } else {
      setDescriptionError('');
    }

    const parsedAmount = parseInt(amount || '0', 10);
    if (parsedAmount <= 0) {
      setAmountError('금액을 입력해주세요');
      hasError = true;
    } else {
      setAmountError('');
    }

    if (hasError) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: parsedAmount,
          description: description.trim(),
          categoryId: categoryId || null,
          dayOfMonth,
        }),
      });
      if (res.ok) {
        resetForm();
        onSave();
        onClose();
      } else {
        const json = await res.json();
        if (json.error) {
          setDescriptionError(json.error);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] animate-[fadeIn_0.2s_ease-out]"
      onClick={handleClose}
    >
      <div
        className="bg-bg-card border border-[var(--border)] rounded-[24px] w-full max-w-md animate-[fadeInUp_0.3s_ease-out] max-h-[90vh] overflow-visible p-8 m-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
            정기 지출 추가
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-text-secondary hover:text-text-primary transition-colors text-2xl w-8 h-8 flex items-center justify-center cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* 설명 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            설명
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (e.target.value.trim()) setDescriptionError('');
            }}
            placeholder="예: 월세, Netflix, 보험료"
            className={`w-full bg-bg-secondary border rounded-[12px] text-base text-text-primary focus:outline-none focus:border-accent-coral transition-colors py-3.5 px-4 ${
              descriptionError ? 'border-accent-coral' : 'border-[var(--border)]'
            }`}
            autoFocus
          />
          {descriptionError && <p className="text-xs text-accent-coral mt-1.5">{descriptionError}</p>}
        </div>

        {/* 금액 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            금액
          </label>
          <CurrencyInput
            value={amount}
            onChange={(value) => {
              setAmount(value);
              if (value && parseInt(value, 10) > 0) setAmountError('');
            }}
            hasError={!!amountError}
          />
          {amountError && <p className="text-xs text-accent-coral mt-1.5">{amountError}</p>}
        </div>

        {/* 지출일 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            지출일
          </label>
          <div ref={dayRef} className="relative">
            <button
              ref={dayButtonRef}
              type="button"
              onClick={() => {
                if (!isDayOpen && dayButtonRef.current) {
                  const rect = dayButtonRef.current.getBoundingClientRect();
                  setDayDropdownPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
                }
                setIsDayOpen(!isDayOpen);
              }}
              className="w-full bg-bg-secondary border border-[var(--border)] rounded-[12px] text-text-primary focus:outline-none focus:border-accent-coral transition-colors cursor-pointer flex items-center justify-between py-3.5 px-4"
            >
              <span>매월 {dayOfMonth}일</span>
              <MdKeyboardArrowDown className={`text-lg text-text-muted transition-transform ${isDayOpen ? 'rotate-180' : ''}`} />
            </button>
            {isDayOpen && (
              <div
                className="fixed bg-bg-card border border-[var(--border)] rounded-[12px] overflow-y-auto z-[300] shadow-[0_8px_24px_rgba(0,0,0,0.3)] max-h-[200px]"
                style={{ top: dayDropdownPos.top, left: dayDropdownPos.left, width: dayDropdownPos.width }}
              >
                {days.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => { setDayOfMonth(d); setIsDayOpen(false); }}
                    className={`w-full text-left hover:bg-bg-card-hover transition-colors border-b border-[var(--border)] last:border-b-0 cursor-pointer py-3 px-4 ${
                      dayOfMonth === d ? 'bg-bg-card-hover text-accent-coral' : 'text-text-primary'
                    }`}
                  >
                    {d}일
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 카테고리 */}
        <div className="mb-6">
          <CategoryDropdown
            categories={categories}
            selectedId={categoryId}
            onSelect={setCategoryId}
            type="EXPENSE"
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer p-3.5"
            disabled={isSaving}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-gradient-to-br from-accent-coral to-accent-yellow text-bg-primary rounded-[12px] font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed p-3.5"
          >
            {isSaving ? '저장 중...' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
