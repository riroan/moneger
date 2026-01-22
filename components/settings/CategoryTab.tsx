'use client';

import type { Category } from '@/types';
import { FaMoneyBillWave, FaCreditCard } from 'react-icons/fa';
import { getIconComponent } from './constants';

interface CategoryTabProps {
  categories: Category[];
  isLoading: boolean;
  onAddCategory: (type: 'INCOME' | 'EXPENSE') => void;
  onEditCategory: (category: Category) => void;
}

export default function CategoryTab({ categories, isLoading, onAddCategory, onEditCategory }: CategoryTabProps) {
  const incomeCategories = categories.filter(cat => cat.type === 'INCOME');
  const expenseCategories = categories.filter(cat => cat.type === 'EXPENSE');

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-text-primary" style={{ marginBottom: '6px' }}>
        카테고리
      </h1>
      <p className="text-sm sm:text-base text-text-secondary" style={{ marginBottom: '16px' }}>
        수입과 지출 카테고리를 관리합니다.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
        {/* 수입 카테고리 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[14px] sm:rounded-[16px]" style={{ padding: '16px' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <h2 className="text-sm sm:text-lg font-semibold flex items-center gap-1 sm:gap-2">
              <FaMoneyBillWave className="text-sm sm:text-base text-accent-mint" /> 수입
              <span className="text-xs sm:text-sm text-text-muted font-normal">({incomeCategories.length}/20)</span>
            </h2>
            <button
              onClick={() => onAddCategory('INCOME')}
              className="bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary rounded-[8px] sm:rounded-[10px] font-medium text-xs sm:text-sm hover:shadow-lg transition-all cursor-pointer"
              style={{ padding: '8px 16px' }}
            >
              + 추가
            </button>
          </div>

          {isLoading ? (
            <div className="text-center text-text-muted py-4 text-sm">로딩 중...</div>
          ) : incomeCategories.length > 0 ? (
            <div className="flex flex-col" style={{ gap: '6px' }}>
              {incomeCategories.map((category) => {
                const IconComponent = getIconComponent(category.icon);
                return (
                  <div
                    key={category.id}
                    className="flex items-center bg-bg-secondary rounded-[8px] sm:rounded-[10px] cursor-pointer transition-all hover:bg-bg-card-hover"
                    style={{ padding: '10px' }}
                    onClick={() => onEditCategory(category)}
                  >
                    <div
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-[6px] sm:rounded-[8px] flex items-center justify-center text-sm sm:text-base"
                      style={{ marginRight: '10px', backgroundColor: `${category.color || '#888888'}20`, color: category.color || '#888888' }}
                    >
                      <IconComponent />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-medium truncate">{category.name}</div>
                    </div>
                    <div className="text-[10px] sm:text-xs text-text-muted">수정 →</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-text-muted py-4 text-xs sm:text-sm">수입 카테고리가 없습니다</div>
          )}
        </div>

        {/* 지출 카테고리 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[14px] sm:rounded-[16px]" style={{ padding: '16px' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <h2 className="text-sm sm:text-lg font-semibold flex items-center gap-1 sm:gap-2">
              <FaCreditCard className="text-sm sm:text-base text-accent-coral" /> 지출
              <span className="text-xs sm:text-sm text-text-muted font-normal">({expenseCategories.length}/20)</span>
            </h2>
            <button
              onClick={() => onAddCategory('EXPENSE')}
              className="bg-gradient-to-br from-accent-coral to-accent-yellow text-bg-primary rounded-[8px] sm:rounded-[10px] font-medium text-xs sm:text-sm hover:shadow-lg transition-all cursor-pointer"
              style={{ padding: '8px 16px' }}
            >
              + 추가
            </button>
          </div>

          {isLoading ? (
            <div className="text-center text-text-muted py-4 text-sm">로딩 중...</div>
          ) : expenseCategories.length > 0 ? (
            <div className="flex flex-col" style={{ gap: '6px' }}>
              {expenseCategories.map((category) => {
                const IconComponent = getIconComponent(category.icon);
                return (
                  <div
                    key={category.id}
                    className="flex items-center bg-bg-secondary rounded-[8px] sm:rounded-[10px] cursor-pointer transition-all hover:bg-bg-card-hover"
                    style={{ padding: '10px' }}
                    onClick={() => onEditCategory(category)}
                  >
                    <div
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-[6px] sm:rounded-[8px] flex items-center justify-center text-sm sm:text-base"
                      style={{ marginRight: '10px', backgroundColor: `${category.color || '#888888'}20`, color: category.color || '#888888' }}
                    >
                      <IconComponent />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-medium truncate">{category.name}</div>
                    </div>
                    <div className="text-[10px] sm:text-xs text-text-muted">수정 →</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-text-muted py-4 text-xs sm:text-sm">지출 카테고리가 없습니다</div>
          )}
        </div>
      </div>
    </div>
  );
}
