'use client';

import { useState, useRef, useCallback } from 'react';
import { MdKeyboardArrowDown } from 'react-icons/md';
import { SAVINGS_GOAL } from '@/lib/constants';
import { CurrencyInput } from '@/components/common';
import { useOutsideClickWithRef } from '@/hooks';
import { GOAL_ICONS } from './constants';

interface AddSavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: {
    name: string;
    icon: string;
    targetAmount: number;
    currentAmount: number;
    startYear: number;
    startMonth: number;
    targetYear: number;
    targetMonth: number;
  }) => void;
}

export default function AddSavingsGoalModal({ isOpen, onClose, onSave }: AddSavingsGoalModalProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('home');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [startYear, setStartYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [targetYear, setTargetYear] = useState(currentYear + 1);
  const [targetMonth, setTargetMonth] = useState(12);
  const [isSaving, setIsSaving] = useState(false);

  const [nameError, setNameError] = useState('');
  const [targetAmountError, setTargetAmountError] = useState('');

  // 시작 날짜 드롭다운 상태
  const [isStartYearOpen, setIsStartYearOpen] = useState(false);
  const [isStartMonthOpen, setIsStartMonthOpen] = useState(false);
  const [startYearDropdownPos, setStartYearDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [startMonthDropdownPos, setStartMonthDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const startYearRef = useRef<HTMLDivElement>(null);
  const startMonthRef = useRef<HTMLDivElement>(null);
  const startYearButtonRef = useRef<HTMLButtonElement>(null);
  const startMonthButtonRef = useRef<HTMLButtonElement>(null);

  // 목표 날짜 드롭다운 상태
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [yearDropdownPos, setYearDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [monthDropdownPos, setMonthDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const yearRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);
  const yearButtonRef = useRef<HTMLButtonElement>(null);
  const monthButtonRef = useRef<HTMLButtonElement>(null);

  // 시작 날짜: 30년 전 ~ 이번 달
  const startYears = Array.from({ length: 31 }, (_, i) => currentYear - 30 + i);
  // 목표 날짜: 올해 ~ YEARS_RANGE년 후
  const years = Array.from({ length: SAVINGS_GOAL.YEARS_RANGE }, (_, i) => currentYear + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // 시작 월 필터: 시작 연도가 현재 연도면 현재 월까지만
  const filteredStartMonths = startYear === currentYear
    ? months.filter((m) => m <= currentMonth)
    : months;

  const closeStartYearDropdown = useCallback(() => setIsStartYearOpen(false), []);
  const closeStartMonthDropdown = useCallback(() => setIsStartMonthOpen(false), []);
  const closeYearDropdown = useCallback(() => setIsYearOpen(false), []);
  const closeMonthDropdown = useCallback(() => setIsMonthOpen(false), []);

  useOutsideClickWithRef(startYearRef, closeStartYearDropdown);
  useOutsideClickWithRef(startMonthRef, closeStartMonthDropdown);
  useOutsideClickWithRef(yearRef, closeYearDropdown);
  useOutsideClickWithRef(monthRef, closeMonthDropdown);

  const handleSave = async () => {
    let hasError = false;

    if (!name.trim()) {
      setNameError('목표 이름을 입력해주세요');
      hasError = true;
    } else {
      setNameError('');
    }

    const targetNum = parseInt(targetAmount || '0', 10);
    if (targetNum <= 0) {
      setTargetAmountError('목표 금액을 입력해주세요');
      hasError = true;
    } else {
      setTargetAmountError('');
    }

    if (hasError) return;

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        icon: selectedIcon,
        targetAmount: targetNum,
        currentAmount: parseInt(currentAmount || '0', 10),
        startYear,
        startMonth,
        targetYear,
        targetMonth,
      });
      resetForm();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSelectedIcon('home');
    setTargetAmount('');
    setCurrentAmount('');
    setStartYear(currentYear);
    setStartMonth(currentMonth);
    setTargetYear(currentYear + 1);
    setTargetMonth(12);
    setNameError('');
    setTargetAmountError('');
    setIsStartYearOpen(false);
    setIsStartMonthOpen(false);
    setIsYearOpen(false);
    setIsMonthOpen(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] animate-[fadeIn_0.2s_ease-out]"
      onClick={handleClose}
    >
      <div
        className="bg-bg-card border border-[var(--border)] rounded-[24px] w-full max-w-md animate-[fadeInUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto p-8 m-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
            저축 목표 추가
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-text-secondary hover:text-text-primary transition-colors text-2xl w-8 h-8 flex items-center justify-center cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* 목표 이름 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            목표 이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameError('');
            }}
            placeholder="예: 내 집 마련, 여행 자금"
            className={`w-full bg-bg-secondary border rounded-[12px] text-text-primary focus:outline-none focus:border-accent-mint transition-colors py-3.5 px-4 ${
              nameError ? 'border-accent-coral' : 'border-[var(--border)]'
            }`}
            autoFocus
          />
          {nameError && <p className="text-xs text-accent-coral mt-1.5">{nameError}</p>}
        </div>

        {/* 아이콘 선택 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            아이콘
          </label>
          <div className="grid grid-cols-4 gap-2">
            {GOAL_ICONS.map((item) => {
              const IconComponent = item.icon;
              const isSelected = selectedIcon === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedIcon(item.id)}
                  className={`flex items-center justify-center rounded-[12px] transition-all cursor-pointer p-3 ${
                    isSelected
                      ? 'bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary'
                      : 'bg-bg-secondary text-text-secondary hover:bg-bg-card-hover'
                  }`}
                >
                  <IconComponent className="text-xl" />
                </button>
              );
            })}
          </div>
        </div>

        {/* 목표 금액 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            목표 금액
          </label>
          <CurrencyInput
            value={targetAmount}
            onChange={(value) => {
              setTargetAmount(value);
              if (value && parseInt(value, 10) > 0) setTargetAmountError('');
            }}
            hasError={!!targetAmountError}
          />
          {targetAmountError && <p className="text-xs text-accent-coral mt-1.5">{targetAmountError}</p>}
        </div>

        {/* 현재 저축액 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            현재 저축액 (선택)
          </label>
          <CurrencyInput
            value={currentAmount}
            onChange={setCurrentAmount}
          />
        </div>

        {/* 시작 날짜 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            시작 날짜
          </label>
          <div className="flex gap-3">
            {/* 시작 연도 선택 */}
            <div ref={startYearRef} className="flex-1 relative">
              <button
                ref={startYearButtonRef}
                type="button"
                onClick={() => {
                  if (!isStartYearOpen && startYearButtonRef.current) {
                    const rect = startYearButtonRef.current.getBoundingClientRect();
                    setStartYearDropdownPos({
                      top: rect.bottom + 8,
                      left: rect.left,
                      width: rect.width,
                    });
                  }
                  setIsStartYearOpen(!isStartYearOpen);
                  setIsStartMonthOpen(false);
                  setIsYearOpen(false);
                  setIsMonthOpen(false);
                }}
                className="w-full bg-bg-secondary border border-[var(--border)] rounded-[12px] text-text-primary focus:outline-none focus:border-accent-mint transition-colors cursor-pointer flex items-center justify-between py-3.5 px-4"
              >
                <span>{startYear}</span>
                <span className="text-text-muted flex items-center">
                  년
                  <MdKeyboardArrowDown className={`text-lg transition-transform ml-1 ${isStartYearOpen ? 'rotate-180' : ''}`} />
                </span>
              </button>
              {isStartYearOpen && (
                <div
                  className="fixed bg-bg-card border border-[var(--border)] rounded-[12px] overflow-y-auto z-[300] shadow-[0_8px_24px_rgba(0,0,0,0.3)] max-h-[200px]"
                  style={{
                    top: startYearDropdownPos.top,
                    left: startYearDropdownPos.left,
                    width: startYearDropdownPos.width,
                  }}
                >
                  {startYears.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        setStartYear(year);
                        // 현재 연도 선택 시 현재 월 이후면 현재 월로 조정
                        if (year === currentYear && startMonth > currentMonth) {
                          setStartMonth(currentMonth);
                        }
                        setIsStartYearOpen(false);
                      }}
                      className={`w-full text-left hover:bg-bg-card-hover transition-colors border-b border-[var(--border)] last:border-b-0 cursor-pointer py-3 px-4 ${
                        startYear === year ? 'bg-bg-card-hover text-accent-mint' : 'text-text-primary'
                      }`}
                    >
                      {year}년
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 시작 월 선택 */}
            <div ref={startMonthRef} className="flex-1 relative">
              <button
                ref={startMonthButtonRef}
                type="button"
                onClick={() => {
                  if (!isStartMonthOpen && startMonthButtonRef.current) {
                    const rect = startMonthButtonRef.current.getBoundingClientRect();
                    setStartMonthDropdownPos({
                      top: rect.bottom + 8,
                      left: rect.left,
                      width: rect.width,
                    });
                  }
                  setIsStartMonthOpen(!isStartMonthOpen);
                  setIsStartYearOpen(false);
                  setIsYearOpen(false);
                  setIsMonthOpen(false);
                }}
                className="w-full bg-bg-secondary border border-[var(--border)] rounded-[12px] text-text-primary focus:outline-none focus:border-accent-mint transition-colors cursor-pointer flex items-center justify-between py-3.5 px-4"
              >
                <span>{startMonth}</span>
                <span className="text-text-muted flex items-center">
                  월
                  <MdKeyboardArrowDown className={`text-lg transition-transform ml-1 ${isStartMonthOpen ? 'rotate-180' : ''}`} />
                </span>
              </button>
              {isStartMonthOpen && (
                <div
                  className="fixed bg-bg-card border border-[var(--border)] rounded-[12px] overflow-y-auto z-[300] shadow-[0_8px_24px_rgba(0,0,0,0.3)] max-h-[200px]"
                  style={{
                    top: startMonthDropdownPos.top,
                    left: startMonthDropdownPos.left,
                    width: startMonthDropdownPos.width,
                  }}
                >
                  {filteredStartMonths.map((month) => (
                    <button
                      key={month}
                      type="button"
                      onClick={() => {
                        setStartMonth(month);
                        setIsStartMonthOpen(false);
                      }}
                      className={`w-full text-left hover:bg-bg-card-hover transition-colors border-b border-[var(--border)] last:border-b-0 cursor-pointer py-3 px-4 ${
                        startMonth === month ? 'bg-bg-card-hover text-accent-mint' : 'text-text-primary'
                      }`}
                    >
                      {month}월
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 목표 날짜 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            목표 날짜
          </label>
          <div className="flex gap-3">
            {/* 연도 선택 */}
            <div ref={yearRef} className="flex-1 relative">
              <button
                ref={yearButtonRef}
                type="button"
                onClick={() => {
                  if (!isYearOpen && yearButtonRef.current) {
                    const rect = yearButtonRef.current.getBoundingClientRect();
                    setYearDropdownPos({
                      top: rect.bottom + 8,
                      left: rect.left,
                      width: rect.width,
                    });
                  }
                  setIsYearOpen(!isYearOpen);
                  setIsMonthOpen(false);
                  setIsStartYearOpen(false);
                  setIsStartMonthOpen(false);
                }}
                className="w-full bg-bg-secondary border border-[var(--border)] rounded-[12px] text-text-primary focus:outline-none focus:border-accent-mint transition-colors cursor-pointer flex items-center justify-between py-3.5 px-4"
              >
                <span>{targetYear}</span>
                <span className="text-text-muted flex items-center">
                  년
                  <MdKeyboardArrowDown className={`text-lg transition-transform ml-1 ${isYearOpen ? 'rotate-180' : ''}`} />
                </span>
              </button>
              {isYearOpen && (
                <div
                  className="fixed bg-bg-card border border-[var(--border)] rounded-[12px] overflow-y-auto z-[300] shadow-[0_8px_24px_rgba(0,0,0,0.3)] max-h-[200px]"
                  style={{
                    top: yearDropdownPos.top,
                    left: yearDropdownPos.left,
                    width: yearDropdownPos.width,
                  }}
                >
                  {years.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        setTargetYear(year);
                        setIsYearOpen(false);
                      }}
                      className={`w-full text-left hover:bg-bg-card-hover transition-colors border-b border-[var(--border)] last:border-b-0 cursor-pointer py-3 px-4 ${
                        targetYear === year ? 'bg-bg-card-hover text-accent-mint' : 'text-text-primary'
                      }`}
                    >
                      {year}년
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 월 선택 */}
            <div ref={monthRef} className="flex-1 relative">
              <button
                ref={monthButtonRef}
                type="button"
                onClick={() => {
                  if (!isMonthOpen && monthButtonRef.current) {
                    const rect = monthButtonRef.current.getBoundingClientRect();
                    setMonthDropdownPos({
                      top: rect.bottom + 8,
                      left: rect.left,
                      width: rect.width,
                    });
                  }
                  setIsMonthOpen(!isMonthOpen);
                  setIsYearOpen(false);
                  setIsStartYearOpen(false);
                  setIsStartMonthOpen(false);
                }}
                className="w-full bg-bg-secondary border border-[var(--border)] rounded-[12px] text-text-primary focus:outline-none focus:border-accent-mint transition-colors cursor-pointer flex items-center justify-between py-3.5 px-4"
              >
                <span>{targetMonth}</span>
                <span className="text-text-muted flex items-center">
                  월
                  <MdKeyboardArrowDown className={`text-lg transition-transform ml-1 ${isMonthOpen ? 'rotate-180' : ''}`} />
                </span>
              </button>
              {isMonthOpen && (
                <div
                  className="fixed bg-bg-card border border-[var(--border)] rounded-[12px] overflow-y-auto z-[300] shadow-[0_8px_24px_rgba(0,0,0,0.3)] max-h-[200px]"
                  style={{
                    top: monthDropdownPos.top,
                    left: monthDropdownPos.left,
                    width: monthDropdownPos.width,
                  }}
                >
                  {months.map((month) => (
                    <button
                      key={month}
                      type="button"
                      onClick={() => {
                        setTargetMonth(month);
                        setIsMonthOpen(false);
                      }}
                      className={`w-full text-left hover:bg-bg-card-hover transition-colors border-b border-[var(--border)] last:border-b-0 cursor-pointer py-3 px-4 ${
                        targetMonth === month ? 'bg-bg-card-hover text-accent-mint' : 'text-text-primary'
                      }`}
                    >
                      {month}월
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
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
            className="flex-1 bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary rounded-[12px] font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed p-3.5"
          >
            {isSaving ? '저장 중...' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
