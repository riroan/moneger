'use client';

import { memo, useMemo } from 'react';
import { formatNumber, formatDate, formatCurrencyDisplay } from '@/utils/formatters';
import { getIconComponent } from '@/components/settings/constants';
import { MdSavings } from 'react-icons/md';
import type { TransactionWithCategory } from '@/types';

interface TransactionItemProps {
  transaction: TransactionWithCategory;
  onClick?: () => void;
}

/**
 * 통화 표시 컴포넌트
 */
const CurrencyDisplay = memo(({ amount }: { amount: string }) => {
  const { sign, currencySymbol, number } = formatCurrencyDisplay(amount);

  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      {sign && <span style={{ marginRight: '2px' }}>{sign}</span>}
      {currencySymbol && <span style={{ marginRight: '1px' }}>{currencySymbol}</span>}
      {number}
    </span>
  );
});

CurrencyDisplay.displayName = 'CurrencyDisplay';

function TransactionItem({ transaction: tx, onClick }: TransactionItemProps) {
  const isSavings = !!tx.savingsGoalId;

  // 아이콘 컴포넌트 메모이제이션
  const IconComponent = useMemo(
    () => (isSavings ? MdSavings : getIconComponent(tx.category?.icon)),
    [isSavings, tx.category?.icon]
  );

  return (
    <div
      className="rounded-[12px] sm:rounded-[14px] transition-colors cursor-pointer hover:opacity-80"
      style={{ padding: '12px', backgroundColor: 'var(--bg-card-hover)' }}
      onClick={onClick}
    >
      <div className="flex items-center">
        {/* 아이콘 */}
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-[10px] bg-bg-card flex items-center justify-center text-base sm:text-lg flex-shrink-0"
          style={{ marginRight: '12px', color: isSavings ? 'var(--accent-blue)' : (tx.category?.color || 'var(--text-primary)') }}
        >
          <IconComponent />
        </div>
        {/* 내용 영역 */}
        <div className="flex-1 min-w-0">
          {/* 상단: 내용 + 금액 */}
          <div className="flex items-center justify-between">
            <div className="text-sm sm:text-[15px] font-medium truncate flex-1 min-w-0" style={{ marginRight: '12px' }}>
              {tx.description || tx.category?.name || '거래'}
            </div>
            <div className={`text-sm sm:text-base font-semibold whitespace-nowrap ${
              tx.savingsGoalId ? 'text-accent-blue' : tx.type === 'EXPENSE' ? 'text-accent-coral' : 'text-accent-mint'
            }`}>
              <CurrencyDisplay amount={`${tx.type === 'EXPENSE' ? '-' : '+'}₩${formatNumber(tx.amount)}`} />
            </div>
          </div>
          {/* 하단: 시간 + 카테고리 */}
          <div className="flex items-center justify-between text-xs sm:text-[13px] text-text-muted">
            <span>{formatDate(tx.date)}</span>
            <span>{isSavings ? '저축' : (tx.category?.name || '미분류')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// React.memo로 불필요한 리렌더 방지
export default memo(TransactionItem, (prevProps, nextProps) => {
  return (
    prevProps.transaction.id === nextProps.transaction.id &&
    prevProps.transaction.amount === nextProps.transaction.amount &&
    prevProps.transaction.description === nextProps.transaction.description &&
    prevProps.onClick === nextProps.onClick
  );
});

export { CurrencyDisplay };
