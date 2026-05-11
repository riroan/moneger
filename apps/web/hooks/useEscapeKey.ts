'use client';

import { useEffect } from 'react';

/**
 * 모달이 활성화된 동안 Escape 키를 누르면 onClose를 호출합니다.
 * WCAG 2.1: 모달은 키보드만으로 닫을 수 있어야 합니다.
 */
export function useEscapeKey(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, onClose]);
}
