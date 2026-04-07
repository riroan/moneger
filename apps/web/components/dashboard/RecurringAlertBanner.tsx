'use client';

import { memo, useState, useEffect, useCallback } from 'react';
import { formatNumber } from '@/utils/formatters';
import { MdClose, MdNotificationsActive } from 'react-icons/md';
import { useAuthStore } from '@/stores';

interface AlertItem {
  id: string;
  description: string;
  amount: number;
  nextDueDate: string;
}

function RecurringAlertBanner() {
  const userId = useAuthStore((state) => state.userId);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [dismissed, setDismissed] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/recurring/summary?userId=${userId}`);
      const json = await res.json();
      if (json.success && json.data.alerts?.length > 0) {
        setAlerts(json.data.alerts);
      }
    } catch {
      // 에러 시 배너 미표시
    }
  }, [userId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  if (dismissed || alerts.length === 0) return null;

  const displayed = alerts.slice(0, 3);
  const remaining = alerts.length - 3;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-accent-coral/10 border border-accent-coral/20 rounded-[12px] px-4 py-3 mb-4 animate-[fadeIn_0.3s_ease-out]"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 min-w-0">
          <MdNotificationsActive className="text-accent-coral text-lg mt-0.5 shrink-0" />
          <div className="min-w-0">
            {displayed.map((alert) => {
              const dueDate = new Date(alert.nextDueDate);
              const today = new Date();
              // 날짜만 비교 (시간 제거)
              const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
              const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const diffDays = Math.round((dueDateOnly.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <p key={alert.id} className="text-xs sm:text-sm text-text-secondary truncate">
                  {alert.description} ₩{formatNumber(alert.amount)} 지출이{' '}
                  <span className="text-accent-coral font-medium">
                    {diffDays <= 0 ? '오늘' : `${diffDays}일 후`}
                  </span>
                  입니다
                </p>
              );
            })}
            {remaining > 0 && (
              <p className="text-[10px] text-text-muted mt-0.5">외 {remaining}건</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-text-muted hover:text-text-secondary transition-colors ml-2 p-1 cursor-pointer"
          aria-label="알림 닫기"
        >
          <MdClose className="text-base" />
        </button>
      </div>
    </div>
  );
}

export default memo(RecurringAlertBanner);
