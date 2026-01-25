'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteAccountModalProps {
  isOpen: boolean;
  userId: string;
  onClose: () => void;
}

export default function DeleteAccountModal({ isOpen, userId, onClose }: DeleteAccountModalProps) {
  const router = useRouter();
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    if (!userId) return;

    if (!deletePassword) {
      setDeleteError('비밀번호를 입력해주세요');
      return;
    }

    setIsDeletingAccount(true);
    setDeleteError('');

    try {
      const response = await fetch('/api/auth/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          password: deletePassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '계정 삭제에 실패했습니다');
      }

      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      router.push('/login');
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : '계정 삭제에 실패했습니다');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleClose = () => {
    setDeletePassword('');
    setDeleteError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[300] animate-[fadeIn_0.2s_ease-out]"
      onClick={handleClose}
    >
      <div
        className="bg-bg-card border border-accent-coral/50 rounded-[24px] w-full max-w-md animate-[fadeInUp_0.3s_ease-out] p-8 m-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-2xl font-bold text-accent-coral">계정 삭제</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-text-secondary hover:text-text-primary transition-colors text-2xl w-8 h-8 flex items-center justify-center cursor-pointer"
          >
            ×
          </button>
        </div>
        <p className="text-text-secondary mb-6">
          정말로 계정을 삭제하시겠습니까?<br />
          모든 데이터가 영구적으로 삭제되며, 이 작업은 되돌릴 수 없습니다.
        </p>

        <div className="mb-5">
          <label className="block text-sm text-text-muted mb-2">
            비밀번호 확인
          </label>
          <input
            type="password"
            value={deletePassword}
            onChange={(e) => {
              setDeletePassword(e.target.value);
              setDeleteError('');
            }}
            className="w-full bg-bg-secondary border border-[var(--border)] rounded-[10px] text-text-primary focus:outline-none focus:border-accent-coral transition-colors py-3 px-3.5"
            placeholder="비밀번호를 입력하세요"
          />
          {deleteError && (
            <p className="text-accent-coral text-sm mt-2">{deleteError}</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 bg-bg-secondary text-text-primary rounded-[12px] font-medium hover:bg-bg-card-hover transition-colors cursor-pointer p-3.5"
            disabled={isDeletingAccount}
          >
            취소
          </button>
          <button
            onClick={handleDeleteAccount}
            disabled={isDeletingAccount || !deletePassword}
            className="flex-1 bg-accent-coral text-white rounded-[12px] font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed p-3.5"
          >
            {isDeletingAccount ? '삭제 중...' : '계정 삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}
