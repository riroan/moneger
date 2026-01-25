'use client';

import { useState, useEffect } from 'react';
import { formatNumber } from '@/utils/formatters';
import { ICON_LIST, ICON_MAP, COLOR_LIST } from './constants';
import type { Category } from '@/types';

interface CategoryFormModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initialCategory?: Category | null;
  initialType: 'INCOME' | 'EXPENSE';
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  onDelete?: () => void;
}

export interface CategoryFormData {
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string;
  color: string;
  defaultBudget: string;
}

export default function CategoryFormModal({
  isOpen,
  mode,
  initialCategory,
  initialType,
  onClose,
  onSubmit,
  onDelete,
}: CategoryFormModalProps) {
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<'INCOME' | 'EXPENSE'>(initialType);
  const [categoryIcon, setCategoryIcon] = useState('box');
  const [categoryColor, setCategoryColor] = useState('#EF4444');
  const [categoryDefaultBudget, setCategoryDefaultBudget] = useState('');
  const [nameError, setNameError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialCategory) {
        setCategoryName(initialCategory.name);
        setCategoryType(initialCategory.type);
        setCategoryIcon(initialCategory.icon || 'money');
        setCategoryColor(initialCategory.color || '#6366F1');
        setCategoryDefaultBudget(initialCategory.defaultBudget ? initialCategory.defaultBudget.toString() : '');
      } else {
        setCategoryName('');
        setCategoryType(initialType);
        setCategoryIcon(initialType === 'INCOME' ? 'money' : 'cart');
        setCategoryColor(initialType === 'INCOME' ? '#10B981' : '#EF4444');
        setCategoryDefaultBudget('');
      }
      setNameError('');
    }
  }, [isOpen, mode, initialCategory, initialType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryName || categoryName.trim() === '') {
      setNameError('카테고리 이름을 입력해주세요');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: categoryName,
        type: categoryType,
        icon: categoryIcon,
        color: categoryColor,
        defaultBudget: categoryDefaultBudget,
      });
      handleClose();
    } catch (error) {
      if (error instanceof Error) {
        setNameError(error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCategoryName('');
    setCategoryType('EXPENSE');
    setCategoryIcon('box');
    setCategoryColor('#EF4444');
    setCategoryDefaultBudget('');
    setNameError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] animate-[fadeIn_0.2s_ease-out]"
      onClick={handleClose}
    >
      <div
        className="bg-bg-card border border-[var(--border)] rounded-[24px] w-full max-w-md max-h-[90vh] flex flex-col animate-[fadeInUp_0.3s_ease-out] m-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center flex-shrink-0 pt-8 px-8 mb-6">
          <h2 className="text-2xl font-bold text-text-primary">
            {mode === 'add' ? '카테고리 추가' : '카테고리 수정'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-text-secondary hover:text-text-primary transition-colors text-2xl w-8 h-8 flex items-center justify-center cursor-pointer"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 flex flex-col px-8 pb-8">
          {/* Type Display */}
          <div className="flex rounded-[14px] bg-bg-secondary p-1.5 mb-5">
            <div
              className={`flex-1 rounded-[10px] font-medium text-center p-2.5 ${
                categoryType === 'EXPENSE'
                  ? 'bg-gradient-to-br from-accent-coral to-accent-yellow text-bg-primary shadow-lg'
                  : 'text-text-secondary opacity-50'
              }`}
            >
              지출
            </div>
            <div
              className={`flex-1 rounded-[10px] font-medium text-center p-2.5 ${
                categoryType === 'INCOME'
                  ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary shadow-lg'
                  : 'text-text-secondary opacity-50'
              }`}
            >
              수입
            </div>
          </div>

          {/* Name Input */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              카테고리 이름
            </label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
                setNameError('');
              }}
              className={`w-full bg-bg-secondary border ${nameError ? 'border-accent-coral' : 'border-[var(--border)]'} rounded-[12px] text-text-primary focus:outline-none focus:border-accent-blue transition-colors py-3.5 px-4`}
              placeholder="예: 식비, 교통비 등"
            />
            {nameError && (
              <p className="text-accent-coral text-xs mt-1.5">
                {nameError}
              </p>
            )}
          </div>

          {/* Icon Selection */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              아이콘
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {ICON_LIST.map((iconId) => {
                const IconComponent = ICON_MAP[iconId];
                return (
                  <button
                    key={iconId}
                    type="button"
                    onClick={() => setCategoryIcon(iconId)}
                    className={`w-full aspect-square rounded-[10px] flex items-center justify-center text-xl transition-all cursor-pointer ${
                      categoryIcon === iconId
                        ? 'bg-accent-blue text-white shadow-lg scale-110'
                        : 'bg-bg-secondary hover:bg-bg-card-hover text-text-primary'
                    }`}
                  >
                    <IconComponent />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div className={categoryType === 'EXPENSE' ? 'mb-5' : 'mb-6'}>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              색상
            </label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_LIST.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setCategoryColor(color.value)}
                  className={`w-full aspect-square rounded-[10px] transition-all cursor-pointer ${
                    categoryColor === color.value
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-card scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Default Budget (Expense only) */}
          {categoryType === 'EXPENSE' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                기본 예산 (선택)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-base">₩</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={categoryDefaultBudget ? formatNumber(parseInt(categoryDefaultBudget, 10)) : ''}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                    const maxBudget = 100000000000000;
                    if (numericValue === '' || parseInt(numericValue, 10) <= maxBudget) {
                      setCategoryDefaultBudget(numericValue);
                    }
                  }}
                  placeholder="0"
                  className="w-full bg-bg-secondary border border-[var(--border)] rounded-[12px] text-right text-base text-text-primary focus:outline-none focus:border-accent-blue transition-colors py-3.5 pr-4 pl-8"
                />
              </div>
              <p className="text-xs text-text-muted mt-1.5">
                월별 예산을 설정하지 않으면 기본 예산이 적용됩니다.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 flex-shrink-0 mt-auto pt-1">
            <button
              type="button"
              onClick={handleClose}
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
              disabled={isSubmitting || !categoryName}
              className={`flex-1 rounded-[12px] font-medium transition-all hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed p-3.5 ${
                categoryType === 'EXPENSE'
                  ? 'bg-gradient-to-br from-accent-coral to-accent-yellow'
                  : 'bg-gradient-to-br from-accent-mint to-accent-blue'
              } text-bg-primary`}
            >
              {isSubmitting ? (mode === 'add' ? '추가 중...' : '수정 중...') : (mode === 'add' ? '추가' : '수정')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
