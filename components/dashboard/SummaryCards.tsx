'use client';

import { memo, useMemo } from 'react';
import { formatNumber } from '@/utils/formatters';
import { CurrencyDisplay } from '@/components/transactions/TransactionItem';
import { FaMoneyBillWave, FaCreditCard, FaWallet, FaChartLine } from 'react-icons/fa';
import { ReactNode } from 'react';

// 아이콘 컴포넌트를 밖에서 정의하여 재생성 방지
const IncomeIcon = <FaMoneyBillWave className="text-white text-xl sm:text-2xl" />;
const ExpenseIcon = <FaCreditCard className="text-white text-xl sm:text-2xl" />;
const SavingsIcon = <FaChartLine className="text-white text-xl sm:text-2xl" />;
const BalanceIcon = <FaWallet className="text-white text-xl sm:text-2xl" />;

interface SummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  lastMonthBalance: number;
  incomeCount: number;
  expenseCount: number;
  totalSavings: number;
  savingsCount: number;
  onIncomeClick?: () => void;
  onExpenseClick?: () => void;
  onBalanceClick?: () => void;
  onSavingsClick?: () => void;
}

function SummaryCards({
  totalIncome,
  totalExpense,
  balance,
  lastMonthBalance,
  incomeCount,
  expenseCount,
  totalSavings,
  savingsCount,
  onIncomeClick,
  onExpenseClick,
  onBalanceClick,
  onSavingsClick,
}: SummaryCardsProps) {
  const balanceDiff = balance - lastMonthBalance;

  // cards 배열 메모이제이션
  const cards = useMemo(() => [
    {
      type: 'income',
      icon: IncomeIcon,
      label: '이번 달 수입',
      amount: `₩${formatNumber(totalIncome)}`,
      change: `${incomeCount}건의 수입`,
      positive: true,
      iconBg: 'bg-[#10B981]',
      barColor: 'bg-[#10B981]',
      badgeBg: 'rgba(34, 197, 94, 0.2)',
      badgeText: '#4ade80',
    },
    {
      type: 'expense',
      icon: ExpenseIcon,
      label: '이번 달 지출',
      amount: `₩${formatNumber(totalExpense)}`,
      change: `${expenseCount}건의 지출`,
      positive: false,
      iconBg: 'bg-[#B91C1C]',
      barColor: 'bg-[#EF4444]',
      badgeBg: 'rgba(239, 68, 68, 0.2)',
      badgeText: '#f87171',
    },
    {
      type: 'savings',
      icon: SavingsIcon,
      label: '저축',
      amount: `₩${formatNumber(totalSavings)}`,
      change: `${savingsCount}건의 저축`,
      positive: true,
      iconBg: 'bg-[#0891B2]',
      barColor: 'bg-[#06B6D4]',
      badgeBg: 'rgba(6, 182, 212, 0.2)',
      badgeText: '#22d3ee',
    },
    {
      type: 'balance',
      icon: BalanceIcon,
      label: '잔액',
      amount: `${balance >= 0 ? '' : '-'}₩${formatNumber(Math.abs(balance))}`,
      change: `지난달 대비 ${balanceDiff >= 0 ? '+' : '-'}₩${formatNumber(Math.abs(balanceDiff))}`,
      positive: balanceDiff >= 0,
      iconBg: 'bg-[#7C3AED]',
      barColor: 'bg-[#8B5CF6]',
      badgeBg: 'rgba(168, 85, 247, 0.2)',
      badgeText: '#c084fc',
    },
  ], [totalIncome, incomeCount, totalExpense, expenseCount, totalSavings, savingsCount, balance, balanceDiff]);

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      style={{ gap: '12px', marginBottom: '24px' }}
    >
      {cards.map((card, i) => {
        const handleClick = card.type === 'income' ? onIncomeClick : card.type === 'expense' ? onExpenseClick : card.type === 'balance' ? onBalanceClick : card.type === 'savings' ? onSavingsClick : undefined;

        return (
          <div
            key={card.type}
            onClick={handleClick}
            className={`bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] relative overflow-hidden transition-all hover:translate-y-[-4px] hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] animate-[fadeInUp_0.6s_ease-out_backwards] cursor-pointer`}
            style={{ animationDelay: `${(i + 1) * 100}ms`, padding: '24px 16px 20px' }}
          >
            <div className="flex items-center gap-4">
              {/* 아이콘 */}
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-[10px] sm:rounded-[12px] flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 ${card.iconBg}`}
              >
                {card.icon}
              </div>

              {/* 내용 */}
              <div className="flex-1 text-right">
                <p className="text-text-secondary text-sm mb-1">
                  {card.label}
                </p>
                <p className="text-text-primary text-xl font-bold tracking-tight" style={{ marginBottom: '5px' }}>
                  <CurrencyDisplay amount={card.amount} />
                </p>
                <div
                  className="inline-flex items-center justify-center rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: card.badgeBg,
                    color: card.badgeText,
                    padding: '6px 12px',
                  }}
                >
                  {card.change}
                </div>
              </div>
            </div>

            {/* 하단 색상 바 */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${card.barColor}`} />
          </div>
        );
      })}
    </div>
  );
}

export default memo(SummaryCards);
