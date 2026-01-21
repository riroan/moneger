'use client';

import { useState, useCallback } from 'react';
import { formatNumber } from '@/utils/formatters';
import { useOutsideClick } from '@/hooks';
import type { Category, Budget } from '@/types';
import { FaCreditCard } from 'react-icons/fa';

interface BudgetTabProps {
  categories: Category[];
  budgets: Budget[];
  isLoadingCategories: boolean;
  isLoadingBudgets: boolean;
  budgetDate: Date;
  oldestTransactionDate: { year: number; month: number } | null;
  onBudgetDateChange: (date: Date) => void;
  onOpenBudgetModal: (category: Category) => void;
}

export default function BudgetTab({
  categories,
  budgets,
  isLoadingCategories,
  isLoadingBudgets,
  budgetDate,
  oldestTransactionDate,
  onBudgetDateChange,
  onOpenBudgetModal,
}: BudgetTabProps) {
  const [isBudgetDatePickerOpen, setIsBudgetDatePickerOpen] = useState(false);
  const [budgetPickerYear, setBudgetPickerYear] = useState(() => new Date().getFullYear());

  const closeDatePicker = useCallback(() => setIsBudgetDatePickerOpen(false), []);
  const budgetDatePickerRef = useOutsideClick<HTMLDivElement>(closeDatePicker, isBudgetDatePickerOpen);

  const expenseCategories = categories.filter(cat => cat.type === 'EXPENSE');

  const isBudgetPreviousMonthDisabled = () => {
    if (!oldestTransactionDate) return false;
    const oldestMonth = oldestTransactionDate.month - 1;
    return budgetDate.getFullYear() === oldestTransactionDate.year && budgetDate.getMonth() === oldestMonth;
  };

  const isBudgetNextMonthDisabled = () => {
    const nextMonth = new Date(budgetDate);
    nextMonth.setMonth(budgetDate.getMonth() + 1);
    const now = new Date();
    return nextMonth.getFullYear() > now.getFullYear() ||
      (nextMonth.getFullYear() === now.getFullYear() && nextMonth.getMonth() > now.getMonth());
  };

  const handleBudgetPreviousMonth = () => {
    if (!isBudgetPreviousMonthDisabled()) {
      onBudgetDateChange(new Date(budgetDate.getFullYear(), budgetDate.getMonth() - 1, 1));
    }
  };

  const handleBudgetNextMonth = () => {
    if (!isBudgetNextMonthDisabled()) {
      onBudgetDateChange(new Date(budgetDate.getFullYear(), budgetDate.getMonth() + 1, 1));
    }
  };

  const handleBudgetDatePickerToggle = () => {
    if (!isBudgetDatePickerOpen) {
      setBudgetPickerYear(budgetDate.getFullYear());
    }
    setIsBudgetDatePickerOpen(!isBudgetDatePickerOpen);
  };

  const handleBudgetMonthSelect = (year: number, month: number) => {
    onBudgetDateChange(new Date(year, month, 1));
    setIsBudgetDatePickerOpen(false);
  };

  const isBudgetPastMonth = (year: number, month: number) => {
    if (!oldestTransactionDate) return false;
    const oldestMonth = oldestTransactionDate.month - 1;
    return year < oldestTransactionDate.year ||
      (year === oldestTransactionDate.year && month < oldestMonth);
  };

  const isBudgetPastYear = (year: number) => {
    if (!oldestTransactionDate) return false;
    return year < oldestTransactionDate.year;
  };

  const formatYearMonth = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };

  const getBudgetForCategory = (categoryId: string) => {
    return budgets.find(b => b.categoryId === categoryId);
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-text-primary" style={{ marginBottom: '6px' }}>
        예산
      </h1>
      <p className="text-sm sm:text-base text-text-secondary" style={{ marginBottom: '16px' }}>
        카테고리별 월 예산을 설정합니다. 예산을 설정하면 대시보드에서 사용량을 확인할 수 있습니다.
      </p>

      {/* 월 선택 */}
      <div ref={budgetDatePickerRef} className="flex items-center justify-center bg-bg-card border border-[var(--border)] rounded-[12px] relative select-none" style={{ padding: '12px', marginBottom: '16px', gap: '12px' }}>
        <button
          onClick={handleBudgetPreviousMonth}
          disabled={isBudgetPreviousMonthDisabled()}
          className="text-text-secondary hover:text-text-primary transition-colors text-lg cursor-pointer w-8 h-8 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ◀
        </button>
        <span
          onClick={handleBudgetDatePickerToggle}
          className="text-base font-semibold min-w-[120px] text-center cursor-pointer"
        >
          {formatYearMonth(budgetDate)}
        </span>
        <button
          onClick={handleBudgetNextMonth}
          disabled={isBudgetNextMonthDisabled()}
          className="text-text-secondary hover:text-text-primary transition-colors text-lg cursor-pointer w-8 h-8 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ▶
        </button>

        {/* 달력 Picker */}
        {isBudgetDatePickerOpen && (
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 bg-bg-card border border-[var(--border)] rounded-[16px] z-50 select-none"
            style={{ width: '320px', padding: '20px', marginTop: '3px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)' }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
              <button
                onClick={() => setBudgetPickerYear(prev => prev - 1)}
                disabled={isBudgetPastYear(budgetPickerYear - 1)}
                className="text-text-secondary hover:text-text-primary transition-colors text-lg cursor-pointer w-8 h-8 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ◀
              </button>
              <div className="text-text-primary font-semibold" style={{ fontSize: '16px' }}>
                {budgetPickerYear}년
              </div>
              <button
                onClick={() => setBudgetPickerYear(prev => prev + 1)}
                disabled={budgetPickerYear >= new Date().getFullYear()}
                className="text-text-secondary hover:text-text-primary transition-colors text-lg cursor-pointer w-8 h-8 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ▶
              </button>
            </div>

            <div className="grid grid-cols-4" style={{ gap: '8px' }}>
              {Array.from({ length: 12 }, (_, i) => i).map(month => {
                const isSelected = budgetDate.getFullYear() === budgetPickerYear && budgetDate.getMonth() === month;
                const now = new Date();
                const isFuture = budgetPickerYear > now.getFullYear() ||
                  (budgetPickerYear === now.getFullYear() && month > now.getMonth());
                const isPast = isBudgetPastMonth(budgetPickerYear, month);
                const isDisabled = isFuture || isPast;
                return (
                  <button
                    key={month}
                    onClick={() => handleBudgetMonthSelect(budgetPickerYear, month)}
                    disabled={isDisabled}
                    className={`rounded-[8px] font-medium transition-all ${
                      isDisabled
                        ? 'bg-bg-secondary text-text-muted opacity-30 cursor-not-allowed'
                        : isSelected
                        ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary cursor-pointer'
                        : 'bg-bg-secondary text-text-secondary hover:bg-bg-card-hover cursor-pointer'
                    }`}
                    style={{ padding: '10px 0', fontSize: '14px' }}
                  >
                    {month + 1}월
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-bg-card border border-[var(--border)] rounded-[14px] sm:rounded-[16px]" style={{ padding: '16px' }}>
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2" style={{ marginBottom: '16px' }}>
          <FaCreditCard className="text-base sm:text-lg text-accent-coral" /> 지출 카테고리별 예산
        </h2>

        {isLoadingBudgets || isLoadingCategories ? (
          <div className="text-center text-text-muted py-8 text-sm">로딩 중...</div>
        ) : expenseCategories.length === 0 ? (
          <div className="text-center text-text-muted py-8 text-sm">지출 카테고리가 없습니다</div>
        ) : (
          <div className="flex flex-col" style={{ gap: '12px' }}>
            {expenseCategories.map(category => {
              const budget = getBudgetForCategory(category.id);
              const hasMonthlyBudget = budget && budget.amount > 0;
              const hasDefaultBudget = category.defaultBudget && category.defaultBudget > 0;

              return (
                <div
                  key={category.id}
                  className="bg-bg-secondary rounded-[12px] sm:rounded-[14px] cursor-pointer transition-all hover:bg-bg-card-hover"
                  style={{ padding: '16px' }}
                  onClick={() => onOpenBudgetModal(category)}
                >
                  {/* 상단: 아이콘, 카테고리명, 기본예산, 설정 버튼 */}
                  <div className="flex items-center">
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-[10px] sm:rounded-[12px] flex items-center justify-center text-lg sm:text-xl"
                      style={{ marginRight: '12px', backgroundColor: `${category.color}20` }}
                    >
                      {category.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm sm:text-base font-medium truncate">{category.name}</div>
                      {hasDefaultBudget && (
                        <div className="text-[11px] sm:text-xs text-text-muted" style={{ marginTop: '2px' }}>
                          기본 <span style={{ marginRight: '1px' }}>₩</span>{formatNumber(category.defaultBudget || 0)}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] sm:text-xs text-text-muted">설정 →</span>
                  </div>

                  {/* 하단: 예산 금액 */}
                  <div className="border-t border-[var(--border)]" style={{ marginTop: '12px', paddingTop: '12px' }}>
                    <div className="text-right">
                      {hasMonthlyBudget ? (
                        <span className="text-lg sm:text-xl font-bold text-accent-mint">
                          <span style={{ marginRight: '1px' }}>₩</span>{formatNumber(budget.amount)}
                        </span>
                      ) : (
                        <span className="text-sm sm:text-base text-text-muted">미설정</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
