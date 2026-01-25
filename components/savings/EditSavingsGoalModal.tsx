'use client';

import { useState, useRef, useEffect } from 'react';
import { formatNumber } from '@/utils/formatters';
import { MdHome, MdDirectionsCar, MdSchool, MdFlight, MdDevices, MdSavings, MdKeyboardArrowDown } from 'react-icons/md';
import { FaGift, FaHeartbeat } from 'react-icons/fa';

interface SavingsGoal {
  id: string;
  name: string;
  icon: string;
  targetDate: string;
  currentAmount: number;
  targetAmount: number;
  progressPercent: number;
  monthlyRequired: number;
}

interface EditSavingsGoalModalProps {
  isOpen: boolean;
  goal: SavingsGoal | null;
  onClose: () => void;
  onSave: (goal: {
    id: string;
    name: string;
    icon: string;
    targetAmount: number;
    targetYear: number;
    targetMonth: number;
  }) => void;
  onDelete: (id: string) => void;
}

const GOAL_ICONS = [
  { id: 'home', icon: MdHome, label: '내 집' },
  { id: 'car', icon: MdDirectionsCar, label: '자동차' },
  { id: 'school', icon: MdSchool, label: '교육' },
  { id: 'travel', icon: MdFlight, label: '여행' },
  { id: 'device', icon: MdDevices, label: '전자기기' },
  { id: 'gift', icon: FaGift, label: '선물' },
  { id: 'health', icon: FaHeartbeat, label: '건강' },
  { id: 'savings', icon: MdSavings, label: '저축' },
];

function parseTargetDate(targetDate: string): { year: number; month: number } {
  const match = targetDate.match(/(\d{4})년\s*(\d{1,2})월/);
  if (match) {
    return { year: parseInt(match[1], 10), month: parseInt(match[2], 10) };
  }
  return { year: new Date().getFullYear() + 1, month: 12 };
}

export default function EditSavingsGoalModal({ isOpen, goal, onClose, onSave, onDelete }: EditSavingsGoalModalProps) {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('home');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetYear, setTargetYear] = useState(new Date().getFullYear() + 1);
  const [targetMonth, setTargetMonth] = useState(12);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [nameError, setNameError] = useState('');
  const [targetAmountError, setTargetAmountError] = useState('');

  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [yearDropdownPos, setYearDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [monthDropdownPos, setMonthDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const yearRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);
  const yearButtonRef = useRef<HTMLButtonElement>(null);
  const monthButtonRef = useRef<HTMLButtonElement>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    if (goal && isOpen) {
      setName(goal.name);
      setSelectedIcon(goal.icon);
      setTargetAmount(goal.targetAmount.toString());
      setCurrentAmount(goal.currentAmount.toString());
      const { year, month } = parseTargetDate(goal.targetDate);
      setTargetYear(year);
      setTargetMonth(month);
      setNameError('');
      setTargetAmountError('');
    }
  }, [goal, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (yearRef.current && !yearRef.current.contains(event.target as Node)) {
        setIsYearOpen(false);
      }
      if (monthRef.current && !monthRef.current.contains(event.target as Node)) {
        setIsMonthOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = async () => {
    if (!goal) return;

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
        id: goal.id,
        name: name.trim(),
        icon: selectedIcon,
        targetAmount: targetNum,
        targetYear,
        targetMonth,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!goal) return;

    setIsDeleting(true);
    try {
      await onDelete(goal.id);
      setIsDeleteConfirmOpen(false);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setIsYearOpen(false);
    setIsMonthOpen(false);
    setIsDeleteConfirmOpen(false);
    onClose();
  };

  if (!isOpen || !goal) return null;

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
            저축 목표 수정
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
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-base">₩</span>
            <input
              type="text"
              inputMode="numeric"
              value={targetAmount ? formatNumber(parseInt(targetAmount, 10)) : ''}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/[^0-9]/g, '');
                const maxAmount = 100000000000000;
                if (numericValue === '' || parseInt(numericValue, 10) <= maxAmount) {
                  setTargetAmount(numericValue);
                  if (numericValue && parseInt(numericValue, 10) > 0) setTargetAmountError('');
                }
              }}
              placeholder="0"
              className={`w-full bg-bg-secondary border rounded-[12px] text-right text-lg text-text-primary focus:outline-none focus:border-accent-mint transition-colors py-3.5 pr-4 pl-8 ${
                targetAmountError ? 'border-accent-coral' : 'border-[var(--border)]'
              }`}
            />
          </div>
          {targetAmountError && <p className="text-xs text-accent-coral mt-1.5">{targetAmountError}</p>}
        </div>

        {/* 현재 저축액 (읽기 전용) */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            현재 저축액
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-base">₩</span>
            <input
              type="text"
              value={currentAmount ? formatNumber(parseInt(currentAmount, 10)) : '0'}
              readOnly
              disabled
              className="w-full bg-bg-secondary/50 border border-[var(--border)] rounded-[12px] text-right text-lg text-text-muted cursor-not-allowed py-3.5 pr-4 pl-8"
            />
          </div>
          <p className="text-xs text-text-muted mt-1.5">
            저축액은 &apos;저축하기&apos; 버튼으로만 변경할 수 있습니다
          </p>
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
            disabled={isSaving || isDeleting}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={isSaving || isDeleting}
            className="flex-1 bg-bg-secondary text-accent-coral border border-accent-coral rounded-[12px] font-medium hover:bg-accent-coral hover:text-bg-primary transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed p-3.5"
          >
            삭제
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

      {/* 삭제 확인 모달 */}
      {isDeleteConfirmOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[250] animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setIsDeleteConfirmOpen(false)}
        >
          <div
            className="bg-bg-card border border-[var(--border)] rounded-[20px] w-full max-w-sm animate-[fadeInUp_0.3s_ease-out] p-6 m-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-text-primary mb-3">
              저축 목표 삭제
            </h3>
            <p className="text-sm text-text-secondary mb-5">
              &apos;{goal?.name}&apos; 목표를 삭제하시겠습니까?<br />
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer p-3"
                disabled={isDeleting}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 bg-accent-coral text-white rounded-[12px] font-medium hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed p-3"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
