'use client';

import { memo } from 'react';

interface FABProps {
  onClick: () => void;
  visible?: boolean;
}

function FAB({ onClick, visible = true }: FABProps) {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-14 h-14 sm:w-20 sm:h-20 rounded-[14px] sm:rounded-[18px] bg-gradient-to-br from-accent-mint to-accent-blue border-none text-bg-primary text-[28px] sm:text-[36px] font-light leading-none cursor-pointer shadow-[0_8px_32px_var(--glow-mint)] transition-all hover:scale-110 hover:rotate-90 hover:shadow-[0_12px_48px_var(--glow-mint)] z-[100] flex items-center justify-center"
    >
      +
    </button>
  );
}

export default memo(FAB);
