'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { MdAccountBalanceWallet, MdAdd, MdLock, MdMoreVert } from 'react-icons/md';
import type { AssetReport, AssetReportRow } from '@/lib/services/asset.service';
import { useToast } from '@/contexts/ToastContext';
import { useOutsideClickWithRef } from '@/hooks';
import { formatNumber } from '@/utils/formatters';

const AddAssetItemModal = dynamic(() => import('./AddAssetItemModal'), { ssr: false });
const EditAssetItemModal = dynamic(() => import('./EditAssetItemModal'), { ssr: false });

interface AssetsTabProps {
  userId: string;
}

function currentMonthKey(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function shiftMonthKey(key: string, deltaMonths: number): string {
  const [yStr, mStr] = key.split('-');
  const date = new Date(Date.UTC(parseInt(yStr, 10), parseInt(mStr, 10) - 1 + deltaMonths, 1));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatMonthLabel(key: string): string {
  const [, mStr] = key.split('-');
  return `${parseInt(mStr, 10)}월`;
}

function deltaClass(delta: number | null): string {
  if (delta === null) return 'text-text-muted';
  if (delta > 0) return 'text-accent-mint';
  if (delta < 0) return 'text-accent-coral';
  return 'text-text-muted';
}

function deltaText(delta: number | null): string {
  if (delta === null) return '—';
  if (delta === 0) return '0';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatNumber(Math.round(delta))}`;
}

export default function AssetsTab({ userId }: AssetsTabProps) {
  const { showToast } = useToast();
  const [endMonthKey, setEndMonthKey] = useState<string>(() => currentMonthKey());
  const [report, setReport] = useState<AssetReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; name: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [editingCell, setEditingCell] = useState<{ itemId: string; month: string } | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/assets/report?userId=${userId}&month=${endMonthKey}&range=5`
      );
      const json = await res.json();
      if (json.success) {
        setReport(json.data as AssetReport);
      } else {
        showToast(json.error ?? '불러오기 실패', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '불러오기 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [userId, endMonthKey, showToast]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const isCurrentWindow = useMemo(() => {
    return endMonthKey >= currentMonthKey();
  }, [endMonthKey]);

  const handleShiftWindow = (delta: number) => {
    const next = shiftMonthKey(endMonthKey, delta);
    if (delta > 0 && next > currentMonthKey()) return;
    setEndMonthKey(next);
  };

  const startEditCell = (row: AssetReportRow, month: string) => {
    if (row.kind !== 'user_defined') return;
    const idx = report?.months.indexOf(month);
    const value = idx !== undefined && idx >= 0 ? row.values[idx] : null;
    setEditingCell({ itemId: row.assetItemId, month });
    setDraftValue(value !== null && value !== undefined ? String(Math.round(value)) : '');
  };

  const cancelEditCell = () => {
    setEditingCell(null);
    setDraftValue('');
  };

  const saveEditCell = async () => {
    if (!editingCell) return;
    const raw = draftValue.replace(/,/g, '').trim();
    if (raw === '') {
      cancelEditCell();
      return;
    }
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) {
      showToast('0 이상 숫자를 입력해주세요', 'error');
      return;
    }

    const monthKey = editingCell.month;
    const isPast = monthKey < currentMonthKey();
    if (isPast) {
      const ok = window.confirm(`지난 ${formatMonthLabel(monthKey)} 데이터를 변경하시겠습니까?`);
      if (!ok) {
        cancelEditCell();
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/assets/snapshots', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          assetItemId: editingCell.itemId,
          month: monthKey,
          amount: num,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        showToast(json.error ?? '저장 실패', 'error');
        return;
      }
      cancelEditCell();
      await fetchReport();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '저장 실패', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCreated = async () => {
    setIsAddOpen(false);
    await fetchReport();
  };

  const handleItemUpdated = async () => {
    setEditingItem(null);
    await fetchReport();
  };

  const handleItemDeleted = async () => {
    setEditingItem(null);
    await fetchReport();
  };

  if (isLoading && !report) {
    return <div className="text-text-muted text-sm py-8 text-center">불러오는 중...</div>;
  }
  if (!report) return null;

  const months = report.months;
  const totalActiveItems = report.rows.filter((r) => r.kind === 'user_defined').length;
  const hasAnyContent = report.rows.length > 0;

  const totalRow = months.map((_, colIdx) =>
    report.rows.reduce((sum, r) => sum + (r.values[colIdx] ?? 0), 0)
  );
  const totalDelta =
    totalRow.length >= 2 ? totalRow[totalRow.length - 1] - totalRow[totalRow.length - 2] : null;

  return (
    <div className="flex flex-col gap-4 animate-[fadeIn_0.5s_ease-out]">
      <section className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4">
        <header className="flex items-center justify-between mb-3">
          <h1 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <MdAccountBalanceWallet className="text-accent-blue text-xl" />
            자산 리포트
          </h1>
          <div className="flex items-center gap-1 select-none">
            <button
              onClick={() => handleShiftWindow(-1)}
              className="text-text-secondary hover:text-text-primary transition-colors text-lg px-2 py-1 cursor-pointer"
              aria-label="이전 월"
            >
              ◀
            </button>
            <span className="text-sm font-medium min-w-[110px] text-center">
              {months.length > 0
                ? `${months[0]} ~ ${months[months.length - 1]}`
                : endMonthKey}
            </span>
            <button
              onClick={() => handleShiftWindow(1)}
              disabled={isCurrentWindow}
              className="text-text-secondary hover:text-text-primary transition-colors text-lg px-2 py-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="다음 월"
            >
              ▶
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-bg-secondary rounded-lg p-3">
            <div className="text-text-muted text-xs mb-1">{formatMonthLabel(months[months.length - 1])} 총자산</div>
            <div className="tabular-nums text-text-primary text-lg sm:text-xl">
              ₩{formatNumber(Math.round(report.summary.currentTotal))}
            </div>
          </div>
          <div className="bg-bg-secondary rounded-lg p-3">
            <div className="text-text-muted text-xs mb-1">전월 대비 변화</div>
            <div className={`tabular-nums text-lg sm:text-xl ${deltaClass(report.summary.totalMomDelta)}`}>
              {deltaText(report.summary.totalMomDelta)}
            </div>
          </div>
          <div className="bg-bg-secondary rounded-lg p-3">
            <div className="text-text-muted text-xs mb-1">변화율</div>
            <div className={`tabular-nums text-lg sm:text-xl ${deltaClass(report.summary.totalMomPercent)}`}>
              {report.summary.totalMomPercent === null
                ? '—'
                : `${report.summary.totalMomPercent > 0 ? '+' : ''}${report.summary.totalMomPercent.toFixed(1)}%`}
            </div>
          </div>
        </div>
      </section>

      {!hasAnyContent ? (
        <section className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-8 text-center">
          <p className="text-text-secondary text-sm mb-4">
            아직 자산 항목이 없어요. 자주 사용하는 항목으로 시작해보세요.
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1 bg-gradient-to-br from-accent-mint to-accent-blue text-bg-primary font-semibold rounded-lg py-2 px-4 text-sm cursor-pointer hover:opacity-90 transition-opacity"
          >
            <MdAdd /> 첫 항목 추가
          </button>
        </section>
      ) : (
        <section className="bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-text-muted text-xs">
                <th className="text-left font-medium py-2 px-2 sticky left-0 bg-bg-card z-10 min-w-[120px]">항목</th>
                {months.map((m) => (
                  <th key={m} className="text-right font-medium py-2 px-2 tabular-nums">
                    {formatMonthLabel(m)}
                  </th>
                ))}
                <th className="text-right font-medium py-2 px-2">전월 대비</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <AssetRowView
                  key={row.kind === 'user_defined' ? row.assetItemId : row.kind}
                  row={row}
                  months={months}
                  editingCell={editingCell}
                  draftValue={draftValue}
                  setDraftValue={setDraftValue}
                  onStartEdit={startEditCell}
                  onCancelEdit={cancelEditCell}
                  onSaveEdit={saveEditCell}
                  isSaving={isSaving}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  onMenuEdit={(item) => {
                    setOpenMenuId(null);
                    setEditingItem(item);
                  }}
                />
              ))}
              <tr className="border-t border-[var(--border)] font-semibold">
                <td className="py-2 px-2 sticky left-0 bg-bg-card z-10">합계</td>
                {totalRow.map((v, i) => (
                  <td key={i} className="text-right py-2 px-2 tabular-nums">
                    ₩{formatNumber(Math.round(v))}
                  </td>
                ))}
                <td className={`text-right py-2 px-2 tabular-nums ${deltaClass(totalDelta)}`}>
                  {deltaText(totalDelta)}
                </td>
                <td />
              </tr>
            </tbody>
          </table>

          <div className="flex justify-end mt-4">
            <button
              onClick={() => setIsAddOpen(true)}
              disabled={totalActiveItems >= 30}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary bg-bg-secondary hover:bg-bg-card-hover rounded-lg transition-colors py-1.5 px-2.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <MdAdd /> 자산 항목 추가
            </button>
          </div>
        </section>
      )}

      {isAddOpen && (
        <AddAssetItemModal
          userId={userId}
          onClose={() => setIsAddOpen(false)}
          onCreated={handleAddCreated}
        />
      )}

      {editingItem && (
        <EditAssetItemModal
          userId={userId}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onUpdated={handleItemUpdated}
          onDeleted={handleItemDeleted}
        />
      )}
    </div>
  );
}

interface AssetRowViewProps {
  row: AssetReportRow;
  months: string[];
  editingCell: { itemId: string; month: string } | null;
  draftValue: string;
  setDraftValue: (v: string) => void;
  onStartEdit: (row: AssetReportRow, month: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  isSaving: boolean;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onMenuEdit: (item: { id: string; name: string }) => void;
}

function AssetRowView({
  row,
  months,
  editingCell,
  draftValue,
  setDraftValue,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  isSaving,
  openMenuId,
  setOpenMenuId,
  onMenuEdit,
}: AssetRowViewProps) {
  const rowKey =
    row.kind === 'user_defined' ? row.assetItemId : row.kind;
  const isMenuOpen = openMenuId === rowKey;
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closeMenu = useCallback(() => setOpenMenuId(null), [setOpenMenuId]);
  useOutsideClickWithRef<HTMLDivElement>(menuRef, closeMenu, isMenuOpen);
  return (
    <tr className="border-t border-[var(--border)]">
      <td className="py-2 px-2 sticky left-0 bg-bg-card z-10">
        <div className="flex items-center gap-1.5">
          {row.locked && <MdLock className="text-text-muted text-sm" aria-label="자동 계산" />}
          <span className={row.locked ? 'text-text-secondary' : 'text-text-primary'}>{row.name}</span>
        </div>
      </td>
      {months.map((m, idx) => {
        const value = row.values[idx];
        const isEditing =
          row.kind === 'user_defined' &&
          editingCell?.itemId === row.assetItemId &&
          editingCell?.month === m;
        return (
          <td key={m} className="text-right py-1 px-2 tabular-nums">
            {isEditing ? (
              <input
                autoFocus
                inputMode="numeric"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                onBlur={onSaveEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onSaveEdit();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancelEdit();
                  }
                }}
                disabled={isSaving}
                className="w-full text-right bg-bg-secondary border border-accent-blue/40 rounded px-2 py-1 text-base focus:outline-none focus:border-accent-blue"
              />
            ) : (
              <button
                type="button"
                onClick={() => onStartEdit(row, m)}
                disabled={row.locked}
                className={`w-full text-right py-1 px-2 rounded ${
                  row.locked
                    ? 'cursor-default'
                    : 'hover:bg-bg-secondary cursor-pointer'
                } ${value === null ? 'text-text-muted' : 'text-text-primary'}`}
              >
                {value === null ? '—' : `₩${formatNumber(Math.round(value))}`}
              </button>
            )}
          </td>
        );
      })}
      <td className={`text-right py-2 px-2 tabular-nums ${deltaClass(row.momDelta)}`}>
        {deltaText(row.momDelta)}
      </td>
      <td className="py-2 px-1 relative">
        {row.kind === 'user_defined' && (
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setOpenMenuId(isMenuOpen ? null : rowKey)}
              className="text-text-muted hover:text-text-primary p-1 cursor-pointer"
              aria-label={`${row.name} 메뉴`}
            >
              <MdMoreVert />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-bg-card border border-[var(--border)] rounded-lg shadow-2xl z-20 min-w-[120px]">
                <button
                  onClick={() => onMenuEdit({ id: row.assetItemId, name: row.name })}
                  className="block w-full text-left text-sm py-2 px-3 hover:bg-bg-card-hover cursor-pointer"
                >
                  이름/삭제
                </button>
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
