'use client';

import { useState } from 'react';

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string | null;
}

interface FilterPanelProps {
  filterType: 'ALL' | 'INCOME' | 'EXPENSE';
  setFilterType: (type: 'ALL' | 'INCOME' | 'EXPENSE') => void;
  filterCategories: string[];
  setFilterCategories: (categories: string[] | ((prev: string[]) => string[])) => void;
  searchKeyword: string;
  setSearchKeyword: (keyword: string) => void;
  sortOrder: 'recent' | 'oldest' | 'expensive' | 'cheapest';
  setSortOrder: (order: 'recent' | 'oldest' | 'expensive' | 'cheapest') => void;
  categories: Category[];
  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean) => void;
}

export default function FilterPanel({
  filterType,
  setFilterType,
  filterCategories,
  setFilterCategories,
  searchKeyword,
  setSearchKeyword,
  sortOrder,
  setSortOrder,
  categories,
  isFilterOpen,
  setIsFilterOpen,
}: FilterPanelProps) {
  const [isIncomeCategoryOpen, setIsIncomeCategoryOpen] = useState(true);
  const [isExpenseCategoryOpen, setIsExpenseCategoryOpen] = useState(true);

  const hasActiveFilters = filterType !== 'ALL' || filterCategories.length > 0 || searchKeyword || sortOrder !== 'recent';

  const handleReset = () => {
    setFilterType('ALL');
    setFilterCategories([]);
    setSearchKeyword('');
    setSortOrder('recent');
  };

  return (
    <div className="lg:block">
      {/* 모바일 필터 토글 */}
      <button
        onClick={() => setIsFilterOpen(!isFilterOpen)}
        className="lg:hidden w-full bg-bg-card border border-[var(--border)] rounded-[12px] flex items-center justify-between cursor-pointer"
        style={{ padding: '12px 16px', marginBottom: '12px' }}
      >
        <span className="text-sm font-medium flex items-center gap-2">
          <span>🔍</span> 필터 {hasActiveFilters && <span className="text-accent-mint">(적용됨)</span>}
        </span>
        <span className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* 필터 내용 */}
      <div className={`${isFilterOpen ? 'block' : 'hidden'} lg:block bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px]`} style={{ padding: '16px' }}>
        <h3 className="text-base font-semibold flex items-center gap-2" style={{ marginBottom: '16px' }}>
          <span>🔍</span> 필터
        </h3>

        {/* 검색 */}
        <div style={{ marginBottom: '16px' }}>
          <label className="block text-sm text-text-muted" style={{ marginBottom: '8px' }}>검색</label>
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="내역 검색..."
            className="w-full bg-bg-secondary border border-[var(--border)] rounded-[10px] text-text-primary text-sm focus:outline-none focus:border-accent-blue transition-colors"
            style={{ padding: '10px 12px' }}
          />
        </div>

        {/* 거래 유형 */}
        <div style={{ marginBottom: '16px' }}>
          <label className="block text-sm text-text-muted" style={{ marginBottom: '8px' }}>거래 유형</label>
          <div className="flex gap-2">
            {[
              { value: 'ALL', label: '전체' },
              { value: 'INCOME', label: '수입' },
              { value: 'EXPENSE', label: '지출' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilterType(option.value as 'ALL' | 'INCOME' | 'EXPENSE')}
                className={`flex-1 rounded-[8px] text-sm font-medium transition-all cursor-pointer ${
                  filterType === option.value
                    ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}
                style={{ padding: '8px 12px' }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 정렬 */}
        <div style={{ marginBottom: '16px' }}>
          <label className="block text-sm text-text-muted" style={{ marginBottom: '8px' }}>정렬</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'recent', label: '최근 순' },
              { value: 'oldest', label: '오래된 순' },
              { value: 'expensive', label: '금액 높은 순' },
              { value: 'cheapest', label: '금액 낮은 순' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSortOrder(option.value as 'recent' | 'oldest' | 'expensive' | 'cheapest')}
                className={`rounded-[8px] text-sm font-medium transition-all cursor-pointer ${
                  sortOrder === option.value
                    ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}
                style={{ padding: '8px 12px' }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 카테고리 */}
        <div style={{ marginBottom: '16px' }}>
          <label className="block text-sm text-text-muted" style={{ marginBottom: '8px' }}>
            카테고리 {filterCategories.length > 0 && <span className="text-accent-mint">({filterCategories.length})</span>}
          </label>
          <div className="flex flex-col gap-2">
            {/* 수입 카테고리 */}
            {(filterType === 'ALL' || filterType === 'INCOME') && (
              <div className="bg-bg-secondary rounded-[10px] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsIncomeCategoryOpen(!isIncomeCategoryOpen)}
                  className="w-full flex items-center justify-between text-left cursor-pointer hover:bg-bg-card-hover transition-colors"
                  style={{ padding: '10px 12px' }}
                >
                  <span className="text-sm font-medium text-accent-mint flex items-center gap-2">
                    <span>💼</span> 수입
                    <span className="text-text-muted font-normal">
                      ({categories.filter(c => c.type === 'INCOME').length})
                    </span>
                  </span>
                  <span className="text-text-muted text-xs">
                    {isIncomeCategoryOpen ? '▲' : '▼'}
                  </span>
                </button>
                {isIncomeCategoryOpen && (
                  <div className="flex flex-col gap-1" style={{ padding: '0 8px 8px 8px' }}>
                    {categories.filter(c => c.type === 'INCOME').map((cat) => {
                      const isChecked = filterCategories.includes(cat.id);
                      return (
                        <label
                          key={cat.id}
                          className="flex items-center gap-2 bg-bg-card rounded-[6px] cursor-pointer hover:bg-bg-card-hover transition-colors"
                          style={{ padding: '6px 8px' }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setFilterCategories((prev: string[]) => prev.filter((id: string) => id !== cat.id));
                              } else {
                                setFilterCategories((prev: string[]) => [...prev, cat.id]);
                              }
                            }}
                            className="w-4 h-4 rounded accent-accent-mint cursor-pointer"
                          />
                          <span className="text-sm text-text-primary">{cat.icon} {cat.name}</span>
                        </label>
                      );
                    })}
                    {categories.filter(c => c.type === 'INCOME').length === 0 && (
                      <div className="text-xs text-text-muted text-center py-2">
                        수입 카테고리가 없습니다
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 지출 카테고리 */}
            {(filterType === 'ALL' || filterType === 'EXPENSE') && (
              <div className="bg-bg-secondary rounded-[10px] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsExpenseCategoryOpen(!isExpenseCategoryOpen)}
                  className="w-full flex items-center justify-between text-left cursor-pointer hover:bg-bg-card-hover transition-colors"
                  style={{ padding: '10px 12px' }}
                >
                  <span className="text-sm font-medium text-accent-coral flex items-center gap-2">
                    <span>💳</span> 지출
                    <span className="text-text-muted font-normal">
                      ({categories.filter(c => c.type === 'EXPENSE').length})
                    </span>
                  </span>
                  <span className="text-text-muted text-xs">
                    {isExpenseCategoryOpen ? '▲' : '▼'}
                  </span>
                </button>
                {isExpenseCategoryOpen && (
                  <div className="flex flex-col gap-1" style={{ padding: '0 8px 8px 8px' }}>
                    {categories.filter(c => c.type === 'EXPENSE').map((cat) => {
                      const isChecked = filterCategories.includes(cat.id);
                      return (
                        <label
                          key={cat.id}
                          className="flex items-center gap-2 bg-bg-card rounded-[6px] cursor-pointer hover:bg-bg-card-hover transition-colors"
                          style={{ padding: '6px 8px' }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setFilterCategories((prev: string[]) => prev.filter((id: string) => id !== cat.id));
                              } else {
                                setFilterCategories((prev: string[]) => [...prev, cat.id]);
                              }
                            }}
                            className="w-4 h-4 rounded accent-accent-mint cursor-pointer"
                          />
                          <span className="text-sm text-text-primary">{cat.icon} {cat.name}</span>
                        </label>
                      );
                    })}
                    {categories.filter(c => c.type === 'EXPENSE').length === 0 && (
                      <div className="text-xs text-text-muted text-center py-2">
                        지출 카테고리가 없습니다
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 필터 초기화 */}
        <button
          onClick={handleReset}
          disabled={!hasActiveFilters}
          className="w-full bg-bg-secondary text-text-secondary hover:text-text-primary rounded-[10px] text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-text-secondary"
          style={{ padding: '10px 12px' }}
        >
          필터 초기화
        </button>
      </div>
    </div>
  );
}

export type { Category };
