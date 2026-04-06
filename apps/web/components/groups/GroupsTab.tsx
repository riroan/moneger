'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { formatNumber } from '@/utils/formatters';
import { useModalStore } from '@/stores';
import TransactionItem from '@/components/transactions/TransactionItem';
import { FaPlus } from 'react-icons/fa';
import { MdFolder, MdFlight, MdHome, MdCelebration, MdWork, MdSchool, MdShoppingBag, MdFavorite, MdEdit, MdDelete } from 'react-icons/md';
import type { TransactionWithCategory } from '@/types';

const AddGroupModal = dynamic(() => import('./AddGroupModal'), { ssr: false });
const EditGroupModal = dynamic(() => import('./EditGroupModal'), { ssr: false });

const MAX_GROUPS = 20;

interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  incomeCount: number;
  expenseCount: number;
  transactionCount: number;
}

interface GroupsTabProps {
  userId: string;
  onDataChange?: () => void;
}

export const GROUP_ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  folder: MdFolder,
  travel: MdFlight,
  home: MdHome,
  celebration: MdCelebration,
  work: MdWork,
  school: MdSchool,
  shopping: MdShoppingBag,
  health: MdFavorite,
};

export default function GroupsTab({ userId, onDataChange }: GroupsTabProps) {
  const router = useRouter();
  const { openEditModal, openSavingsTransactionModal, transactionVersion } = useModalStore();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 데스크톱: 선택된 그룹 상세
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<GroupSummary | null>(null);
  const [detailTransactions, setDetailTransactions] = useState<TransactionWithCategory[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch(`/api/groups?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setGroups(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // 데스크톱에서 그룹 선택 시 상세 로드
  const fetchDetail = useCallback(async (groupId: string) => {
    setIsDetailLoading(true);
    try {
      const [groupRes, txRes] = await Promise.all([
        fetch(`/api/groups/${groupId}?userId=${userId}`),
        fetch(`/api/transactions?userId=${userId}&groupId=${groupId}&limit=100`),
      ]);

      if (groupRes.ok) {
        const groupData = await groupRes.json();
        setSelectedDetail(groupData.data);
      }

      if (txRes.ok) {
        const txData = await txRes.json();
        setDetailTransactions(txData.data || []);
      }
    } catch {
      setSelectedDetail(null);
      setDetailTransactions([]);
    } finally {
      setIsDetailLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchDetail(selectedGroupId);
    }
  }, [selectedGroupId, fetchDetail]);

  // 거래 변경 시 그룹 데이터 갱신
  useEffect(() => {
    if (transactionVersion > 0) {
      fetchGroups();
      if (selectedGroupId) {
        fetchDetail(selectedGroupId);
      }
    }
  }, [transactionVersion, fetchGroups, fetchDetail, selectedGroupId]);

  // 첫 그룹 자동 선택 (데스크톱)
  useEffect(() => {
    if (isDesktop && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [isDesktop, groups, selectedGroupId]);

  const handleGroupClick = (group: GroupSummary) => {
    if (!isDesktop) {
      // 모바일/태블릿: 토글 (같은 그룹 클릭 시 닫기)
      setSelectedGroupId(selectedGroupId === group.id ? null : group.id);
    } else {
      setSelectedGroupId(group.id);
    }
  };

  const handleAddGroup = async (groupData: { name: string; description?: string; icon?: string; color?: string }) => {
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...groupData }),
      });

      if (response.ok) {
        await fetchGroups();
        onDataChange?.();
      }
    } catch (error) {
      console.error('Failed to add group:', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleEditGroup = async (groupData: { id: string; name: string; description?: string; icon?: string; color?: string }) => {
    try {
      const response = await fetch(`/api/groups/${groupData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...groupData }),
      });

      if (response.ok) {
        await fetchGroups();
        if (selectedGroupId === groupData.id) {
          await fetchDetail(groupData.id);
        }
        onDataChange?.();
      }
    } catch (error) {
      console.error('Failed to update group:', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      const response = await fetch(`/api/groups/${id}?userId=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSelectedGroupId(null);
        setSelectedDetail(null);
        setDetailTransactions([]);
        await fetchGroups();
        onDataChange?.();
      }
    } catch (error) {
      console.error('Failed to delete group:', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleTransactionClick = (tx: TransactionWithCategory) => {
    if (tx.savingsGoalId) {
      openSavingsTransactionModal(tx);
    } else {
      openEditModal(tx);
    }
  };

  const canAddGroup = groups.length < MAX_GROUPS;

  const { totalExpense, totalIncome, totalTransactions, totalIncomeCount, totalExpenseCount } = useMemo(() => ({
    totalExpense: groups.reduce((sum, g) => sum + g.totalExpense, 0),
    totalIncome: groups.reduce((sum, g) => sum + g.totalIncome, 0),
    totalTransactions: groups.reduce((sum, g) => sum + g.transactionCount, 0),
    totalIncomeCount: groups.reduce((sum, g) => sum + g.incomeCount, 0),
    totalExpenseCount: groups.reduce((sum, g) => sum + g.expenseCount, 0),
  }), [groups]);

  const getIconComponent = useCallback((iconName: string | null) => {
    return GROUP_ICON_MAP[iconName || 'folder'] || MdFolder;
  }, []);

  const selectedGroup = useMemo(() => groups.find((g) => g.id === selectedGroupId), [groups, selectedGroupId]);

  return (
    <div className="animate-[fadeIn_0.5s_ease-out]">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-5">
          <p className="text-xs sm:text-sm text-text-secondary mb-1.5">그룹 수</p>
          <p className="text-2xl sm:text-3xl font-bold text-text-primary">
            {groups.length}<span className="text-base sm:text-lg text-text-muted font-normal">개</span>
          </p>
          <p className="text-xs text-text-muted mt-1">
            총 {totalTransactions}건의 거래
          </p>
        </div>

        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-5">
          <p className="text-xs sm:text-sm text-text-secondary mb-1.5">총 수입</p>
          <p className="text-2xl sm:text-3xl font-bold text-[#4ADE80]">
            <span className="mr-0.5">₩</span>{formatNumber(totalIncome)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {totalIncomeCount}건
          </p>
        </div>

        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-5">
          <p className="text-xs sm:text-sm text-text-secondary mb-1.5">총 지출</p>
          <p className="text-2xl sm:text-3xl font-bold text-[#F87171]">
            <span className="mr-0.5">₩</span>{formatNumber(totalExpense)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {totalExpenseCount}건
          </p>
        </div>

        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-5">
          <p className="text-xs sm:text-sm text-text-secondary mb-1.5">잔액</p>
          <p className={`text-2xl sm:text-3xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>
            {totalIncome - totalExpense >= 0 ? '+' : '-'}<span className="mr-0.5">₩</span>{formatNumber(Math.abs(totalIncome - totalExpense))}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {totalTransactions}건
          </p>
        </div>
      </div>

      {/* 마스터-디테일 레이아웃 (데스크톱) / 목록만 (모바일) */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        {/* 왼쪽: 그룹 목록 */}
        <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <MdFolder className="text-lg sm:text-xl text-[#818CF8]" /> 거래 그룹
              <span className="text-xs sm:text-sm text-text-muted font-normal">({groups.length}/{MAX_GROUPS})</span>
            </h2>
            {canAddGroup ? (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs sm:text-sm text-text-muted hover:text-text-secondary transition-colors cursor-pointer flex items-center gap-1"
              >
                <FaPlus className="text-xs" /> 추가
              </button>
            ) : (
              <span className="text-xs sm:text-sm text-text-muted">최대</span>
            )}
          </div>

          {isLoading ? (
            <div className="text-center text-text-muted py-8 text-sm">로딩 중...</div>
          ) : groups.length > 0 ? (
            <div className="flex flex-col gap-2">
              {groups.map((group) => {
                const IconComponent = getIconComponent(group.icon);
                const isSelected = selectedGroupId === group.id;
                const isAccordionExpanded = !isDesktop && isSelected;
                return (
                  <div key={group.id}>
                    <div
                      className={`rounded-[12px] cursor-pointer transition-all p-3 ${
                        isSelected
                          ? 'bg-accent-blue/10 border border-accent-blue/30'
                          : 'bg-bg-secondary hover:bg-bg-card-hover border border-transparent'
                      }`}
                      onClick={() => handleGroupClick(group)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: group.color ? `${group.color}20` : 'rgba(99, 102, 241, 0.15)' }}
                        >
                          <IconComponent className="text-base" style={{ color: group.color || '#6366F1' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">{group.name}</p>
                          <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                            <span className={group.netAmount >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}>{group.netAmount >= 0 ? '+' : '-'}₩{formatNumber(Math.abs(group.netAmount))}</span>
                            <span>·</span>
                            <span>{group.transactionCount}건</span>
                          </div>
                        </div>
                        {!isDesktop && (
                          <svg
                            width="16" height="16" viewBox="0 0 16 16" fill="none"
                            className={`text-text-muted transition-transform flex-shrink-0 ${isAccordionExpanded ? 'rotate-180' : ''}`}
                          >
                            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* 모바일 아코디언 상세 */}
                    {isAccordionExpanded && (
                      <div className="mt-2 animate-[fadeIn_0.2s_ease-out]">
                        {/* 요약 */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-bg-secondary rounded-[10px] p-2.5 text-center">
                            <p className="text-[10px] text-text-muted mb-0.5">수입</p>
                            <p className="text-xs font-bold text-[#4ADE80]">₩{formatNumber(group.totalIncome)}</p>
                          </div>
                          <div className="bg-bg-secondary rounded-[10px] p-2.5 text-center">
                            <p className="text-[10px] text-text-muted mb-0.5">지출</p>
                            <p className="text-xs font-bold text-[#F87171]">₩{formatNumber(group.totalExpense)}</p>
                          </div>
                          <div className="bg-bg-secondary rounded-[10px] p-2.5 text-center">
                            <p className="text-[10px] text-text-muted mb-0.5">합계</p>
                            <p className={`text-xs font-bold ${group.netAmount >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>
                              {group.netAmount >= 0 ? '+' : '-'}₩{formatNumber(Math.abs(group.netAmount))}
                            </p>
                          </div>
                        </div>

                        {/* 거래 내역 */}
                        <div className="bg-bg-secondary rounded-[10px] p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-text-secondary">거래 내역 ({group.transactionCount}건)</p>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsEditModalOpen(true);
                                }}
                                className="text-text-muted hover:text-text-secondary cursor-pointer"
                              >
                                <MdEdit className="text-sm" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteConfirm(true);
                                }}
                                className="text-red-400 hover:text-red-300 cursor-pointer"
                              >
                                <MdDelete className="text-sm" />
                              </button>
                            </div>
                          </div>
                          {showDeleteConfirm && selectedGroupId === group.id && (
                            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg mb-2">
                              <p className="text-[10px] text-red-400 mb-2">그룹을 삭제하면 거래의 그룹 연결이 해제됩니다.</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                                  className="flex-1 py-1.5 rounded-md bg-bg-card text-text-secondary text-[10px] cursor-pointer"
                                >
                                  취소
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteGroup(group.id);
                                    setShowDeleteConfirm(false);
                                  }}
                                  className="flex-1 py-1.5 rounded-md bg-red-500 text-white text-[10px] cursor-pointer"
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          )}
                          {isDetailLoading ? (
                            <div className="text-center text-text-muted py-4 text-xs">로딩 중...</div>
                          ) : detailTransactions.length > 0 ? (
                            <div className="flex flex-col gap-1.5">
                              {detailTransactions.slice(0, 5).map((tx) => (
                                <TransactionItem
                                  key={tx.id}
                                  transaction={tx}
                                  onClick={() => handleTransactionClick(tx)}
                                />
                              ))}
                              {detailTransactions.length > 5 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/groups/${group.id}`);
                                  }}
                                  className="text-xs text-text-muted hover:text-text-secondary text-center py-2 cursor-pointer"
                                >
                                  전체 {group.transactionCount}건 보기 →
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="text-center text-text-muted py-4 text-xs">
                              연결된 거래가 없습니다
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-text-muted py-12">
              <MdFolder className="text-4xl mx-auto mb-2 opacity-50" />
              <p className="text-sm">아직 그룹이 없습니다</p>
              <p className="text-xs mt-1">여행, 이사 등 특별한 지출을<br />그룹으로 관리해보세요</p>
            </div>
          )}
        </div>

        {/* 오른쪽: 선택된 그룹 상세 (데스크톱만) */}
        {isDesktop && (
          <div className="hidden lg:block">
            {selectedDetail ? (
              <div className="flex flex-col gap-4">
                {/* 그룹 헤더 */}
                <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
                  <div className="flex items-center gap-3 mb-4">
                    {(() => {
                      const IconComponent = getIconComponent(selectedDetail.icon);
                      return (
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: selectedDetail.color ? `${selectedDetail.color}20` : 'rgba(99, 102, 241, 0.15)' }}
                        >
                          <IconComponent className="text-xl" style={{ color: selectedDetail.color || '#6366F1' }} />
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-text-primary truncate">{selectedDetail.name}</h2>
                      {selectedDetail.description && (
                        <p className="text-xs text-text-muted truncate">{selectedDetail.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="w-9 h-9 rounded-xl bg-bg-secondary flex items-center justify-center cursor-pointer hover:bg-bg-card-hover transition-colors"
                      >
                        <MdEdit className="text-lg text-text-secondary" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-9 h-9 rounded-xl bg-bg-secondary flex items-center justify-center cursor-pointer hover:bg-red-500/20 transition-colors"
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
                          onClick={() => {
                            handleDeleteGroup(selectedDetail.id);
                            setShowDeleteConfirm(false);
                          }}
                          className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs cursor-pointer"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 요약 */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-bg-secondary rounded-[12px] p-3">
                      <p className="text-xs text-text-muted mb-1">수입</p>
                      <p className="text-base font-bold text-[#4ADE80]">₩{formatNumber(selectedDetail.totalIncome)}</p>
                    </div>
                    <div className="bg-bg-secondary rounded-[12px] p-3">
                      <p className="text-xs text-text-muted mb-1">지출</p>
                      <p className="text-base font-bold text-[#F87171]">₩{formatNumber(selectedDetail.totalExpense)}</p>
                    </div>
                    <div className="bg-bg-secondary rounded-[12px] p-3">
                      <p className="text-xs text-text-muted mb-1">합계</p>
                      <p className={`text-base font-bold ${selectedDetail.netAmount >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>
                        {selectedDetail.netAmount >= 0 ? '+' : '-'}₩{formatNumber(Math.abs(selectedDetail.netAmount))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 거래 내역 */}
                <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
                  <h3 className="text-base font-semibold mb-4">
                    거래 내역 <span className="text-text-muted font-normal text-sm">({selectedDetail.transactionCount}건)</span>
                  </h3>

                  {isDetailLoading ? (
                    <div className="text-center text-text-muted py-8 text-sm">로딩 중...</div>
                  ) : detailTransactions.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {detailTransactions.map((tx) => (
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
            ) : groups.length > 0 ? (
              <div className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4 flex items-center justify-center min-h-[300px]">
                <p className="text-text-muted text-sm">왼쪽에서 그룹을 선택하세요</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 모달 */}
      {isAddModalOpen && (
        <AddGroupModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddGroup}
        />
      )}

      {isEditModalOpen && selectedGroup && (
        <EditGroupModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onEdit={handleEditGroup}
          onDelete={handleDeleteGroup}
          group={selectedGroup}
        />
      )}
    </div>
  );
}
