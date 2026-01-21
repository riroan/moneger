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
        className="bg-bg-card border border-[var(--border)] rounded-[24px] w-full max-w-sm animate-[fadeInUp_0.3s_ease-out]"
        style={{ padding: '32px', margin: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-text-primary" style={{ marginBottom: '12px' }}>
          {title}
        </h2>
        <div className="text-text-secondary" style={{ marginBottom: '24px' }}>
          {message}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer"
            style={{ padding: '14px' }}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-[12px] font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClass}`}
            style={{ padding: '14px' }}
          >
            {isLoading ? '처리 중...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
