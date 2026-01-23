'use client';

import { formatNumber } from '@/utils/formatters';
import { CurrencyDisplay } from '@/components/transactions/TransactionItem';
import { MdToday, MdSavings } from 'react-icons/md';
import { FaMoneyBillWave, FaCreditCard } from 'react-icons/fa';

interface TodaySummary {
  date: string;
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  expense: {
    total: number;
    count: number;
  };
  income: {
    total: number;
    count: number;
  };
  savings: {
    total: number;
    count: number;
  };
}

interface TodaySummaryCardProps {
  data: TodaySummary | null;
  isLoading: boolean;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export default function TodaySummaryCard({ data, isLoading }: TodaySummaryCardProps) {
  if (isLoading) {
    return (
      <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] animate-pulse" style={{ padding: '16px' }}>
        <div className="h-5 bg-bg-secondary rounded w-1/3" style={{ marginBottom: '12px' }} />
        <div className="h-8 bg-bg-secondary rounded w-1/2" style={{ marginBottom: '8px' }} />
        <div className="h-4 bg-bg-secondary rounded w-1/4" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { month, day, dayOfWeek, expense, income, savings } = data;
  const hasExpense = expense.count > 0;
  const hasIncome = income.count > 0;
  const hasSavings = savings.count > 0;

  return (
    <div
      className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] animate-[fadeIn_0.6s_ease-out]"
      style={{ padding: '16px' }}
    >
      {/* 날짜 헤더 */}
      <div className="flex items-center gap-2" style={{ marginBottom: '12px' }}>
        <MdToday className="text-lg sm:text-xl text-accent-yellow" />
        <span className="text-sm sm:text-base font-semibold text-text-primary">
          오늘 ({month}월 {day}일 {DAY_NAMES[dayOfWeek]})
        </span>
      </div>

      {/* 수입/지출/저축 정보 */}
      <div className="flex flex-col" style={{ gap: '8px' }}>
        {/* 수입 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaMoneyBillWave className="text-base sm:text-lg text-accent-mint" />
            <span className="text-xs sm:text-sm text-text-secondary">수입</span>
          </div>
          <div className="text-right">
            {hasIncome ? (
              <>
                <span className="text-base sm:text-lg font-bold text-accent-mint">
                  <CurrencyDisplay amount={`₩${formatNumber(income.total)}`} />
                </span>
                <span className="text-[10px] sm:text-xs text-text-muted" style={{ marginLeft: '6px' }}>
                  ({income.count}건)
                </span>
              </>
            ) : (
              <span className="text-sm sm:text-base text-text-muted">-</span>
            )}
          </div>
        </div>

        {/* 지출 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaCreditCard className="text-base sm:text-lg text-accent-coral" />
            <span className="text-xs sm:text-sm text-text-secondary">지출</span>
          </div>
          <div className="text-right">
            {hasExpense ? (
              <>
                <span className="text-base sm:text-lg font-bold text-accent-coral">
                  <CurrencyDisplay amount={`₩${formatNumber(expense.total)}`} />
                </span>
                <span className="text-[10px] sm:text-xs text-text-muted" style={{ marginLeft: '6px' }}>
                  ({expense.count}건)
                </span>
              </>
            ) : (
              <span className="text-sm sm:text-base text-text-muted">-</span>
            )}
          </div>
        </div>

        {/* 저축 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MdSavings className="text-base sm:text-lg text-accent-blue" />
            <span className="text-xs sm:text-sm text-text-secondary">저축</span>
          </div>
          <div className="text-right">
            {hasSavings ? (
              <>
                <span className="text-base sm:text-lg font-bold text-accent-blue">
                  <CurrencyDisplay amount={`₩${formatNumber(savings.total)}`} />
                </span>
                <span className="text-[10px] sm:text-xs text-text-muted" style={{ marginLeft: '6px' }}>
                  ({savings.count}건)
                </span>
              </>
            ) : (
              <span className="text-sm sm:text-base text-text-muted">-</span>
            )}
          </div>
        </div>
      </div>

      {/* 거래 없음 메시지 */}
      {!hasExpense && !hasIncome && !hasSavings && (
        <div className="text-center text-text-muted text-xs sm:text-sm" style={{ marginTop: '8px' }}>
          오늘 거래 내역이 없습니다
        </div>
      )}
    </div>
  );
}
