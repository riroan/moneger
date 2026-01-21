import { useEffect, useRef, RefObject } from 'react';

/**
 * 요소 외부 클릭 시 콜백을 실행하는 훅
 * @param callback - 외부 클릭 시 실행할 함수
 * @param enabled - 활성화 여부 (기본값: true)
 * @returns 대상 요소에 연결할 ref 객체
 */
export function useOutsideClick<T extends HTMLElement = HTMLElement>(
  callback: () => void,
  enabled: boolean = true
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [callback, enabled]);

  return ref;
}

/**
 * 기존 ref를 사용하여 외부 클릭 감지하는 훅
 * @param ref - 대상 요소의 ref
 * @param callback - 외부 클릭 시 실행할 함수
 * @param enabled - 활성화 여부 (기본값: true)
 */
export function useOutsideClickWithRef<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  callback: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, callback, enabled]);
}
