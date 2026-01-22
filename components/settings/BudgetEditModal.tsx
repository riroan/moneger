'use client';

import { useState, useEffect } from 'react';
import { formatNumber } from '@/utils/formatters';
import { getIconComponent } from './constants';
import type { Category } from '@/types';

interface BudgetEditModalProps {
  isOpen: boolean;
  category: Category | null;
  budgetDate: Date;
  initialAmount?: number;
  onClose: () => void;
  onSave: (amount: number) => Promise<void>;
}

export default function BudgetEditModal({
  isOpen,
  category,
  budgetDate,
  initialAmount,
  onClose,
  onSave,
}: BudgetEditModalProps) {
  const [budgetAmount, setBudgetAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBudgetAmount(initialAmount ? initialAmount.toString() : '');
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

  if (!isOpen || !category) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-[var(--border)] rounded-[24px] w-full max-w-sm animate-[fadeInUp_0.3s_ease-out]"
        style={{ padding: '32px', margin: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary" style={{ marginBottom: '24px' }}>
          예산 설정
        </h2>

        {/* 카테고리 정보 */}
        {(() => {
          const IconComponent = getIconComponent(category.icon);
          return (
            <div className="flex items-center bg-bg-secondary rounded-[12px]" style={{ padding: '12px', marginBottom: '20px' }}>
              <div
                className="w-10 h-10 rounded-[8px] flex items-center justify-center text-lg"
                style={{ marginRight: '12px', backgroundColor: `${category.color}20`, color: category.color }}
              >
                <IconComponent />
              </div>
              <div>
                <div className="text-base font-medium">{category.name}</div>
                <div className="text-xs text-text-muted">{formatYearMonth(budgetDate)}</div>
              </div>
            </div>
          );
        })()}

        {/* 예산 입력 */}
        <div style={{ marginBottom: '16px' }}>
          <label className="block text-sm font-medium text-text-secondary" style={{ marginBottom: '8px' }}>
            월 예산
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-base">₩</span>
            <input
              type="text"
              inputMode="numeric"
              value={budgetAmount ? formatNumber(parseInt(budgetAmount, 10)) : ''}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/[^0-9]/g, '');
                const maxBudget = 100000000000000;
                if (numericValue === '' || parseInt(numericValue, 10) <= maxBudget) {
                  setBudgetAmount(numericValue);
                }
              }}
              placeholder="0"
              className="w-full bg-bg-secondary border border-[var(--border)] rounded-[12px] text-right text-lg font-mono text-text-primary focus:outline-none focus:border-accent-mint transition-colors"
              style={{ padding: '14px 16px', paddingLeft: '32px' }}
              autoFocus
            />
          </div>
        </div>

        {/* 기본값 적용 버튼 */}
        {category.defaultBudget && category.defaultBudget > 0 && (
          <button
            type="button"
            onClick={() => setBudgetAmount((category.defaultBudget ?? 0).toString())}
            className="w-full text-sm text-accent-blue hover:text-accent-mint transition-colors cursor-pointer"
            style={{ marginBottom: '24px', textAlign: 'left' }}
          >
            기본값 적용 (<span style={{ marginRight: '1px' }}>₩</span>{formatNumber(category.defaultBudget ?? 0)})
          </button>
        )}

        {!category.defaultBudget && <div style={{ marginBottom: '8px' }} />}

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer"
            style={{ padding: '14px' }}
            disabled={isSaving}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary rounded-[12px] font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ padding: '14px' }}
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
