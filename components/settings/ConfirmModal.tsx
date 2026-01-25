'use client';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  confirmButtonClass = 'bg-accent-coral text-white',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[300] animate-[fadeIn_0.2s_ease-out]"
      onClick={onCancel}
    >
      <div
        className="bg-bg-card border border-[var(--border)] rounded-[24px] w-full max-w-sm animate-[fadeInUp_0.3s_ease-out] p-8 m-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-text-secondary hover:text-text-primary transition-colors text-2xl w-8 h-8 flex items-center justify-center cursor-pointer"
          >
            ×
          </button>
        </div>
        <div className="text-text-secondary mb-6">
          {message}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer p-3.5"
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-[12px] font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed p-3.5 ${confirmButtonClass}`}
          >
            {isLoading ? '처리 중...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
