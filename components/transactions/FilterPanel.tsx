'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { MdSearch, MdSavings } from 'react-icons/md';
import { FaMoneyBillWave, FaCreditCard } from 'react-icons/fa';
import { getIconComponent } from '@/components/settings/constants';

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string | null;
}

interface DateRange {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

interface AmountRange {
  minAmount: number | null;
  maxAmount: number | null;
}

interface FilterPanelProps {
  filterType: 'ALL' | 'INCOME' | 'EXPENSE' | 'SAVINGS';
  setFilterType: (type: 'ALL' | 'INCOME' | 'EXPENSE' | 'SAVINGS') => void;
  filterCategories: string[];
  setFilterCategories: (categories: string[] | ((prev: string[]) => string[])) => void;
  searchKeyword: string;
  setSearchKeyword: (keyword: string) => void;
  sortOrder: 'recent' | 'oldest' | 'expensive' | 'cheapest';
  setSortOrder: (order: 'recent' | 'oldest' | 'expensive' | 'cheapest') => void;
  categories: Category[];
  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean) => void;
  dateRange: DateRange | null;
  setDateRange: (range: DateRange | null) => void;
  oldestDate: { year: number; month: number } | null;
  amountRange: AmountRange | null;
  setAmountRange: (range: AmountRange | null) => void;
}

interface CustomSelectProps {
  value: number;
  options: { value: number; label: string }[];
  onChange: (value: number) => void;
  placeholder?: string;
}

function CustomSelect({ value, options, onChange, placeholder }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-bg-card border border-[var(--border)] rounded-[8px] text-text-primary text-sm focus:outline-none focus:border-accent-blue cursor-pointer flex items-center justify-between py-2 px-2.5"
      >
        <span>{selectedOption?.label || placeholder}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`transition-transform text-text-secondary ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-[var(--border)] rounded-[8px] overflow-y-auto z-20 shadow-lg max-h-40"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left text-sm transition-colors cursor-pointer py-2 px-2.5 ${
                value === option.value
                  ? 'bg-accent-mint/20 text-accent-mint'
                  : 'text-text-primary hover:bg-bg-card-hover'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  dateRange,
  setDateRange,
  oldestDate,
  amountRange,
  setAmountRange,
}: FilterPanelProps) {
  const [isIncomeCategoryOpen, setIsIncomeCategoryOpen] = useState(true);
  const [isExpenseCategoryOpen, setIsExpenseCategoryOpen] = useState(true);
  const [isDateFilterEnabled, setIsDateFilterEnabled] = useState(dateRange !== null);
  const [isAmountFilterEnabled, setIsAmountFilterEnabled] = useState(amountRange !== null);
  const [minAmountInput, setMinAmountInput] = useState(amountRange?.minAmount?.toLocaleString('ko-KR') || '');
  const [maxAmountInput, setMaxAmountInput] = useState(amountRange?.maxAmount?.toLocaleString('ko-KR') || '');

  // dateRange 외부 변경 시 isDateFilterEnabled 동기화
  useEffect(() => {
    setIsDateFilterEnabled(dateRange !== null);
  }, [dateRange]);

  // amountRange 외부 변경 시 동기화
  useEffect(() => {
    setIsAmountFilterEnabled(amountRange !== null);
    setMinAmountInput(amountRange?.minAmount?.toLocaleString('ko-KR') || '');
    setMaxAmountInput(amountRange?.maxAmount?.toLocaleString('ko-KR') || '');
  }, [amountRange]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const minYear = oldestDate?.year || currentYear;

  const hasActiveFilters = filterType !== 'ALL' || filterCategories.length > 0 || searchKeyword || sortOrder !== 'recent' || dateRange !== null || amountRange !== null;

  const handleReset = () => {
    setFilterType('ALL');
    setFilterCategories([]);
    setSearchKeyword('');
    setSortOrder('recent');
    setDateRange(null);
    setIsDateFilterEnabled(false);
    setAmountRange(null);
    setIsAmountFilterEnabled(false);
    setMinAmountInput('');
    setMaxAmountInput('');
  };

  const handleDateFilterToggle = (enabled: boolean) => {
    setIsDateFilterEnabled(enabled);
    if (enabled) {
      setDateRange({
        startYear: currentYear,
        startMonth: currentMonth,
        endYear: currentYear,
        endMonth: currentMonth,
      });
    } else {
      setDateRange(null);
    }
  };

  const handleAmountFilterToggle = (enabled: boolean) => {
    setIsAmountFilterEnabled(enabled);
    if (enabled) {
      setAmountRange({ minAmount: null, maxAmount: null });
    } else {
      setAmountRange(null);
      setMinAmountInput('');
      setMaxAmountInput('');
    }
  };

  const handleAmountInputChange = (type: 'min' | 'max', value: string) => {
    const rawValue = value.replace(/,/g, '');

    if (rawValue === '') {
      if (type === 'min') {
        setMinAmountInput('');
        setAmountRange({ ...amountRange!, minAmount: null });
      } else {
        setMaxAmountInput('');
        setAmountRange({ ...amountRange!, maxAmount: null });
      }
      return;
    }

    if (!/^\d+$/.test(rawValue)) return;

    const numValue = parseInt(rawValue);
    if (numValue > 100000000000) return;

    const formattedValue = numValue.toLocaleString('ko-KR');

    if (type === 'min') {
      setMinAmountInput(formattedValue);
      setAmountRange({ ...amountRange!, minAmount: numValue });
    } else {
      setMaxAmountInput(formattedValue);
      setAmountRange({ ...amountRange!, maxAmount: numValue });
    }
  };

  // 연도 옵션 메모이제이션
  const yearOptions = useMemo(() => {
    const years = [];
    for (let year = minYear; year <= currentYear; year++) {
      years.push({ value: year, label: `${year}년` });
    }
    return years;
  }, [minYear, currentYear]);

  // 월 옵션 생성 함수 (startYear/endYear에 따라 다름)
  const getMonthOptions = useMemo(() => {
    return (year: number, isEnd: boolean = false) => {
      const months = [];
      const maxMonth = year === currentYear ? currentMonth : 11;

      for (let month = 0; month <= maxMonth; month++) {
        if (isEnd && dateRange) {
          if (year === dateRange.startYear && month < dateRange.startMonth) {
            continue;
          }
        }
        months.push({ value: month, label: `${month + 1}월` });
      }
      return months;
    };
  }, [currentYear, currentMonth, dateRange]);

  return (
    <div className="lg:block">
      <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
        {/* 모바일 필터 토글 */}
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`lg:hidden w-full flex items-center justify-between cursor-pointer ${isFilterOpen ? 'mb-4' : ''}`}
        >
          <span className="text-base font-semibold flex items-center gap-2">
            <MdSearch className="text-lg" /> 필터 {hasActiveFilters && <span className="text-accent-mint text-sm font-normal">(적용됨)</span>}
          </span>
          <span className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {/* 데스크탑 필터 헤더 */}
        <h3 className="hidden lg:flex text-base font-semibold items-center gap-2 mb-4">
          <MdSearch className="text-lg" /> 필터
        </h3>

        {/* 필터 내용 */}
        <div className={`${isFilterOpen ? 'block' : 'hidden'} lg:block`}>

        {/* 검색 */}
        <div className="mb-4">
          <label className="block text-sm text-text-muted mb-2">검색</label>
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="내역 검색..."
            className="w-full bg-bg-secondary border border-[var(--border)] rounded-[10px] text-text-primary text-sm focus:outline-none focus:border-accent-blue transition-colors py-2.5 px-3"
          />
        </div>

        {/* 기간 필터 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-text-muted">기간</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDateFilterEnabled}
                onChange={(e) => handleDateFilterToggle(e.target.checked)}
                className="w-4 h-4 rounded accent-accent-mint cursor-pointer"
              />
              <span className="text-xs text-text-secondary">기간 필터 사용</span>
            </label>
          </div>
          {isDateFilterEnabled && dateRange && (
            <div className="bg-bg-secondary rounded-[10px] p-3">
              <div className="flex flex-col gap-3">
                {/* 시작 날짜 */}
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">시작</label>
                  <div className="flex gap-2">
                    <CustomSelect
                      value={dateRange.startYear}
                      options={yearOptions}
                      onChange={(newYear) => {
                        const maxMonth = newYear === currentYear ? currentMonth : 11;
                        const newStartMonth = dateRange.startMonth > maxMonth ? maxMonth : dateRange.startMonth;
                        let newEndYear = dateRange.endYear;
                        let newEndMonth = dateRange.endMonth;
                        if (newYear > dateRange.endYear || (newYear === dateRange.endYear && newStartMonth > dateRange.endMonth)) {
                          newEndYear = newYear;
                          newEndMonth = newStartMonth;
                        }
                        setDateRange({ ...dateRange, startYear: newYear, startMonth: newStartMonth, endYear: newEndYear, endMonth: newEndMonth });
                      }}
                    />
                    <CustomSelect
                      value={dateRange.startMonth}
                      options={getMonthOptions(dateRange.startYear)}
                      onChange={(newMonth) => {
                        let newEndYear = dateRange.endYear;
                        let newEndMonth = dateRange.endMonth;
                        if (dateRange.startYear > dateRange.endYear || (dateRange.startYear === dateRange.endYear && newMonth > dateRange.endMonth)) {
                          newEndMonth = newMonth;
                        }
                        setDateRange({ ...dateRange, startMonth: newMonth, endYear: newEndYear, endMonth: newEndMonth });
                      }}
                    />
                  </div>
                </div>
                {/* 종료 날짜 */}
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">종료</label>
                  <div className="flex gap-2">
                    <CustomSelect
                      value={dateRange.endYear}
                      options={yearOptions.filter(opt => opt.value >= dateRange.startYear)}
                      onChange={(newYear) => {
                        const maxMonth = newYear === currentYear ? currentMonth : 11;
                        let newEndMonth = dateRange.endMonth > maxMonth ? maxMonth : dateRange.endMonth;
                        if (newYear < dateRange.startYear || (newYear === dateRange.startYear && newEndMonth < dateRange.startMonth)) {
                          newEndMonth = dateRange.startMonth;
                        }
                        setDateRange({ ...dateRange, endYear: newYear, endMonth: newEndMonth });
                      }}
                    />
                    <CustomSelect
                      value={dateRange.endMonth}
                      options={getMonthOptions(dateRange.endYear, true)}
                      onChange={(newMonth) => setDateRange({ ...dateRange, endMonth: newMonth })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 금액 범위 필터 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-text-muted">금액 범위</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAmountFilterEnabled}
                onChange={(e) => handleAmountFilterToggle(e.target.checked)}
                className="w-4 h-4 rounded accent-accent-mint cursor-pointer"
              />
              <span className="text-xs text-text-secondary">금액 필터 사용</span>
            </label>
          </div>
          {isAmountFilterEnabled && amountRange && (
            <div className="bg-bg-secondary rounded-[10px] p-3">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">최소 금액</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">₩</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={minAmountInput}
                      onChange={(e) => handleAmountInputChange('min', e.target.value)}
                      placeholder="0"
                      className="w-full bg-bg-card border border-[var(--border)] rounded-[8px] text-right text-text-primary text-sm focus:outline-none focus:border-accent-blue transition-colors py-2 pr-2.5 pl-6"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">최대 금액</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">₩</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={maxAmountInput}
                      onChange={(e) => handleAmountInputChange('max', e.target.value)}
                      placeholder="제한 없음"
                      className="w-full bg-bg-card border border-[var(--border)] rounded-[8px] text-right text-text-primary text-sm focus:outline-none focus:border-accent-blue transition-colors py-2 pr-2.5 pl-6"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 거래 유형 */}
        <div className="mb-4">
          <label className="block text-sm text-text-muted mb-2">거래 유형</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'ALL', label: '전체', activeClass: 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary' },
              { value: 'INCOME', label: '수입', activeClass: 'bg-accent-mint text-bg-primary' },
              { value: 'EXPENSE', label: '지출', activeClass: 'bg-accent-coral text-bg-primary' },
              { value: 'SAVINGS', label: '저축', activeClass: 'bg-accent-blue text-bg-primary' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilterType(option.value as 'ALL' | 'INCOME' | 'EXPENSE' | 'SAVINGS')}
                className={`rounded-[8px] text-sm font-medium transition-all cursor-pointer py-2 px-3 ${
                  filterType === option.value
                    ? option.activeClass
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 정렬 */}
        <div className="mb-4">
          <label className="block text-sm text-text-muted mb-2">정렬</label>
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
                className={`rounded-[8px] text-sm font-medium transition-all cursor-pointer py-2 px-3 ${
                  sortOrder === option.value
                    ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 카테고리 - 저축 필터일 때는 숨김 */}
        {filterType !== 'SAVINGS' && (
        <div className="mb-4">
          <label className="block text-sm text-text-muted mb-2">
            카테고리 {filterCategories.length > 0 && <span className="text-accent-mint">({filterCategories.length})</span>}
          </label>
          <div className="flex flex-col gap-2">
            {/* 수입 카테고리 */}
            {(filterType === 'ALL' || filterType === 'INCOME') && (
              <div className="bg-bg-secondary rounded-[10px] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsIncomeCategoryOpen(!isIncomeCategoryOpen)}
                  className="w-full flex items-center justify-between text-left cursor-pointer hover:bg-bg-card-hover transition-colors py-2.5 px-3"
                >
                  <span className="text-sm font-medium text-accent-mint flex items-center gap-2">
                    <FaMoneyBillWave className="text-sm" /> 수입
                    <span className="text-text-muted font-normal">
                      ({categories.filter(c => c.type === 'INCOME').length})
                    </span>
                  </span>
                  <span className="text-text-muted text-xs">
                    {isIncomeCategoryOpen ? '▲' : '▼'}
                  </span>
                </button>
                {isIncomeCategoryOpen && (
                  <div className="flex flex-col gap-1 px-2 pb-2">
                    {categories.filter(c => c.type === 'INCOME').map((cat) => {
                      const isChecked = filterCategories.includes(cat.id);
                      const IconComponent = getIconComponent(cat.icon);
                      return (
                        <label
                          key={cat.id}
                          className="flex items-center gap-2 bg-bg-card rounded-[6px] cursor-pointer hover:bg-bg-card-hover transition-colors py-1.5 px-2"
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
                          <span className="text-sm text-text-primary flex items-center gap-1">
                            <IconComponent className="text-accent-mint" />
                            {cat.name}
                          </span>
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
                  className="w-full flex items-center justify-between text-left cursor-pointer hover:bg-bg-card-hover transition-colors py-2.5 px-3"
                >
                  <span className="text-sm font-medium text-accent-coral flex items-center gap-2">
                    <FaCreditCard className="text-sm" /> 지출
                    <span className="text-text-muted font-normal">
                      ({categories.filter(c => c.type === 'EXPENSE').length})
                    </span>
                  </span>
                  <span className="text-text-muted text-xs">
                    {isExpenseCategoryOpen ? '▲' : '▼'}
                  </span>
                </button>
                {isExpenseCategoryOpen && (
                  <div className="flex flex-col gap-1 px-2 pb-2">
                    {categories.filter(c => c.type === 'EXPENSE').map((cat) => {
                      const isChecked = filterCategories.includes(cat.id);
                      const IconComponent = getIconComponent(cat.icon);
                      return (
                        <label
                          key={cat.id}
                          className="flex items-center gap-2 bg-bg-card rounded-[6px] cursor-pointer hover:bg-bg-card-hover transition-colors py-1.5 px-2"
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
                          <span className="text-sm text-text-primary flex items-center gap-1">
                            <IconComponent className="text-accent-coral" />
                            {cat.name}
                          </span>
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
        )}

        {/* 저축 필터 안내 */}
        {filterType === 'SAVINGS' && (
          <div className="bg-accent-blue/10 rounded-[10px] text-center p-4 mb-4">
            <MdSavings className="text-2xl text-accent-blue mx-auto mb-2" />
            <p className="text-sm text-text-secondary">
              저축 목표에 입금한 내역만 표시됩니다
            </p>
          </div>
        )}

        {/* 필터 초기화 */}
        <button
          onClick={handleReset}
          disabled={!hasActiveFilters}
          className="w-full bg-bg-secondary text-text-secondary hover:text-text-primary rounded-[10px] text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-text-secondary py-2.5 px-3"
        >
          필터 초기화
        </button>
        </div>
      </div>
    </div>
  );
}

export type { Category, DateRange, AmountRange };
