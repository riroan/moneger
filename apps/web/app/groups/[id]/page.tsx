'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useModalStore } from '@/stores';
import MainLayout from '@/components/layout/MainLayout';
import TransactionItem from '@/components/transactions/TransactionItem';
import { formatNumber } from '@/utils/formatters';
import { MdArrowBack, MdEdit, MdDelete, MdFolder, MdFlight, MdHome, MdCelebration, MdWork, MdSchool, MdShoppingBag, MdFavorite } from 'react-icons/md';
import dynamic from 'next/dynamic';
import type { TransactionWithCategory } from '@/types';

const EditGroupModal = dynamic(() => import('@/components/groups/EditGroupModal'), { ssr: false });

const GROUP_ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  folder: MdFolder,
  travel: MdFlight,
  home: MdHome,
  celebration: MdCelebration,
  work: MdWork,
  school: MdSchool,
  shopping: MdShoppingBag,
  health: MdFavorite,
};

interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  transactionCount: number;
}

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { userId, isLoading: isAuthLoading, initAuth } = useAuthStore();
  const { openEditModal, openSavingsTransactionModal, transactionVersion } = useModalStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    initAuth();
    setIsInitialized(true);
  }, [initAuth]);

  const fetchGroupDetail = useCallback(async () => {
    if (!userId) return;
    try {
      const [groupRes, txRes] = await Promise.all([
        fetch(`/api/groups/${id}?userId=${userId}`),
        fetch(`/api/transactions?userId=${userId}&groupId=${id}&limit=100`),
      ]);

      if (groupRes.ok) {
        const groupData = await groupRes.json();
        setGroup(groupData.data);
      } else {
        router.push('/groups');
        return;
      }

      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.data || []);
      }
    } catch {
      router.push('/groups');
    } finally {
      setIsLoading(false);
    }
  }, [userId, id, router]);

  useEffect(() => {
    if (userId) fetchGroupDetail();
  }, [userId, fetchGroupDetail]);

  // 거래 변경 시 데이터 갱신
  useEffect(() => {
    if (transactionVersion > 0 && userId) {
      fetchGroupDetail();
    }
  }, [transactionVersion, userId, fetchGroupDetail]);

  const handleTransactionClick = (tx: TransactionWithCategory) => {
    if (tx.savingsGoalId) {
      openSavingsTransactionModal(tx);
    } else {
      openEditModal(tx);
    }
  };

  const handleEditGroup = async (groupData: { id: string; name: string; description?: string; icon?: string; color?: string }) => {
    if (!userId) return;
    const response = await fetch(`/api/groups/${groupData.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...groupData }),
    });
    if (response.ok) {
      await fetchGroupDetail();
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!userId) return;
    const response = await fetch(`/api/groups/${groupId}?userId=${userId}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      router.push('/groups');
    }
  };

  useEffect(() => {
    if (isInitialized && !isAuthLoading && !userId) {
      router.push('/');
    }
  }, [isInitialized, isAuthLoading, userId, router]);

  if (!isInitialized || isAuthLoading || !userId) {
    return null;
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="text-center text-text-muted py-20">로딩 중...</div>
      </MainLayout>
    );
  }

  if (!group) {
    return (
      <MainLayout>
        <div className="text-center text-text-muted py-20">그룹을 찾을 수 없습니다</div>
      </MainLayout>
    );
  }

  const IconComponent = GROUP_ICON_MAP[group.icon || 'folder'] || MdFolder;

  return (
    <MainLayout>
      <div className="animate-[fadeIn_0.5s_ease-out]">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push('/groups')}
            className="w-9 h-9 rounded-xl bg-bg-card border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-bg-card-hover transition-colors"
          >
            <MdArrowBack className="text-lg text-text-secondary" />
          </button>

          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: group.color ? `${group.color}20` : 'rgba(99, 102, 241, 0.15)' }}
          >
            <IconComponent className="text-xl" style={{ color: group.color || '#6366F1' }} />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-text-primary truncate">{group.name}</h1>
            {group.description && (
              <p className="text-xs text-text-muted truncate">{group.description}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="w-9 h-9 rounded-xl bg-bg-card border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-bg-card-hover transition-colors"
            >
              <MdEdit className="text-lg text-text-secondary" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-9 h-9 rounded-xl bg-bg-card border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-red-500/20 transition-colors"
            >
              <MdDelete className="text-lg text-red-400" />
            </button>
          </div>
        </div>

        {/* 삭제 확인 */}
        {showDeleteConfirm && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
            <p className="text-xs text-red-400 mb-2">
              그룹을 삭제하면 거래의 그룹 연결이 해제됩니다. (거래 자체는 삭제되지 않습니다)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-bg-secondary text-text-secondary text-xs cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={() => handleDeleteGroup(group.id)}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs cursor-pointer"
              >
                삭제
              </button>
            </div>
          </div>
        )}

        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-bg-card border border-[var(--border)] rounded-[16px] p-4">
            <p className="text-xs text-text-muted mb-1">수입</p>
            <p className="text-lg sm:text-xl font-bold text-[#4ADE80]">
              ₩{formatNumber(group.totalIncome)}
            </p>
          </div>
          <div className="bg-bg-card border border-[var(--border)] rounded-[16px] p-4">
            <p className="text-xs text-text-muted mb-1">지출</p>
            <p className="text-lg sm:text-xl font-bold text-[#F87171]">
              ₩{formatNumber(group.totalExpense)}
            </p>
          </div>
          <div className="bg-bg-card border border-[var(--border)] rounded-[16px] p-4">
            <p className="text-xs text-text-muted mb-1">합계</p>
            <p className={`text-lg sm:text-xl font-bold ${group.netAmount >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>
              {group.netAmount >= 0 ? '+' : '-'}₩{formatNumber(Math.abs(group.netAmount))}
            </p>
          </div>
        </div>

        {/* 거래 내역 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
          <h2 className="text-base sm:text-lg font-semibold mb-4">
            거래 내역 <span className="text-text-muted font-normal text-sm">({group.transactionCount}건)</span>
          </h2>

          {transactions.length > 0 ? (
            <div className="flex flex-col gap-2">
              {transactions.map((tx) => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  onClick={() => handleTransactionClick(tx)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-text-muted py-8 text-sm">
              이 그룹에 연결된 거래가 없습니다
            </div>
          )}
        </div>
      </div>

      {/* 수정 모달 */}
      {isEditModalOpen && group && (
        <EditGroupModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onEdit={handleEditGroup}
          onDelete={handleDeleteGroup}
          group={group}
        />
      )}
    </MainLayout>
  );
}
