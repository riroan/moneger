'use client';

import { useState } from 'react';

interface AccountTabProps {
  userName: string;
  userEmail: string;
  userId: string;
  onDeleteAccountOpen: () => void;
}

export default function AccountTab({ userName, userEmail, userId, onDeleteAccountOpen }: AccountTabProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!userId) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('모든 필드를 입력해주세요');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('새 비밀번호는 최소 6자 이상이어야 합니다');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '비밀번호 변경에 실패했습니다');
      }

      setPasswordSuccess('비밀번호가 변경되었습니다');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : '비밀번호 변경에 실패했습니다');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-1.5">
        계정
      </h1>
      <p className="text-sm sm:text-base text-text-secondary mb-4">
        계정 정보를 확인하고 관리합니다.
      </p>

      <div className="flex flex-col gap-4">
        {/* 프로필 정보 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[14px] sm:rounded-[16px] p-4">
          <h2 className="text-base sm:text-lg font-semibold mb-4">프로필 정보</h2>
          <div className="flex flex-col gap-5">
            <div>
              <div className="text-sm text-text-muted mb-1.5">이름</div>
              <div className="text-base text-text-primary font-medium">{userName || '이름 없음'}</div>
            </div>
            <div className="border-t border-[var(--border)]" />
            <div>
              <div className="text-sm text-text-muted mb-1.5">이메일</div>
              <div className="text-base text-text-primary font-medium">{userEmail}</div>
            </div>
          </div>
        </div>

        {/* 비밀번호 변경 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[14px] sm:rounded-[16px] p-4">
          <h2 className="text-base sm:text-lg font-semibold mb-4">비밀번호 변경</h2>
          <form onSubmit={handleChangePassword}>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-text-muted mb-2">
                  현재 비밀번호
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  className="w-full bg-bg-secondary border border-[var(--border)] rounded-[10px] text-text-primary text-sm sm:text-base focus:outline-none focus:border-accent-blue transition-colors py-2.5 px-3"
                  placeholder="현재 비밀번호 입력"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-2">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  className="w-full bg-bg-secondary border border-[var(--border)] rounded-[10px] text-text-primary text-sm sm:text-base focus:outline-none focus:border-accent-blue transition-colors py-2.5 px-3"
                  placeholder="새 비밀번호 입력 (6자 이상)"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-2">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  className="w-full bg-bg-secondary border border-[var(--border)] rounded-[10px] text-text-primary text-sm sm:text-base focus:outline-none focus:border-accent-blue transition-colors py-2.5 px-3"
                  placeholder="새 비밀번호 다시 입력"
                />
              </div>
              {passwordError && (
                <p className="text-accent-coral text-sm">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-accent-mint text-sm">{passwordSuccess}</p>
              )}
              <div className="mt-1">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full sm:w-auto bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary rounded-[10px] font-medium text-sm sm:text-base hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed py-3 px-6"
                >
                  {isChangingPassword ? '변경 중...' : '비밀번호 변경'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* 계정 삭제 */}
        <div className="bg-bg-card border border-accent-coral/30 rounded-[14px] sm:rounded-[16px] p-4">
          <h2 className="text-base sm:text-lg font-semibold text-accent-coral mb-1.5">계정 삭제</h2>
          <p className="text-xs sm:text-sm text-text-secondary mb-4">
            계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <button
            onClick={onDeleteAccountOpen}
            className="w-full sm:w-auto bg-accent-coral text-white rounded-[10px] font-medium text-sm sm:text-base hover:shadow-lg transition-all cursor-pointer py-3 px-6"
          >
            계정 삭제
          </button>
        </div>
      </div>
    </div>
  );
}
