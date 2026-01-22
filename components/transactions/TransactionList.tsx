'use client';

import { forwardRef, useMemo } from 'react';
import TransactionItem from './TransactionItem';
import type { TransactionWithCategory } from '@/types';

interface TransactionListProps {
  transactions: TransactionWithCategory[];
  isLoading: boolean;
  hasMore?: boolean;
  emptyMessage?: string;
  onTransactionClick: (transaction: TransactionWithCategory) => void;
  showDateHeaders?: boolean;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const formatDateHeader = (dateString: string) => {
  // dateString은 "YYYY-MM-DD" 형식
  const [year, month, day] = dateString.split('-').map(Number);
  // 로컬 시간대로 Date 생성 (시간대 문제 방지)
  const date = new Date(year, month - 1, day);
  const dayOfWeek = DAY_NAMES[date.getDay()];
  return `${month}월 ${day}일 (${dayOfWeek})`;
};

const TransactionList = forwardRef<HTMLDivElement, TransactionListProps>(
  ({ transactions, isLoading, hasMore = false, emptyMessage = '거래 내역이 없습니다', onTransactionClick, showDateHeaders = false }, ref) => {
    // 날짜별로 거래 그룹화 (로컬 시간대 기준)
    const groupedTransactions = useMemo(() => {
      if (!showDateHeaders) return null;

      const groups: { date: string; transactions: TransactionWithCategory[] }[] = [];
      let currentDate = '';

      transactions.forEach((tx) => {
        // ISO 문자열을 Date 객체로 변환 후 로컬 시간대 기준으로 날짜 추출
        const date = new Date(tx.date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const txDate = `${year}-${month}-${day}`;

        if (txDate !== currentDate) {
          currentDate = txDate;
          groups.push({ date: txDate, transactions: [tx] });
        } else {
          groups[groups.length - 1].transactions.push(tx);
        }
      });

      return groups;
    }, [transactions, showDateHeaders]);

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

    // 날짜 헤더가 있는 경우
    if (showDateHeaders && groupedTransactions) {
      return (
        <div className="flex flex-col" style={{ gap: '16px' }}>
          {groupedTransactions.map((group) => (
            <div key={group.date}>
              <div className="text-xs text-text-muted" style={{ marginBottom: '8px', marginLeft: '4px' }}>
                {formatDateHeader(group.date)}
              </div>
              <div className="flex flex-col" style={{ gap: '8px' }}>
                {group.transactions.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    onClick={() => onTransactionClick(tx)}
                  />
                ))}
              </div>
            </div>
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
