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
  const balanceDiff = balance - lastMonthBalance;

  const cards = [
    {
      type: 'income',
      icon: '💼',
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
      icon: '💳',
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
      type: 'balance',
      icon: '✨',
      label: '남은 금액',
      amount: `₩${formatNumber(balance)}`,
      change: `지난달 대비 ${balanceDiff >= 0 ? '+' : ''}₩${formatNumber(Math.abs(balanceDiff))}`,
      positive: balanceDiff >= 0,
      iconBg: 'bg-[#7C3AED]',
      barColor: 'bg-[#8B5CF6]',
      badgeBg: 'rgba(168, 85, 247, 0.2)',
      badgeText: '#c084fc',
    },
  ];

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3"
      style={{ gap: '12px', marginBottom: '24px' }}
    >
      {cards.map((card, i) => {
        const handleClick = card.type === 'income' ? onIncomeClick : card.type === 'expense' ? onExpenseClick : card.type === 'balance' ? onBalanceClick : undefined;

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
