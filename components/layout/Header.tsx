'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { formatYearMonth } from '@/utils/formatters';
import { useTheme } from '@/contexts/ThemeContext';
import { MdSettings, MdLogout, MdDarkMode, MdLightMode } from 'react-icons/md';

interface HeaderProps {
  userName: string;
  userEmail: string;
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onMonthSelect: (year: number, month: number) => void;
  onLogout: () => void;
  oldestDate?: { year: number; month: number } | null;
}

export default function Header({
  userName,
  userEmail,
  currentDate,
  onPreviousMonth,
  onNextMonth,
  onMonthSelect,
  onLogout,
  oldestDate,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const datePickerRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

  // Close date picker when clicking outside
  useEffect(() => {
    if (!isDatePickerOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDatePickerOpen]);

  // Close profile menu when clicking outside
  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen]);

  const handleDatePickerToggle = () => {
    if (!isDatePickerOpen) {
      setPickerYear(currentDate.getFullYear());
    }
    setIsDatePickerOpen(!isDatePickerOpen);
  };

  const isNextMonthDisabled = () => {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(currentDate.getMonth() + 1);
    const now = new Date();
    return nextMonth.getFullYear() > now.getFullYear() ||
      (nextMonth.getFullYear() === now.getFullYear() && nextMonth.getMonth() > now.getMonth());
  };

  const isPreviousMonthDisabled = () => {
    if (!oldestDate) return false;
    const oldestMonth = oldestDate.month - 1; // API returns 1-based month
    return currentDate.getFullYear() < oldestDate.year ||
      (currentDate.getFullYear() === oldestDate.year && currentDate.getMonth() <= oldestMonth);
  };

  const isPastMonth = (year: number, month: number) => {
    if (!oldestDate) return false;
    const oldestMonth = oldestDate.month - 1; // API returns 1-based month
    return year < oldestDate.year ||
      (year === oldestDate.year && month < oldestMonth);
  };

  const isPastYear = (year: number) => {
    if (!oldestDate) return false;
    return year < oldestDate.year;
  };

  return (
    <header
      className="flex justify-between items-center animate-[fadeInDown_0.6s_ease-out]"
      style={{ marginBottom: '24px' }}
    >
      <div
        onClick={() => {
          if (pathname === '/') {
            window.location.reload();
          } else {
            router.push('/');
          }
        }}
        className="flex items-center gap-2 sm:gap-3 cursor-pointer"
      >
        <Image
          src="/logo.svg"
          alt="MONEGER"
          width={48}
          height={48}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] sm:rounded-[14px] shadow-[0_8px_32px_var(--glow-mint)]"
        />
        <span className="hidden sm:block text-xl sm:text-2xl font-bold bg-gradient-to-br from-text-primary to-text-secondary bg-clip-text text-transparent tracking-tight">
          MONEGER
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div ref={datePickerRef} className="flex items-center bg-bg-card border border-[var(--border)] rounded-xl relative select-none" style={{ padding: '8px 12px', gap: '8px' }}>
          <button
            onClick={onPreviousMonth}
            disabled={isPreviousMonthDisabled()}
            className="text-text-secondary hover:text-text-primary transition-colors text-sm sm:text-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ◀
          </button>
          <span
            onClick={handleDatePickerToggle}
            className="text-sm sm:text-base font-semibold min-w-[80px] sm:min-w-[120px] text-center cursor-pointer"
          >
            {formatYearMonth(currentDate)}
          </span>
          <button
            onClick={onNextMonth}
            disabled={isNextMonthDisabled()}
            className="text-text-secondary hover:text-text-primary transition-colors text-sm sm:text-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ▶
          </button>

          {isDatePickerOpen && (
            <div
              className="absolute top-full left-1/2 -translate-x-1/2 bg-bg-card border border-[var(--border)] rounded-[16px] z-50 select-none"
              style={{ width: '320px', padding: '20px', marginTop: '3px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)' }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                <button
                  onClick={() => setPickerYear(prev => prev - 1)}
                  disabled={isPastYear(pickerYear - 1)}
                  className="text-text-secondary hover:text-text-primary transition-colors text-lg cursor-pointer w-8 h-8 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ◀
                </button>
                <div className="text-text-primary font-semibold" style={{ fontSize: '16px' }}>
                  {pickerYear}년
                </div>
                <button
                  onClick={() => setPickerYear(prev => prev + 1)}
                  disabled={pickerYear >= new Date().getFullYear()}
                  className="text-text-secondary hover:text-text-primary transition-colors text-lg cursor-pointer w-8 h-8 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ▶
                </button>
              </div>

              <div className="grid grid-cols-4" style={{ gap: '8px' }}>
                {Array.from({ length: 12 }, (_, i) => i).map(month => {
                  const isSelected = currentDate.getFullYear() === pickerYear && currentDate.getMonth() === month;
                  const now = new Date();
                  const isFuture = pickerYear > now.getFullYear() ||
                    (pickerYear === now.getFullYear() && month > now.getMonth());
                  const isPast = isPastMonth(pickerYear, month);
                  const isDisabled = isFuture || isPast;
                  return (
                    <button
                      key={month}
                      onClick={() => {
                        onMonthSelect(pickerYear, month);
                        setIsDatePickerOpen(false);
                      }}
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

        <div ref={profileMenuRef} className="relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-accent-purple to-accent-coral flex items-center justify-center font-semibold text-sm sm:text-base cursor-pointer transition-transform hover:scale-105"
          >
            {userName ? userName.charAt(0) : (userEmail ? userEmail.charAt(0) : '?')}
          </button>

          {isProfileMenuOpen && (
            <div
              className="absolute top-full right-0 bg-bg-card border border-[var(--border)] rounded-[12px] overflow-hidden select-none z-[300]"
              style={{ marginTop: '8px', minWidth: '180px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)' }}
            >
              <div className="border-b border-[var(--border)]" style={{ padding: '12px 14px' }}>
                <div className="font-semibold text-text-primary" style={{ fontSize: '14px' }}>{userName || '사용자'}</div>
                <div className="text-text-secondary" style={{ fontSize: '12px', marginTop: '2px' }}>{userEmail}</div>
              </div>
              <div style={{ padding: '6px 0' }}>
                <div
                  className="flex items-center justify-between text-text-primary"
                  style={{ padding: '10px 14px', fontSize: '14px' }}
                >
                  <span className="flex items-center gap-2">
                    {theme === 'dark' ? <MdDarkMode className="text-lg" /> : <MdLightMode className="text-lg" />}
                    {theme === 'dark' ? '다크 모드' : '라이트 모드'}
                  </span>
                  <button
                    onClick={toggleTheme}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                      theme === 'dark' ? 'bg-accent-purple' : 'bg-accent-mint'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        theme === 'dark' ? 'left-0.5' : 'translate-x-5 left-0.5'
                      }`}
                    />
                  </button>
                </div>
                <button
                  className="w-full text-left text-text-primary hover:bg-bg-card-hover transition-colors cursor-pointer"
                  style={{ padding: '10px 14px', fontSize: '14px' }}
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    router.push('/settings');
                  }}
                >
                  <span className="flex items-center gap-2"><MdSettings className="text-lg" /> 설정</span>
                </button>
                <button
                  className="w-full text-left text-text-primary hover:bg-bg-card-hover transition-colors cursor-pointer"
                  style={{ padding: '10px 14px', fontSize: '14px' }}
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onLogout();
                  }}
                >
                  <span className="flex items-center gap-2"><MdLogout className="text-lg" /> 로그아웃</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
