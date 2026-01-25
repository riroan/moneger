'use client';

import { useMemo, useState, useEffect } from 'react';
import Holidays from 'date-holidays';
import { formatNumber } from '@/utils/formatters';
import { useAppStore, useAuthStore } from '@/stores';
import TransactionItem from '@/components/transactions/TransactionItem';
import type { TransactionWithCategory } from '@/types';

// 한국 공휴일 인스턴스 생성
const hd = new Holidays('KR');

interface DailyData {
  date: Date;
  income: number;
  expense: number;
  savings: number;
  balance: number;
}

interface DailyCalendarViewProps {
  data: DailyData[];
  year: number;
  month: number;
  isLoading: boolean;
  onTransactionClick?: (tx: TransactionWithCategory) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function DailyCalendarView({
  data,
  year,
  month,
  isLoading,
  onTransactionClick,
}: DailyCalendarViewProps) {
  const isMobile = useAppStore((state) => state.isMobile);
  const userId = useAuthStore((state) => state.userId);
  const [monthTransactions, setMonthTransactions] = useState<TransactionWithCategory[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  // 현재 월이면 오늘 날짜, 아니면 1일을 기본값으로
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month - 1;
  const todayDate = today.getDate();
  const defaultDay = isCurrentMonth ? todayDate : 1;
  const [selectedDay, setSelectedDay] = useState<number>(defaultDay);

  // 월이 변경되면 선택된 날짜 초기화
  useEffect(() => {
    const newDefault = isCurrentMonth ? todayDate : 1;
    setSelectedDay(newDefault);
  }, [year, month, isCurrentMonth, todayDate]);

  const calendarData = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    // 데이터를 날짜별로 맵핑
    const dataMap = new Map<number, DailyData>();
    data.forEach((d) => {
      const day = new Date(d.date).getDate();
      dataMap.set(day, d);
    });

    // 달력 그리드 생성
    const weeks: (DailyData | null)[][] = [];
    let currentWeek: (DailyData | null)[] = [];

    // 첫 주의 빈 칸
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }

    // 날짜 채우기
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = dataMap.get(day) || {
        date: new Date(year, month - 1, day),
        income: 0,
        expense: 0,
        savings: 0,
        balance: 0,
      };
      currentWeek.push(dayData);

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // 마지막 주의 빈 칸
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [data, year, month]);

  // 해당 월의 공휴일 Set 생성
  const holidayDays = useMemo(() => {
    const holidays = hd.getHolidays(year);
    const holidaySet = new Set<number>();

    holidays.forEach((holiday) => {
      const date = new Date(holiday.date);
      if (date.getMonth() === month - 1 && holiday.type === 'public') {
        holidaySet.add(date.getDate());
      }
    });

    return holidaySet;
  }, [year, month]);

  // 월 합계 계산
  const monthTotal = useMemo(() => {
    return data.reduce(
      (acc, d) => ({
        income: acc.income + d.income,
        expense: acc.expense + d.expense,
      }),
      { income: 0, expense: 0 }
    );
  }, [data]);

  // 선택된 날짜의 데이터
  const selectedDayData = useMemo(() => {
    return data.find((d) => new Date(d.date).getDate() === selectedDay) || null;
  }, [data, selectedDay]);

  // 월별 거래 내역 로드 (한 번만)
  useEffect(() => {
    if (userId) {
      setIsLoadingTransactions(true);

      fetch(`/api/transactions?userId=${userId}&year=${year}&month=${month}&limit=100`)
        .then((res) => res.json())
        .then((res) => {
          if (res.data) {
            setMonthTransactions(res.data);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingTransactions(false));
    } else {
      setMonthTransactions([]);
    }
  }, [userId, year, month]);

  // 선택된 날짜의 거래 필터링 (메모이제이션)
  const dayTransactions = useMemo(() => {
    return monthTransactions.filter((tx: TransactionWithCategory) => {
      const txDate = new Date(tx.date);
      const txDay = txDate.getDate();
      const txMonth = txDate.getMonth() + 1;
      const txYear = txDate.getFullYear();
      return txDay === selectedDay && txMonth === month && txYear === year;
    });
  }, [monthTransactions, selectedDay, month, year]);

  if (isLoading) {
    return (
      <div className="text-center text-text-muted py-8">
        로딩 중...
      </div>
    );
  }

  return (
    <div>
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7" style={{ marginBottom: '8px' }}>
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className={`text-center text-xs font-medium ${
              index === 0 ? 'text-accent-coral' : index === 6 ? 'text-accent-blue' : 'text-text-muted'
            }`}
            style={{ padding: '4px' }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div className="flex flex-col" style={{ gap: '4px' }}>
        {calendarData.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7" style={{ gap: '4px' }}>
            {week.map((dayData, dayIndex) => {
              if (!dayData) {
                return <div key={dayIndex} className="sm:min-h-[95px] min-h-[44px]" />;
              }

              const day = new Date(dayData.date).getDate();
              const isToday = isCurrentMonth && day === todayDate;
              const hasIncome = dayData.income > 0;
              const hasExpense = dayData.expense > 0;
              const hasSavings = (dayData.savings || 0) > 0;
              const isSunday = dayIndex === 0;
              const isSaturday = dayIndex === 6;
              const isHoliday = holidayDays.has(day);
              const isSelected = selectedDay === day;

              return (
                <div
                  key={dayIndex}
                  onClick={() => setSelectedDay(day)}
                  className={`rounded-lg sm:rounded-xl transition-colors cursor-pointer sm:min-h-[95px] min-h-[44px] ${
                    isSelected
                      ? 'bg-accent-blue/20 ring-1 ring-accent-blue'
                      : isToday
                      ? 'bg-accent-mint/20 ring-1 ring-accent-mint'
                      : 'bg-bg-secondary hover:bg-bg-card-hover'
                  }`}
                  style={{ padding: '6px 4px' }}
                >
                  <div
                    className={`text-xs sm:text-sm font-medium text-center ${
                      isSelected
                        ? 'text-accent-blue'
                        : isToday
                        ? 'text-accent-mint'
                        : isSunday || isHoliday
                        ? 'text-accent-coral'
                        : isSaturday
                        ? 'text-accent-blue'
                        : 'text-text-primary'
                    }`}
                    style={{ marginBottom: '2px' }}
                  >
                    {day}
                  </div>
                  {/* 모바일: 점으로 표시 */}
                  {isMobile ? (
                    <div className="flex justify-center items-center gap-1" style={{ marginTop: '4px' }}>
                      {hasIncome && hasExpense && hasSavings ? (
                        /* 수입, 지출, 저축 모두 있을 때: 금색 점 */
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: 'linear-gradient(145deg, #fef3c7, #fbbf24, #f59e0b, #d97706)',
                            boxShadow: '0 0 6px rgba(251, 191, 36, 0.6)',
                          }}
                        />
                      ) : (
                        /* 일부만 있을 때: 개별 점들 */
                        <>
                          {hasIncome && (
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }} />
                          )}
                          {hasExpense && (
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                          )}
                          {hasSavings && (
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#06B6D4' }} />
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    /* PC: 금액 표시 */
                    <div className="flex flex-col items-center" style={{ gap: '1px' }}>
                      {hasIncome && (
                        <div className="text-[11px] font-medium truncate w-full text-center" style={{ color: '#059669' }}>
                          +{formatNumber(dayData.income)}
                        </div>
                      )}
                      {hasExpense && (
                        <div className="text-[11px] font-medium truncate w-full text-center" style={{ color: '#DC2626' }}>
                          -{formatNumber(dayData.expense)}
                        </div>
                      )}
                      {hasSavings && (
                        <div className="text-[11px] font-medium truncate w-full text-center" style={{ color: '#0891B2' }}>
                          ₩{formatNumber(dayData.savings)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 선택된 날짜 상세 정보 */}
      <div
        className="bg-bg-secondary rounded-[12px]"
        style={{ padding: '14px', marginTop: '12px' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3" style={{ marginBottom: '12px' }}>
          <span className="text-sm font-semibold text-text-primary whitespace-nowrap">
            {month}월 {selectedDay}일
          </span>
          {selectedDayData && (
            <div className="flex flex-wrap gap-2 sm:gap-3 text-xs">
              <span style={{ color: '#059669' }}>+{formatNumber(selectedDayData.income)}</span>
              <span style={{ color: '#DC2626' }}>-{formatNumber(selectedDayData.expense)}</span>
              {(selectedDayData.savings || 0) > 0 && (
                <span style={{ color: '#0891B2' }}>₩{formatNumber(selectedDayData.savings)}</span>
              )}
            </div>
          )}
        </div>

        {/* 거래 내역 */}
        <div className="flex flex-col" style={{ gap: '8px' }}>
          {isLoadingTransactions ? (
            <div className="text-center text-text-muted py-4 text-sm">로딩 중...</div>
          ) : dayTransactions.length > 0 ? (
            dayTransactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                onClick={() => onTransactionClick?.(tx)}
              />
            ))
          ) : (
            <div className="text-center text-text-muted py-4 text-sm">거래 내역이 없습니다</div>
          )}
        </div>
      </div>
    </div>
  );
}
