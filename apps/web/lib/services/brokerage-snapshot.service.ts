import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { toKSTDateForDB } from '@/lib/date-utils';
import { Prisma } from '@prisma/client';
import { decryptCredentialObject } from './crypto.service';
import { createBrokerageClient } from './brokerage/factory';
import { BrokerageError, type Money, type NormalizedPosition } from './brokerage/types';

/**
 * 증권 스냅샷 동기화 + 조회.
 * - syncConnection: 자격증명 복호화 → 증권사 호출 → 계좌/스냅샷/포지션 멱등 upsert.
 *   같은 (accountId, date)는 덮어쓰므로 하루 여러 번 눌러도 중복 없음(멱등).
 * - getInvestmentsOverview: /investments + 대시보드 카드용 최신 스냅샷 집계.
 */

function decStr(v: { toString(): string } | null | undefined): string | null {
  return v == null ? null : v.toString();
}

function decNum(v: { toString(): string } | null | undefined): number {
  const n = Number(decStr(v) ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function roundedString(n: number): string {
  return String(Math.round(n));
}

function mapPositionCreate(p: NormalizedPosition) {
  return {
    symbol: p.symbol,
    name: p.name,
    market: p.market ?? null,
    currency: p.currency,
    quantity: p.quantity,
    avgCost: p.avgCost ?? null,
    lastPrice: p.lastPrice ?? null,
    marketValue: p.marketValue,
    marketValueKrw: p.marketValueKrw,
    unrealizedPnl: p.unrealizedPnl ?? null,
    fxRateToKrw: p.fxRateToKrw ?? null,
  };
}

function normalizeCashBalances(value: unknown): Money[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
    .map((item) => ({
      amount: String(item.amount ?? '0'),
      currency: String(item.currency ?? 'KRW'),
      ...(item.amountKrw != null ? { amountKrw: String(item.amountKrw) } : {}),
      ...(item.fxRateToKrw != null ? { fxRateToKrw: String(item.fxRateToKrw) } : {}),
    }));
}

function cashBalancesJson(balances: Money[] | undefined): Prisma.InputJsonValue {
  return (balances ?? []).map((cash) => ({
    amount: cash.amount,
    currency: cash.currency,
    ...(cash.amountKrw != null ? { amountKrw: cash.amountKrw } : {}),
    ...(cash.fxRateToKrw != null ? { fxRateToKrw: cash.fxRateToKrw } : {}),
  })) as unknown as Prisma.InputJsonValue;
}

function failureMessage(err: unknown): string {
  // 시크릿 누출 방지: 일반화된 사유만 저장
  if (err instanceof BrokerageError) return `${err.kind}`;
  return 'sync failed';
}

/** 단일 연결 동기화. 성공/실패를 connection에 기록. 실패 시 throw(상위에서 격리). */
export async function syncConnection(userId: string, connectionId: string) {
  const conn = await prisma.brokerageConnection.findFirst({
    where: { id: connectionId, userId, deletedAt: null },
  });
  if (!conn) return null;

  try {
    const creds = decryptCredentialObject<Record<string, unknown>>(
      {
        ciphertext: Buffer.from(conn.ciphertext),
        iv: Buffer.from(conn.iv),
        authTag: Buffer.from(conn.authTag),
      },
      { userId, broker: conn.broker }
    );
    const client = createBrokerageClient(conn.broker, creds);
    const accounts = (await client.listAccounts()).slice(0, 1);
    const date = toKSTDateForDB(new Date());

    for (const acct of accounts) {
      const snap = await client.getAccountSnapshot(acct);

      const account = await prisma.brokerageAccount.upsert({
        where: {
          connectionId_externalAccountId: {
            connectionId,
            externalAccountId: acct.externalAccountId,
          },
        },
        create: {
          connectionId,
          externalAccountId: acct.externalAccountId,
          displayName: acct.displayName,
          accountType: acct.accountType,
          baseCurrency: acct.baseCurrency,
        },
        update: {
          displayName: acct.displayName,
          accountType: acct.accountType,
          baseCurrency: acct.baseCurrency,
        },
      });

      // 멱등: 같은 (accountId, date)면 기존 스냅샷의 포지션을 교체.
      const existing = await prisma.brokerageSnapshot.findUnique({
        where: { accountId_date: { accountId: account.id, date } },
        select: { id: true },
      });
      if (existing) {
        await prisma.brokeragePosition.deleteMany({ where: { snapshotId: existing.id } });
        await prisma.brokerageSnapshot.update({
          where: { id: existing.id },
          data: {
            cashKrw: snap.cashKrw,
            cashBalances: cashBalancesJson(snap.cashBalances),
            totalEquityKrw: snap.totalEquityKrw,
            positionsValueKrw: snap.positionsValueKrw,
            asOf: snap.asOf,
            positions: { create: snap.positions.map(mapPositionCreate) },
          },
        });
      } else {
        await prisma.brokerageSnapshot.create({
          data: {
            accountId: account.id,
            date,
            cashKrw: snap.cashKrw,
            cashBalances: cashBalancesJson(snap.cashBalances),
            totalEquityKrw: snap.totalEquityKrw,
            positionsValueKrw: snap.positionsValueKrw,
            asOf: snap.asOf,
            positions: { create: snap.positions.map(mapPositionCreate) },
          },
        });
      }
    }

    await prisma.brokerageConnection.update({
      where: { id: connectionId },
      data: { status: 'ACTIVE', lastSuccessAt: new Date(), failureReason: null },
    });
    return { synced: accounts.length };
  } catch (err) {
    logger.error(`[brokerage] sync failed for connection ${connectionId}`, err as Error);
    await prisma.brokerageConnection.update({
      where: { id: connectionId },
      data: { status: 'ERROR', lastFailureAt: new Date(), failureReason: failureMessage(err) },
    });
    throw err;
  }
}

/** 사용자의 모든 활성 연결을 동기화. 크론/전체 동기화 버튼에서 사용한다. */
export async function syncAllConnections(userId: string) {
  const connections = await prisma.brokerageConnection.findMany({
    where: { userId, deletedAt: null, status: { not: 'DISABLED' } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  const results: Array<{ connectionId: string; ok: boolean; synced?: number; error?: string }> = [];
  for (const conn of connections) {
    try {
      const result = await syncConnection(userId, conn.id);
      results.push({ connectionId: conn.id, ok: true, synced: result?.synced ?? 0 });
    } catch (err) {
      results.push({ connectionId: conn.id, ok: false, error: failureMessage(err) });
    }
  }

  return {
    total: connections.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}

export interface InvestmentsOverview {
  totalEquityKrw: string;
  monthlyReport: Array<{
    month: string;
    totalEquityKrw: string;
    cashKrw: string;
    positionsValueKrw: string;
    changeKrw: string | null;
    changeRate: string | null;
  }>;
  analysis: {
    snapshotsCount: number;
    positionCount: number;
    brokerBreakdown: Array<{ broker: string; totalEquityKrw: string }>;
    currencyBreakdown: Array<{ currency: string; marketValueKrw: string }>;
  };
  connections: Array<{
    id: string;
    broker: string;
    label: string | null;
    status: string;
    failureReason: string | null;
    accounts: Array<{
      id: string;
      displayName: string;
      accountType: string;
      asOf: string | null;
      cashKrw: string | null;
      cashBalances: Money[];
      totalEquityKrw: string | null;
      positionsValueKrw: string | null;
      positions: Array<{
        symbol: string;
        name: string;
        market: string | null;
        currency: string;
        quantity: string;
        marketValueKrw: string;
        marketValue: string;
        unrealizedPnl: string | null;
      }>;
    }>;
  }>;
}

/** /investments + 대시보드 카드용. 계좌별 최신 스냅샷 + 보유종목. Decimal→string. */
export async function getInvestmentsOverview(userId: string): Promise<InvestmentsOverview> {
  const [connections, history] = await Promise.all([
    prisma.brokerageConnection.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        broker: true,
        label: true,
        status: true,
        failureReason: true,
        accounts: {
          select: {
            id: true,
            displayName: true,
            accountType: true,
            snapshots: {
              orderBy: { date: 'desc' },
              take: 1,
              select: {
                asOf: true,
                cashKrw: true,
                cashBalances: true,
                totalEquityKrw: true,
                positionsValueKrw: true,
                positions: {
                  orderBy: { marketValueKrw: 'desc' },
                  select: {
                    symbol: true,
                    name: true,
                    market: true,
                    currency: true,
                    quantity: true,
                    marketValue: true,
                    marketValueKrw: true,
                    unrealizedPnl: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.brokerageSnapshot.findMany({
      where: { account: { connection: { userId, deletedAt: null } } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      select: {
        accountId: true,
        date: true,
        cashKrw: true,
        totalEquityKrw: true,
        positionsValueKrw: true,
      },
    }),
  ]);

  let total = 0;
  let positionCount = 0;
  const brokerTotals = new Map<string, number>();
  const currencyTotals = new Map<string, number>();

  const shaped = connections.map((c) => ({
    id: c.id,
    broker: c.broker,
    label: c.label,
    status: c.status,
    failureReason: c.failureReason,
    accounts: c.accounts.map((a) => {
      const snap = a.snapshots[0];
      const cashBalances = normalizeCashBalances(snap?.cashBalances);
      const accountTotal = decNum(snap?.totalEquityKrw);
      if (snap?.totalEquityKrw != null) {
        total += accountTotal;
        brokerTotals.set(c.broker, (brokerTotals.get(c.broker) ?? 0) + accountTotal);
      }
      for (const cash of cashBalances) {
        const amountKrw = Number(cash.amountKrw ?? (cash.currency === 'KRW' ? cash.amount : 0));
        if (Number.isFinite(amountKrw) && amountKrw > 0) {
          currencyTotals.set(cash.currency, (currencyTotals.get(cash.currency) ?? 0) + amountKrw);
        }
      }
      positionCount += snap?.positions.length ?? 0;
      return {
        id: a.id,
        displayName: a.displayName,
        accountType: a.accountType,
        asOf: snap?.asOf ? snap.asOf.toISOString() : null,
        cashKrw: decStr(snap?.cashKrw),
        cashBalances,
        totalEquityKrw: decStr(snap?.totalEquityKrw),
        positionsValueKrw: decStr(snap?.positionsValueKrw),
        positions: (snap?.positions ?? []).map((p) => ({
          symbol: p.symbol,
          name: p.name,
          market: p.market,
          currency: p.currency,
          quantity: p.quantity.toString(),
          marketValue: p.marketValue.toString(),
          marketValueKrw: p.marketValueKrw.toString(),
          unrealizedPnl: decStr(p.unrealizedPnl),
        })).map((p) => {
          currencyTotals.set(p.currency, (currencyTotals.get(p.currency) ?? 0) + Number(p.marketValueKrw));
          return p;
        }),
      };
    }),
  }));

  return {
    totalEquityKrw: String(total),
    monthlyReport: buildMonthlyReport(history),
    analysis: {
      snapshotsCount: history.length,
      positionCount,
      brokerBreakdown: [...brokerTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([broker, value]) => ({
          broker,
          totalEquityKrw: roundedString(value),
        })),
      currencyBreakdown: [...currencyTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([currency, value]) => ({
          currency,
          marketValueKrw: roundedString(value),
        })),
    },
    connections: shaped,
  };
}

function buildMonthlyReport(
  history: Array<{
    accountId: string;
    date: Date;
    cashKrw: { toString(): string };
    totalEquityKrw: { toString(): string };
    positionsValueKrw: { toString(): string };
  }>
) {
  const latestByMonthAccount = new Map<string, (typeof history)[number]>();
  for (const row of history) {
    latestByMonthAccount.set(`${monthKey(row.date)}:${row.accountId}`, row);
  }

  const monthly = new Map<
    string,
    { totalEquityKrw: number; cashKrw: number; positionsValueKrw: number }
  >();
  for (const row of latestByMonthAccount.values()) {
    const key = monthKey(row.date);
    const prev = monthly.get(key) ?? { totalEquityKrw: 0, cashKrw: 0, positionsValueKrw: 0 };
    prev.totalEquityKrw += decNum(row.totalEquityKrw);
    prev.cashKrw += decNum(row.cashKrw);
    prev.positionsValueKrw += decNum(row.positionsValueKrw);
    monthly.set(key, prev);
  }

  const rows = [...monthly.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, value], idx, arr) => {
      const prev = idx > 0 ? arr[idx - 1][1].totalEquityKrw : null;
      const change = prev == null ? null : value.totalEquityKrw - prev;
      return {
        month,
        totalEquityKrw: roundedString(value.totalEquityKrw),
        cashKrw: roundedString(value.cashKrw),
        positionsValueKrw: roundedString(value.positionsValueKrw),
        changeKrw: change == null ? null : roundedString(change),
        changeRate: change == null || !prev ? null : (change / prev).toFixed(4),
      };
    });
  return rows;
}
