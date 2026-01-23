'use client';

interface ModalOverlayProps {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}

export default function ModalOverlay({
  children,
  onClose,
  title,
}: ModalOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-[var(--border)] rounded-[24px] animate-[fadeIn_0.3s_ease-out]"
        style={{
          width: '90%',
          maxWidth: '520px',
          padding: '32px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors text-2xl w-8 h-8 flex items-center justify-center cursor-pointer"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
