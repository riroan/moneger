'use client';

import { formatNumber } from '@/utils/formatters';
import { CurrencyDisplay } from '@/components/transactions/TransactionItem';

interface SummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  lastMonthBalance: number;
  incomeCount: number;
  expenseCount: number;
  onIncomeClick?: () => void;
  onExpenseClick?: () => void;
  onBalanceClick?: () => void;
}

export default function SummaryCards({
  totalIncome,
  totalExpense,
  balance,
  lastMonthBalance,
  incomeCount,
  expenseCount,
  onIncomeClick,
  onExpenseClick,
  onBalanceClick,
}: SummaryCardsProps) {
  const cards = [
    {
      type: 'income',
      icon: '💼',
      label: '이번 달 수입',
      amount: `₩${formatNumber(totalIncome)}`,
      change: `${incomeCount}건의 수입`,
      positive: true,
    },
    {
      type: 'expense',
      icon: '💳',
      label: '이번 달 지출',
      amount: `₩${formatNumber(totalExpense)}`,
      change: `${expenseCount}건의 지출`,
      positive: false,
    },
    {
      type: 'balance',
      icon: '✨',
      label: '남은 금액',
      amount: `₩${formatNumber(balance)}`,
      change: `지난달 대비 ${balance - lastMonthBalance >= 0 ? '+' : ''}₩${formatNumber(Math.abs(balance - lastMonthBalance))}`,
      positive: balance - lastMonthBalance >= 0,
    },
  ];

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3"
      style={{ gap: '12px', marginBottom: '24px' }}
    >
      {cards.map((card, i) => {
        const isClickable = card.type === 'income' || card.type === 'expense' || card.type === 'balance';
        const handleClick = card.type === 'income' ? onIncomeClick : card.type === 'expense' ? onExpenseClick : card.type === 'balance' ? onBalanceClick : undefined;

        return (
        <div
          key={card.type}
          onClick={handleClick}
          className={`bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] relative overflow-hidden transition-all hover:translate-y-[-4px] hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] animate-[fadeInUp_0.6s_ease-out_backwards] [animation-delay:${(i + 1) * 100}ms] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:rounded-t-[20px] ${
            card.type === 'income'
              ? 'before:bg-gradient-to-r before:from-accent-mint before:to-accent-blue'
              : card.type === 'expense'
              ? 'before:bg-gradient-to-r before:from-accent-coral before:to-accent-yellow'
              : 'before:bg-gradient-to-r before:from-accent-purple before:to-accent-mint'
          } ${isClickable ? 'cursor-pointer' : ''}`}
          style={{ padding: '16px' }}
        >
          <div className="flex items-center gap-4 sm:block">
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] sm:rounded-[14px] flex items-center justify-center text-lg sm:text-[22px] flex-shrink-0 ${
                card.type === 'income'
                  ? 'bg-[var(--glow-mint)] text-accent-mint'
                  : card.type === 'expense'
                  ? 'bg-[var(--glow-coral)] text-accent-coral'
                  : 'bg-[var(--glow-purple)] text-accent-purple'
              }`}
              style={{ marginBottom: '0' }}
            >
              {card.icon}
            </div>
            <div className="flex-1 sm:mt-8">
              <div className="text-xs sm:text-sm text-text-secondary font-medium mb-0.5 sm:mb-1">
                {card.label}
              </div>
              <div
                className={`font-bold tracking-tight text-lg sm:text-2xl ${
                  card.type === 'income'
                    ? 'text-accent-mint'
                    : card.type === 'expense'
                    ? 'text-accent-coral'
                    : 'text-accent-purple'
                }`}
              >
                <CurrencyDisplay amount={card.amount} />
              </div>
            </div>
          </div>
          <div
            className={`hidden sm:inline-flex items-center gap-1 text-[13px] rounded-lg font-medium ${
              card.positive
                ? 'bg-[var(--glow-mint)] text-accent-mint'
                : 'bg-[var(--glow-coral)] text-accent-coral'
            }`}
            style={{ marginTop: '12px', padding: '8px 12px' }}
          >
            {card.change}
          </div>
        </div>
        );
      })}
    </div>
  );
}
