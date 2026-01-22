'use client';

import { useState, useEffect } from 'react';
import { formatNumber, formatDate } from '@/utils/formatters';
import { MdSavings } from 'react-icons/md';
import type { TransactionWithCategory } from '@/types';

interface EditSavingsTransactionModalProps {
  isOpen: boolean;
  transaction: TransactionWithCategory | null;
  onClose: () => void;
  onDelete: () => void;
  isSubmitting?: boolean;
}

export default function EditSavingsTransactionModal({
  isOpen,
  transaction,
  onClose,
  onDelete,
  isSubmitting = false,
}: EditSavingsTransactionModalProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsDeleteConfirmOpen(false);
    }
  }, [isOpen]);

  if (!isOpen || !transaction) return null;

  const handleDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    onDelete();
    setIsDeleteConfirmOpen(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-[var(--border)] rounded-[24px] w-full max-w-md animate-[fadeInUp_0.3s_ease-out]"
        style={{ padding: '32px', margin: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
            저축 내역
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors text-2xl w-8 h-8 flex items-center justify-center cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* 저축 아이콘 */}
        <div className="flex justify-center" style={{ marginBottom: '24px' }}>
          <div
            className="w-16 h-16 rounded-[16px] flex items-center justify-center text-3xl"
            style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)' }}
          >
            <MdSavings />
          </div>
        </div>

        {/* 금액 */}
        <div className="text-center" style={{ marginBottom: '24px' }}>
          <p className="text-3xl font-bold text-accent-blue">
            <span style={{ marginRight: '2px' }}>₩</span>{formatNumber(transaction.amount)}
          </p>
          <p className="text-sm text-text-muted" style={{ marginTop: '8px' }}>
            {formatDate(transaction.date)}
          </p>
        </div>

        {/* 내용 */}
        <div
          className="bg-bg-secondary rounded-[12px]"
          style={{ padding: '16px', marginBottom: '24px' }}
        >
          <p className="text-sm text-text-muted" style={{ marginBottom: '4px' }}>내용</p>
          <p className="text-base text-text-primary font-medium">
            {transaction.description || '저축'}
          </p>
        </div>

        {/* 안내 문구 */}
        <div
          className="bg-accent-blue/10 rounded-[12px] text-center"
          style={{ padding: '16px', marginBottom: '24px' }}
        >
          <p className="text-sm text-text-secondary">
            저축 내역은 수정할 수 없습니다.<br />
            삭제 시 저축 목표의 금액이 차감됩니다.
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer"
            style={{ padding: '14px' }}
            disabled={isSubmitting}
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="flex-1 bg-bg-secondary text-accent-coral border border-accent-coral rounded-[12px] font-medium hover:bg-accent-coral hover:text-bg-primary transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ padding: '14px' }}
          >
            삭제
          </button>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {isDeleteConfirmOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[250] animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setIsDeleteConfirmOpen(false)}
        >
          <div
            className="bg-bg-card border border-[var(--border)] rounded-[20px] w-full max-w-sm animate-[fadeInUp_0.3s_ease-out]"
            style={{ padding: '24px', margin: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-text-primary" style={{ marginBottom: '12px' }}>
              저축 내역 삭제
            </h3>
            <p className="text-sm text-text-secondary" style={{ marginBottom: '20px' }}>
              이 저축 내역을 삭제하시겠습니까?<br />
              저축 목표의 금액에서 {formatNumber(transaction.amount)}원이 차감됩니다.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer"
                style={{ padding: '12px' }}
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="flex-1 bg-accent-coral text-white rounded-[12px] font-medium hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ padding: '12px' }}
              >
                {isSubmitting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
