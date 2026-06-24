'use client';

import { memo, createElement } from 'react';
import { formatNumber, formatDate, formatCurrencyDisplay } from '@/utils/formatters';
import { getIconComponent } from '@/components/settings/constants';
import { MdSavings, MdEventRepeat } from 'react-icons/md';
import type { TransactionWithCategory } from '@/types';
import { isAssetFormationCategory, isAssetFormationTransaction } from '@/lib/cash-flow';

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
    <span className="tabular-nums whitespace-nowrap">
      {sign && <span className="mr-0.5">{sign}</span>}
      {currencySymbol && <span className="mr-px">{currencySymbol}</span>}
      {number}
    </span>
  );
});

CurrencyDisplay.displayName = 'CurrencyDisplay';

function TransactionItem({ transaction: tx, onClick }: TransactionItemProps) {
  const isSavings = !!tx.savingsGoalId;
  const isAssetFormation = isAssetFormationTransaction(tx);
  const isRecurring = !!tx.recurringExpenseId;

  const iconType = isSavings ? MdSavings : getIconComponent(tx.category?.icon);
  const iconColor = isAssetFormation ? 'var(--accent-blue)' : (tx.category?.color || 'var(--text-primary)');

  return (
    <div
      className="rounded-[12px] sm:rounded-[14px] transition-colors cursor-pointer hover:opacity-80 p-3 bg-bg-card-hover"
      onClick={onClick}
    >
      <div className="flex items-center">
        {/* 아이콘 */}
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-[10px] bg-bg-card flex items-center justify-center text-base sm:text-lg flex-shrink-0 mr-3 relative"
          style={{ color: iconColor }}
        >
          {createElement(iconType)}
          {isRecurring && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-bg-card flex items-center justify-center text-accent-coral"
              title="정기 지출"
              aria-label="정기 지출"
            >
              <MdEventRepeat className="text-[10px]" />
            </span>
          )}
        </div>
        {/* 내용 영역 */}
        <div className="flex-1 min-w-0">
          {/* 상단: 내용 + 금액 */}
          <div className="flex items-center justify-between">
            <div className="text-sm sm:text-[15px] font-medium truncate flex-1 min-w-0 mr-3">
              {tx.description || tx.category?.name || '거래'}
            </div>
            <div className={`text-sm sm:text-base font-semibold whitespace-nowrap ${
              isAssetFormation ? 'text-accent-blue' : tx.type === 'EXPENSE' ? 'text-accent-coral' : 'text-accent-mint'
            }`}>
              <CurrencyDisplay amount={`${tx.type === 'EXPENSE' ? '-' : '+'}₩${formatNumber(tx.amount)}`} />
            </div>
          </div>
          {/* 하단: 시간 + 카테고리 */}
          <div className="flex items-center justify-between text-xs sm:text-[13px] text-text-muted">
            <span>{formatDate(tx.date)}</span>
            <span className="inline-flex items-center gap-1">
              {isRecurring && !isSavings && (
                <span className="text-[10px] font-medium bg-accent-coral/15 text-accent-coral px-1.5 py-0.5 rounded-full">정기</span>
              )}
              {isSavings ? '저축 납입' : isAssetFormationCategory(tx.category) ? (tx.category?.name || '자산 형성') : (tx.category?.name || '미분류')}
            </span>
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
    prevProps.transaction.recurringExpenseId === nextProps.transaction.recurringExpenseId &&
    prevProps.transaction.category?.categoryGroup === nextProps.transaction.category?.categoryGroup &&
    prevProps.onClick === nextProps.onClick
  );
});

export { CurrencyDisplay };
