'use client';

import type { Category } from '@/types';
import { FaMoneyBillWave, FaCreditCard } from 'react-icons/fa';
import { MdAccountBalanceWallet } from 'react-icons/md';
import { getIconComponent } from './constants';
import { CATEGORY_GROUP } from '@/lib/cash-flow';

interface CategoryTabProps {
  categories: Category[];
  isLoading: boolean;
  onAddCategory: (type: 'INCOME' | 'EXPENSE', categoryGroup?: Category['categoryGroup']) => void;
  onEditCategory: (category: Category) => void;
}

export default function CategoryTab({ categories, isLoading, onAddCategory, onEditCategory }: CategoryTabProps) {
  const incomeCategories = categories.filter(cat => cat.type === 'INCOME');
  const expenseCategories = categories.filter(cat => cat.type === 'EXPENSE' && cat.categoryGroup !== CATEGORY_GROUP.ASSET_FORMATION);
  const assetFormationCategories = categories.filter(cat => cat.type === 'EXPENSE' && cat.categoryGroup === CATEGORY_GROUP.ASSET_FORMATION);

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-1.5">
        카테고리
      </h1>
      <p className="text-sm sm:text-base text-text-secondary mb-4">
        수입, 소비 지출, 자산 형성 카테고리를 관리합니다.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* 수입 카테고리 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[14px] sm:rounded-[16px] p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm sm:text-lg font-semibold flex items-center gap-1 sm:gap-2">
              <FaMoneyBillWave className="text-sm sm:text-base text-accent-mint" /> 수입
              <span className="text-xs sm:text-sm text-text-muted font-normal">({incomeCategories.length}/20)</span>
            </h2>
            <button
              onClick={() => onAddCategory('INCOME')}
              className="bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary rounded-[8px] sm:rounded-[10px] font-medium text-xs sm:text-sm hover:shadow-lg transition-all cursor-pointer py-2 px-4"
            >
              + 추가
            </button>
          </div>

          {isLoading ? (
            <div className="text-center text-text-muted py-4 text-sm">로딩 중...</div>
          ) : incomeCategories.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {incomeCategories.map((category) => {
                const IconComponent = getIconComponent(category.icon);
                return (
                  <div
                    key={category.id}
                    className="flex items-center bg-bg-secondary rounded-[8px] sm:rounded-[10px] cursor-pointer transition-all hover:bg-bg-card-hover p-2.5"
                    onClick={() => onEditCategory(category)}
                  >
                    <div
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-[6px] sm:rounded-[8px] flex items-center justify-center text-sm sm:text-base mr-2.5"
                      style={{ backgroundColor: `${category.color || '#888888'}20`, color: category.color || '#888888' }}
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

        {/* 소비 지출 카테고리 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[14px] sm:rounded-[16px] p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm sm:text-lg font-semibold flex items-center gap-1 sm:gap-2">
              <FaCreditCard className="text-sm sm:text-base text-accent-coral" /> 소비 지출
              <span className="text-xs sm:text-sm text-text-muted font-normal">({expenseCategories.length}/20)</span>
            </h2>
            <button
              onClick={() => onAddCategory('EXPENSE', CATEGORY_GROUP.SPENDING)}
              className="bg-gradient-to-br from-accent-coral to-accent-yellow text-bg-primary rounded-[8px] sm:rounded-[10px] font-medium text-xs sm:text-sm hover:shadow-lg transition-all cursor-pointer py-2 px-4"
            >
              + 추가
            </button>
          </div>

          {isLoading ? (
            <div className="text-center text-text-muted py-4 text-sm">로딩 중...</div>
          ) : expenseCategories.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {expenseCategories.map((category) => {
                const IconComponent = getIconComponent(category.icon);
                return (
                  <div
                    key={category.id}
                    className="flex items-center bg-bg-secondary rounded-[8px] sm:rounded-[10px] cursor-pointer transition-all hover:bg-bg-card-hover p-2.5"
                    onClick={() => onEditCategory(category)}
                  >
                    <div
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-[6px] sm:rounded-[8px] flex items-center justify-center text-sm sm:text-base mr-2.5"
                      style={{ backgroundColor: `${category.color || '#888888'}20`, color: category.color || '#888888' }}
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

        {/* 자산 형성 카테고리 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[14px] sm:rounded-[16px] p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm sm:text-lg font-semibold flex items-center gap-1 sm:gap-2">
              <MdAccountBalanceWallet className="text-sm sm:text-base text-accent-blue" /> 자산 형성
              <span className="text-xs sm:text-sm text-text-muted font-normal">({assetFormationCategories.length}/20)</span>
            </h2>
            <button
              onClick={() => onAddCategory('EXPENSE', CATEGORY_GROUP.ASSET_FORMATION)}
              className="bg-gradient-to-br from-accent-blue to-accent-purple text-bg-primary rounded-[8px] sm:rounded-[10px] font-medium text-xs sm:text-sm hover:shadow-lg transition-all cursor-pointer py-2 px-4"
            >
              + 추가
            </button>
          </div>

          {isLoading ? (
            <div className="text-center text-text-muted py-4 text-sm">로딩 중...</div>
          ) : assetFormationCategories.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {assetFormationCategories.map((category) => {
                const IconComponent = getIconComponent(category.icon);
                return (
                  <div
                    key={category.id}
                    className="flex items-center bg-bg-secondary rounded-[8px] sm:rounded-[10px] cursor-pointer transition-all hover:bg-bg-card-hover p-2.5"
                    onClick={() => onEditCategory(category)}
                  >
                    <div
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-[6px] sm:rounded-[8px] flex items-center justify-center text-sm sm:text-base mr-2.5"
                      style={{ backgroundColor: `${category.color || '#888888'}20`, color: category.color || '#888888' }}
                    >
                      <IconComponent />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-medium truncate">{category.name}</div>
                      <div className="text-[10px] sm:text-xs text-text-muted mt-0.5">소비 통계와 예산에서 제외</div>
                    </div>
                    <div className="text-[10px] sm:text-xs text-text-muted">수정 →</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-text-muted py-4 text-xs sm:text-sm">자산 형성 카테고리가 없습니다</div>
          )}
        </div>
      </div>
    </div>
  );
}
