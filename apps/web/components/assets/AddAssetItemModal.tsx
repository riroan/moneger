'use client';

import { useState } from 'react';
import ModalOverlay from '@/components/modals/ModalOverlay';
import { useToast } from '@/contexts/ToastContext';
import { useBodyScrollLock } from '@/hooks';

const PRESETS = ['주식', '적금', '전세금', '코인', '현금', '예금'];

interface Props {
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddAssetItemModal({ userId, onClose, onCreated }: Props) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  useBodyScrollLock(true);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('이름을 입력해주세요', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/assets/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: trimmed }),
      });
      const json = await res.json();
      if (!json.success) {
        showToast(json.error ?? '추가 실패', 'error');
        return;
      }
      showToast('자산 항목이 추가되었어요', 'success');
      onCreated();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '추가 실패', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose} title="자산 항목 추가">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-text-secondary text-sm mb-2">이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            maxLength={30}
            placeholder="예: 토스증권"
            autoFocus
            className="w-full bg-bg-secondary border border-[var(--border)] rounded-lg py-2.5 px-3 text-base focus:outline-none focus:border-accent-blue"
          />
        </div>

        <div>
          <div className="text-text-muted text-xs mb-2">빠른 시작</div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setName(preset)}
                type="button"
                className="text-xs text-text-secondary hover:text-text-primary bg-bg-secondary hover:bg-bg-card-hover rounded-lg transition-colors py-1.5 px-3 cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-text-secondary hover:text-text-primary bg-bg-secondary hover:bg-bg-card-hover rounded-lg py-2 px-4 text-sm cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
            className="bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary font-semibold rounded-lg py-2 px-4 text-sm cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '추가 중…' : '추가'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
