'use client';

import { useState } from 'react';
import ModalOverlay from '@/components/modals/ModalOverlay';
import { useToast } from '@/contexts/ToastContext';
import { useBodyScrollLock } from '@/hooks';

interface Props {
  userId: string;
  item: { id: string; name: string };
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export default function EditAssetItemModal({
  userId,
  item,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  const { showToast } = useToast();
  const [name, setName] = useState(item.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useBodyScrollLock(true);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('이름을 입력해주세요', 'error');
      return;
    }
    if (trimmed === item.name) {
      onClose();
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/assets/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: trimmed }),
      });
      const json = await res.json();
      if (!json.success) {
        showToast(json.error ?? '수정 실패', 'error');
        return;
      }
      showToast('수정되었어요', 'success');
      onUpdated();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '수정 실패', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/assets/items/${item.id}?userId=${userId}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!json.success) {
        showToast(json.error ?? '삭제 실패', 'error');
        return;
      }
      showToast('삭제되었어요', 'success');
      onDeleted();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '삭제 실패', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalOverlay
      onClose={onClose}
      title="자산 항목 편집"
      escapeActive={!confirmDelete}
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-text-secondary text-sm mb-2">이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSave();
              }
            }}
            maxLength={30}
            autoFocus
            className="w-full bg-bg-secondary border border-[var(--border)] rounded-lg py-2.5 px-3 text-base focus:outline-none focus:border-accent-blue"
          />
          <p className="text-text-muted text-xs mt-2">
            이름을 바꾸어도 과거 기록은 그대로 유지돼요.
          </p>
        </div>

        <div className="flex justify-between gap-2 pt-2">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={isSubmitting}
              className="text-accent-coral hover:bg-accent-coral/10 rounded-lg py-2 px-4 text-sm cursor-pointer transition-colors"
            >
              삭제
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-text-secondary text-xs">정말 삭제할까요?</span>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="bg-accent-coral text-bg-primary font-semibold rounded-lg py-1.5 px-3 text-xs cursor-pointer hover:opacity-90 transition-opacity"
              >
                삭제
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={isSubmitting}
                className="text-text-secondary text-xs cursor-pointer hover:text-text-primary"
              >
                취소
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-text-secondary hover:text-text-primary bg-bg-secondary hover:bg-bg-card-hover rounded-lg py-2 px-4 text-sm cursor-pointer"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting || !name.trim()}
              className="bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary font-semibold rounded-lg py-2 px-4 text-sm cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}
