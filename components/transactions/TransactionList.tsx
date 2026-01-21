'use client';

import { forwardRef } from 'react';
import TransactionItem from './TransactionItem';
import type { TransactionWithCategory } from '@/types';

interface TransactionListProps {
  transactions: TransactionWithCategory[];
  isLoading: boolean;
  hasMore?: boolean;
  emptyMessage?: string;
  onTransactionClick: (transaction: TransactionWithCategory) => void;
}

const TransactionList = forwardRef<HTMLDivElement, TransactionListProps>(
  ({ transactions, isLoading, hasMore = false, emptyMessage = '거래 내역이 없습니다', onTransactionClick }, ref) => {
    if (transactions.length === 0 && isLoading) {
      return (
        <div className="text-center text-text-muted py-8">
          로딩 중...
        </div>
      );
    }

    if (transactions.length === 0) {
      return (
        <div className="text-center text-text-muted py-8">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="flex flex-col" style={{ gap: '8px' }}>
        {transactions.map((tx) => (
          <TransactionItem
            key={tx.id}
            transaction={tx}
            onClick={() => onTransactionClick(tx)}
          />
        ))}

        {/* 무한 스크롤 트리거 */}
        {hasMore && <div ref={ref} style={{ height: '20px' }} />}

        {/* 로딩 인디케이터 */}
        {isLoading && transactions.length > 0 && (
          <div className="text-center text-text-muted py-4">
            로딩 중...
          </div>
        )}
      </div>
    );
  }
);

TransactionList.displayName = 'TransactionList';

export default TransactionList;
