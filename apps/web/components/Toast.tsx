'use client';

import React, { useEffect, useState } from 'react';
import { useToast, ToastType } from '@/contexts/ToastContext';

const toastStyles: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-500',
    icon: '✓',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-500',
    icon: '✕',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-500',
    icon: '⚠',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-500',
    icon: 'ℹ',
  },
};

interface ToastItemProps {
  id: string;
  message: string;
  type: ToastType;
  onRemove: (id: string) => void;
}

function ToastItem({ id, message, type, onRemove }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const style = toastStyles[type];

  useEffect(() => {
    // 마운트 후 애니메이션 시작
    const showTimer = setTimeout(() => setIsVisible(true), 10);

    // 2.5초 후 사라지는 애니메이션 시작
    const hideTimer = setTimeout(() => {
      setIsLeaving(true);
    }, 2500);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleAnimationEnd = () => {
    if (isLeaving) {
      onRemove(id);
    }
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 shadow-lg
        ${style.bg} ${style.border}
        transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      onTransitionEnd={handleAnimationEnd}
      role="alert"
    >
      <span className="text-lg">{style.icon}</span>
      <p className="text-sm text-gray-800 dark:text-gray-200">{message}</p>
      <button
        onClick={() => {
          setIsLeaving(true);
        }}
        className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label="닫기"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
}
