import { prisma } from '@/lib/prisma';
import {
  buildMonthWindow,
  formatMonthKey,
  kstMonthEndUTC,
  ymFromMonthKey,
} from '@/lib/utils/asset-month';

export const MAX_ASSET_ITEMS = 30;
export const ASSET_ITEM_NAME_MAX_LEN = 30;

export type AssetReportRow =
  | {
      kind: 'moneger_balance';
      name: 'Moneger 잔액';
      locked: true;
      values: (number | null)[];
      momDelta: number | null;
    }
  | {
      kind: 'savings_goal';
      name: '적금';
      locked: true;
      values: (number | null)[];
      momDelta: number | null;
    }
  | {
      kind: 'user_defined';
      assetItemId: string;
      name: string;
      icon: string | null;
      order: number;
      locked: false;
      values: (number | null)[];
      momDelta: number | null;
    };

export interface AssetReport {
  months: string[];
  rows: AssetReportRow[];
  summary: {
    currentTotal: number;
    previousTotal: number;
    totalMomDelta: number;
    totalMomPercent: number | null;
  };
}

export async function listAssetItems(userId: string) {
  return prisma.assetItem.findMany({
    where: { userId, deletedAt: null },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function createAssetItem(
  userId: string,
  data: { name: string; icon?: string | null; order?: number }
) {
  const trimmed = data.name.trim();
  if (!trimmed) {
    throw new Error('name is required');
  }
  if (trimmed.length > ASSET_ITEM_NAME_MAX_LEN) {
    throw new Error(`name must be ${ASSET_ITEM_NAME_MAX_LEN} chars or fewer`);
  }

  const activeCount = await prisma.assetItem.count({
    where: { userId, deletedAt: null },
  });
  if (activeCount >= MAX_ASSET_ITEMS) {
    throw new Error(`maximum ${MAX_ASSET_ITEMS} active items reached`);
  }

  const duplicate = await prisma.assetItem.findFirst({
    where: { userId, deletedAt: null, name: trimmed },
  });
  if (duplicate) {
    throw new Error('item with this name already exists');
  }

  const order = data.order ?? activeCount;

  return prisma.assetItem.create({
    data: {
      userId,
      name: trimmed,
      icon: data.icon ?? null,
      order,
    },
  });
}

export async function updateAssetItem(
  itemId: string,
  userId: string,
  data: { name?: string; icon?: string | null; order?: number }
) {
  const existing = await prisma.assetItem.findFirst({
    where: { id: itemId, userId, deletedAt: null },
  });
  if (!existing) throw new Error('not found');

  const updates: { name?: string; icon?: string | null; order?: number } = {};

  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (!trimmed) throw new Error('name is required');
    if (trimmed.length > ASSET_ITEM_NAME_MAX_LEN) {
      throw new Error(`name must be ${ASSET_ITEM_NAME_MAX_LEN} chars or fewer`);
    }
    if (trimmed !== existing.name) {
      const duplicate = await prisma.assetItem.findFirst({
        where: { userId, deletedAt: null, name: trimmed, id: { not: itemId } },
      });
      if (duplicate) throw new Error('item with this name already exists');
    }
    updates.name = trimmed;
  }
  if (data.icon !== undefined) updates.icon = data.icon;
  if (data.order !== undefined) updates.order = data.order;

  return prisma.assetItem.update({
    where: { id: itemId },
    data: updates,
  });
}

export async function softDeleteAssetItem(itemId: string, userId: string) {
  const existing = await prisma.assetItem.findFirst({
    where: { id: itemId, userId, deletedAt: null },
  });
  if (!existing) throw new Error('not found');
  return prisma.assetItem.update({
    where: { id: itemId },
    data: { deletedAt: new Date() },
  });
}

export async function upsertAssetSnapshot(
  userId: string,
  assetItemId: string,
  monthKey: Date,
  amount: number,
  note?: string | null
) {
  if (amount < 0) throw new Error('amount must be non-negative');
  const item = await prisma.assetItem.findFirst({
    where: { id: assetItemId, userId, deletedAt: null },
  });
  if (!item) throw new Error('asset item not found');

  return prisma.assetSnapshot.upsert({
    where: { assetItemId_month: { assetItemId, month: monthKey } },
    update: { amount, note: note ?? null },
    create: { userId, assetItemId, month: monthKey, amount, note: note ?? null },
  });
}

export async function deleteAssetSnapshot(
  userId: string,
  assetItemId: string,
  monthKey: Date
) {
  const snap = await prisma.assetSnapshot.findFirst({
    where: { assetItemId, month: monthKey, userId },
  });
  if (!snap) return null;
  return prisma.assetSnapshot.delete({ where: { id: snap.id } });
}

async function getMonegerBalanceAt(userId: string, monthEnd: Date): Promise<number> {
  const row = await prisma.dailyBalance.findFirst({
    where: { userId, date: { lte: monthEnd } },
    orderBy: { date: 'desc' },
    select: { balance: true },
  });
  return row?.balance ?? 0;
}

async function getSavingsTotalAt(userId: string, monthEnd: Date): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: {
      userId,
      savingsGoalId: { not: null },
      date: { lte: monthEnd },
      deletedAt: null,
    },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

async function userHasAnyTransactions(userId: string): Promise<boolean> {
  const tx = await prisma.transaction.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  return tx !== null;
}

async function userHasAnySavings(userId: string): Promise<boolean> {
  const [activeGoal, anyTx] = await Promise.all([
    prisma.savingsGoal.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    }),
    prisma.transaction.findFirst({
      where: { userId, savingsGoalId: { not: null }, deletedAt: null },
      select: { id: true },
    }),
  ]);
  return activeGoal !== null || anyTx !== null;
}

function safeMomDelta(values: (number | null)[]): number | null {
  if (values.length < 2) return null;
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  if (last === null || prev === null) return null;
  return last - prev;
}

export async function getAssetReport(
  userId: string,
  endMonthKey: Date,
  range: number
): Promise<AssetReport> {
  const months = buildMonthWindow(endMonthKey, range);
  const monthEnds = months.map((m) => {
    const { year, month } = ymFromMonthKey(m);
    return kstMonthEndUTC(year, month);
  });

  const [items, snapshots, hasTransactions, hasSavings] = await Promise.all([
    listAssetItems(userId),
    prisma.assetSnapshot.findMany({
      where: { userId, month: { in: months } },
    }),
    userHasAnyTransactions(userId),
    userHasAnySavings(userId),
  ]);

  const rows: AssetReportRow[] = [];

  if (hasTransactions) {
    const monegerValues = await Promise.all(
      monthEnds.map((end) => getMonegerBalanceAt(userId, end))
    );
    rows.push({
      kind: 'moneger_balance',
      name: 'Moneger 잔액',
      locked: true,
      values: monegerValues,
      momDelta: safeMomDelta(monegerValues),
    });
  }

  if (hasSavings) {
    const savingsValues = await Promise.all(
      monthEnds.map((end) => getSavingsTotalAt(userId, end))
    );
    rows.push({
      kind: 'savings_goal',
      name: '적금',
      locked: true,
      values: savingsValues,
      momDelta: safeMomDelta(savingsValues),
    });
  }

  const snapshotMap = new Map<string, Map<string, number>>();
  for (const snap of snapshots) {
    const itemMap = snapshotMap.get(snap.assetItemId) ?? new Map<string, number>();
    itemMap.set(formatMonthKey(snap.month), snap.amount);
    snapshotMap.set(snap.assetItemId, itemMap);
  }

  for (const item of items) {
    const itemMap = snapshotMap.get(item.id) ?? new Map<string, number>();
    const values: (number | null)[] = months.map((m) => {
      const key = formatMonthKey(m);
      return itemMap.has(key) ? itemMap.get(key)! : null;
    });
    rows.push({
      kind: 'user_defined',
      assetItemId: item.id,
      name: item.name,
      icon: item.icon,
      order: item.order,
      locked: false,
      values,
      momDelta: safeMomDelta(values),
    });
  }

  const currentTotal = rows.reduce((acc, r) => {
    const v = r.values[r.values.length - 1];
    return acc + (v ?? 0);
  }, 0);
  const previousTotal = rows.reduce((acc, r) => {
    const v = r.values[r.values.length - 2];
    return acc + (v ?? 0);
  }, 0);
  const totalMomDelta = currentTotal - previousTotal;
  const totalMomPercent =
    previousTotal > 0 ? (totalMomDelta / previousTotal) * 100 : null;

  return {
    months: months.map(formatMonthKey),
    rows,
    summary: {
      currentTotal,
      previousTotal,
      totalMomDelta,
      totalMomPercent,
    },
  };
}
