import { useEffect } from 'react';

/**
 * 모달이 열렸을 때 body 스크롤을 비활성화하는 훅
 * @param isLocked - 스크롤 잠금 여부
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (isLocked) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isLocked]);
}
