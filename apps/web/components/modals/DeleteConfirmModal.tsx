'use client';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[300] animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-[var(--border)] rounded-[24px] w-full max-w-sm animate-[fadeInUp_0.3s_ease-out] p-8 m-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors text-2xl w-8 h-8 flex items-center justify-center cursor-pointer"
          >
            ×
          </button>
        </div>
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[var(--glow-coral)] flex items-center justify-center text-3xl mb-4">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            내역 삭제
          </h2>
          <p className="text-sm text-text-secondary text-center">
            이 내역을 정말 삭제하시겠습니까?<br />
            삭제된 내역은 복구할 수 없습니다.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer p-3.5"
            disabled={isSubmitting}
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 bg-gradient-to-br from-accent-coral to-red-600 text-bg-primary rounded-[12px] font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed p-3.5"
            disabled={isSubmitting}
          >
            {isSubmitting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}
