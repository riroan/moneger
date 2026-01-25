'use client';

import { useCategoryDropdown } from '@/hooks/useCategoryDropdown';
import { getIconComponent } from '@/components/settings/constants';
import type { Category } from '@/types';

interface CategoryDropdownProps {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
  type: 'INCOME' | 'EXPENSE';
  error?: string;
}

export default function CategoryDropdown({
  categories,
  selectedId,
  onSelect,
  type,
  error,
}: CategoryDropdownProps) {
  const {
    isOpen,
    search,
    dropdownRef,
    currentCategories,
    filteredCategories,
    open,
    close,
    toggle,
    setSearch,
  } = useCategoryDropdown({ categories, type });

  const selectedCategory = currentCategories.find((c) => c.id === selectedId);

  const handleSelect = (categoryId: string) => {
    onSelect(categoryId);
    close();
  };

  return (
    <div ref={dropdownRef}>
      <label className="block text-sm text-text-secondary font-medium mb-2">
        카테고리
      </label>
      <div className="relative">
        <div
          className={`w-full bg-bg-secondary border rounded-[12px] text-text-primary focus-within:border-accent-mint transition-colors flex items-center py-3.5 px-4 ${
            error
              ? 'border-accent-coral focus-within:border-accent-coral'
              : 'border-[var(--border)]'
          }`}
        >
          {selectedCategory && !isOpen && (() => {
            const IconComponent = getIconComponent(selectedCategory.icon);
            const categoryColor = selectedCategory.color || '#6B7280';
            return (
              <span className="mr-2" style={{ color: categoryColor }}>
                <IconComponent />
              </span>
            );
          })()}
          <input
            type="text"
            placeholder={selectedCategory ? '' : '카테고리 검색 또는 선택'}
            value={isOpen ? search : (selectedCategory?.name || '')}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={open}
            className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-muted"
          />
          <button
            type="button"
            onClick={toggle}
            className="ml-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
            >
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {isOpen && (
          <div
            className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-[var(--border)] rounded-[12px] overflow-y-auto z-10 shadow-2xl max-h-60"
          >
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => {
                const IconComponent = getIconComponent(category.icon);
                const categoryColor = category.color || '#6B7280';
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleSelect(category.id)}
                    className={`w-full text-left hover:bg-bg-card-hover transition-colors border-b border-[var(--border)] last:border-b-0 cursor-pointer flex items-center gap-3 py-3 px-4 text-[15px] ${
                      selectedId === category.id ? 'bg-bg-card-hover' : 'text-text-primary'
                    }`}
                  >
                    <span style={{ color: categoryColor }}><IconComponent /></span>
                    <span>{category.name}</span>
                  </button>
                );
              })
            ) : (
              <div className="text-text-muted text-center py-3 px-4 text-sm">
                일치하는 카테고리가 없습니다
              </div>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="text-accent-coral text-xs mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
}
