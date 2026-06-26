'use client';

import { useState, useEffect } from 'react';
import { formatNumber } from '@/utils/formatters';
import { getIconComponent } from './constants';
import { CurrencyInput } from '@/components/common';
import { useEscapeKey } from '@/hooks';
import type { Category } from '@/types';
import { FaCreditCard } from 'react-icons/fa';

interface BudgetEditModalProps {
  isOpen: boolean;
  category: Category | null;
  budgetDate: Date;
  initialAmount?: number;
  hasOverride?: boolean;
  mode?: 'category' | 'total' | 'defaultTotal';
  fallbackAmount?: number;
  fallbackLabel?: string;
  onClose: () => void;
  onSave: (amount: number) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function BudgetEditModal({
  isOpen,
  category,
  budgetDate,
  initialAmount,
  hasOverride = false,
  mode = 'category',
  fallbackAmount = 0,
  fallbackLabel = '카테고리 합산',
  onClose,
  onSave,
  onDelete,
}: BudgetEditModalProps) {
  const [budgetAmount, setBudgetAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEscapeKey(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setBudgetAmount(initialAmount != null ? initialAmount.toString() : '');
    }
  }, [isOpen, initialAmount]);

  const formatYearMonth = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };

  const handleSave = async () => {
    const amount = parseInt(budgetAmount || '0', 10);
    setIsSaving(true);
    try {
      await onSave(amount);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || (mode === 'category' && !category)) return null;

  const hasDefaultBudget = mode === 'category' && category?.defaultBudget != null && category.defaultBudget > 0;
  const isTotalBudget = mode === 'total';
  const isDefaultTotalBudget = mode === 'defaultTotal';
  const title = isDefaultTotalBudget ? '기본 소비예산 설정' : isTotalBudget ? '소비 예산 설정' : '예산 설정';
  const inputLabel = isDefaultTotalBudget ? '기본 소비예산' : isTotalBudget ? '월 소비 예산' : '월 예산';

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-[var(--border)] rounded-[24px] w-full max-w-sm animate-[fadeInUp_0.3s_ease-out] p-8 m-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors text-2xl w-8 h-8 flex items-center justify-center cursor-pointer"
          >
            ×
          </button>
        </div>

        {isTotalBudget || isDefaultTotalBudget ? (
          <div className="flex items-center bg-bg-secondary rounded-[12px] p-3 mb-5">
            <div className="w-10 h-10 rounded-[8px] flex items-center justify-center text-lg mr-3 bg-accent-coral/15 text-accent-coral">
              <FaCreditCard />
            </div>
            <div>
              <div className="text-base font-medium">{isDefaultTotalBudget ? '기본 소비예산' : '소비 예산'}</div>
              <div className="text-xs text-text-muted">{isDefaultTotalBudget ? '기본값' : formatYearMonth(budgetDate)}</div>
            </div>
          </div>
        ) : (
          (() => {
            const IconComponent = getIconComponent(category?.icon ?? null);
            return (
              <div className="flex items-center bg-bg-secondary rounded-[12px] p-3 mb-5">
                <div
                  className="w-10 h-10 rounded-[8px] flex items-center justify-center text-lg mr-3"
                  style={{ backgroundColor: `${category?.color || '#888888'}20`, color: category?.color || '#888888' }}
                >
                  <IconComponent />
                </div>
                <div>
                  <div className="text-base font-medium">{category?.name}</div>
                  <div className="text-xs text-text-muted">{formatYearMonth(budgetDate)}</div>
                </div>
              </div>
            );
          })()
        )}

        {/* 예산 입력 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            {inputLabel}
          </label>
          <CurrencyInput
            value={budgetAmount}
            onChange={setBudgetAmount}
            autoFocus
          />
        </div>

        {/* 기본값 적용 버튼 */}
        {hasDefaultBudget && (
          <div className="mb-6 space-y-2">
            {!hasOverride && (
              <div className="rounded-[10px] bg-bg-secondary px-3 py-2 text-xs text-text-secondary">
                기본 예산 <span className="mr-px">₩</span>{formatNumber(category?.defaultBudget ?? 0)} 적용 중
              </div>
            )}
            <button
              type="button"
              onClick={() => setBudgetAmount((category?.defaultBudget ?? 0).toString())}
              className="w-full text-sm text-accent-blue hover:text-accent-mint transition-colors cursor-pointer text-left"
            >
              기본값 입력 (<span className="mr-px">₩</span>{formatNumber(category?.defaultBudget ?? 0)})
            </button>
          </div>
        )}

        {(isTotalBudget || isDefaultTotalBudget) && !hasOverride && fallbackAmount > 0 && (
          <div className="rounded-[10px] bg-bg-secondary px-3 py-2 text-xs text-text-secondary mb-6">
            {fallbackLabel} <span className="mr-px">₩</span>{formatNumber(fallbackAmount)} 적용 중
          </div>
        )}

        {!hasDefaultBudget && !isTotalBudget && !isDefaultTotalBudget && <div className="mb-2" />}

        {hasOverride && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSaving || isDeleting}
            className="w-full text-sm text-text-muted hover:text-accent-coral transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mb-4 text-left"
          >
            {isDeleting ? '삭제 중...' : isDefaultTotalBudget ? '기본값 삭제' : '월별 설정 삭제'}
          </button>
        )}

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer p-3.5"
            disabled={isSaving || isDeleting}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isDeleting}
            className="flex-1 bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary rounded-[12px] font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed p-3.5"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
