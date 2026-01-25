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
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-[var(--border)] rounded-[24px] animate-[fadeIn_0.3s_ease-out] w-[90%] max-w-[520px] p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-6">
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
