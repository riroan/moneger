'use client';

import { useState, useEffect } from 'react';
import { formatNumber } from '@/utils/formatters';
import { MdHome, MdDirectionsCar, MdSchool, MdFlight, MdDevices, MdSavings } from 'react-icons/md';
import { FaGift, FaHeartbeat } from 'react-icons/fa';

interface SavingsGoal {
  id: string;
  name: string;
  icon: string;
  targetDate: string;
  currentAmount: number;
  targetAmount: number;
  progressPercent: number;
  monthlyRequired: number;
}

interface DepositModalProps {
  isOpen: boolean;
  goal: SavingsGoal | null;
  onClose: () => void;
  onDeposit: (goalId: string, amount: number) => Promise<void>;
}

const GOAL_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  home: MdHome,
  car: MdDirectionsCar,
  school: MdSchool,
  travel: MdFlight,
  device: MdDevices,
  gift: FaGift,
  health: FaHeartbeat,
  savings: MdSavings,
};

const QUICK_AMOUNTS = [10000, 50000, 100000, 500000];

export default function DepositModal({ isOpen, goal, onClose, onDeposit }: DepositModalProps) {
  const [amount, setAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [amountError, setAmountError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setAmountError('');
    }
  }, [isOpen]);

  const handleDeposit = async () => {
    if (!goal) return;

    const depositAmount = parseInt(amount || '0', 10);
    if (depositAmount <= 0) {
      setAmountError('저축 금액을 입력해주세요');
      return;
    }

    setIsDepositing(true);
    try {
      await onDeposit(goal.id, depositAmount);
      onClose();
    } finally {
      setIsDepositing(false);
    }
  };

  const handleQuickAmount = (quickAmount: number) => {
    const current = parseInt(amount || '0', 10);
    setAmount((current + quickAmount).toString());
    setAmountError('');
  };

  if (!isOpen || !goal) return null;

  const IconComponent = GOAL_ICON_MAP[goal.icon] || MdSavings;
  const remainingAmount = goal.targetAmount - goal.currentAmount;
  const newAmount = goal.currentAmount + (parseInt(amount || '0', 10));
  const newProgress = goal.targetAmount > 0 ? Math.round((newAmount / goal.targetAmount) * 100) : 0;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-[var(--border)] rounded-[24px] w-full max-w-md animate-[fadeInUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto"
        style={{ padding: '32px', margin: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
            저축하기
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors text-2xl w-8 h-8 flex items-center justify-center cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* 목표 정보 */}
        <div
          className="bg-bg-secondary rounded-[14px] flex items-center gap-4"
          style={{ padding: '16px', marginBottom: '20px' }}
        >
          <div
            className="w-12 h-12 rounded-[12px] flex items-center justify-center text-xl"
            style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', color: '#FBBF24' }}
          >
            <IconComponent />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold">{goal.name}</p>
            <p className="text-xs text-text-muted">
              현재 <span style={{ marginRight: '1px' }}>₩</span>{formatNumber(goal.currentAmount)} / 목표 <span style={{ marginRight: '1px' }}>₩</span>{formatNumber(goal.targetAmount)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-accent-mint">{goal.progressPercent}%</p>
          </div>
        </div>

        {/* 남은 금액 */}
        <div
          className="bg-accent-mint/10 rounded-[12px] text-center"
          style={{ padding: '12px', marginBottom: '20px' }}
        >
          <p className="text-xs text-text-muted" style={{ marginBottom: '4px' }}>목표까지 남은 금액</p>
          <p className="text-lg font-bold text-accent-mint">
            <span style={{ marginRight: '1px' }}>₩</span>{formatNumber(Math.max(remainingAmount, 0))}
          </p>
        </div>

        {/* 저축 금액 입력 */}
        <div style={{ marginBottom: '16px' }}>
          <label className="block text-sm font-medium text-text-secondary" style={{ marginBottom: '8px' }}>
            저축 금액
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-base">₩</span>
            <input
              type="text"
              inputMode="numeric"
              value={amount ? formatNumber(parseInt(amount, 10)) : ''}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/[^0-9]/g, '');
                const maxAmount = 100000000000000;
                if (numericValue === '' || parseInt(numericValue, 10) <= maxAmount) {
                  setAmount(numericValue);
                  if (numericValue && parseInt(numericValue, 10) > 0) setAmountError('');
                }
              }}
              placeholder="0"
              className={`w-full bg-bg-secondary border rounded-[12px] text-right text-lg text-text-primary focus:outline-none focus:border-accent-mint transition-colors ${
                amountError ? 'border-accent-coral' : 'border-[var(--border)]'
              }`}
              style={{ padding: '14px 16px', paddingLeft: '32px' }}
            />
          </div>
          {amountError && <p className="text-xs text-accent-coral" style={{ marginTop: '6px' }}>{amountError}</p>}
        </div>

        {/* 빠른 금액 버튼 */}
        <div style={{ marginBottom: '20px' }}>
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((quickAmount) => (
              <button
                key={quickAmount}
                type="button"
                onClick={() => handleQuickAmount(quickAmount)}
                className="bg-bg-secondary text-text-secondary rounded-[8px] text-xs hover:bg-bg-card-hover transition-colors cursor-pointer"
                style={{ padding: '8px 12px' }}
              >
                +{formatNumber(quickAmount)}
              </button>
            ))}
            {remainingAmount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setAmount(remainingAmount.toString());
                  setAmountError('');
                }}
                className="bg-accent-mint/20 text-accent-mint rounded-[8px] text-xs hover:bg-accent-mint/30 transition-colors cursor-pointer"
                style={{ padding: '8px 12px' }}
              >
                전액 ({formatNumber(remainingAmount)})
              </button>
            )}
          </div>
        </div>

        {/* 저축 후 예상 */}
        {parseInt(amount || '0', 10) > 0 && (
          <div
            className="bg-bg-secondary rounded-[12px]"
            style={{ padding: '12px', marginBottom: '20px' }}
          >
            <p className="text-xs text-text-muted" style={{ marginBottom: '8px' }}>저축 후 예상</p>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                <span style={{ marginRight: '1px' }}>₩</span>{formatNumber(newAmount)}
              </p>
              <p className="text-sm font-semibold text-accent-mint">{Math.min(newProgress, 100)}%</p>
            </div>
            <div className="w-full h-2 bg-bg-card rounded-full overflow-hidden" style={{ marginTop: '8px' }}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-mint to-accent-blue transition-all duration-300"
                style={{ width: `${Math.min(newProgress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer"
            style={{ padding: '14px' }}
            disabled={isDepositing}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleDeposit}
            disabled={isDepositing || !amount || parseInt(amount, 10) <= 0}
            className="flex-1 bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary rounded-[12px] font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ padding: '14px' }}
          >
            {isDepositing ? '저축 중...' : '저축하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
