import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { toKSTDateForDB } from '@/lib/date-utils';
import { decryptCredentialObject } from './crypto.service';
import { createBrokerageClient } from './brokerage/factory';
import { BrokerageError, type NormalizedPosition } from './brokerage/types';

/**
 * 증권 스냅샷 동기화 + 조회.
 * - syncConnection: 자격증명 복호화 → 증권사 호출 → 계좌/스냅샷/포지션 멱등 upsert.
 *   같은 (accountId, date)는 덮어쓰므로 하루 여러 번 눌러도 중복 없음(멱등).
 * - getInvestmentsOverview: /investments + 대시보드 카드용 최신 스냅샷 집계.
 */

function decStr(v: { toString(): string } | null | undefined): string | null {
  return v == null ? null : v.toString();
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
    const accounts = await client.listAccounts();
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

export interface InvestmentsOverview {
  totalEquityKrw: string;
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
      totalEquityKrw: string | null;
      positionsValueKrw: string | null;
      positions: Array<{
        symbol: string;
        name: string;
        market: string | null;
        currency: string;
        quantity: string;
        marketValueKrw: string;
        unrealizedPnl: string | null;
      }>;
    }>;
  }>;
}

/** /investments + 대시보드 카드용. 계좌별 최신 스냅샷 + 보유종목. Decimal→string. */
export async function getInvestmentsOverview(userId: string): Promise<InvestmentsOverview> {
  const connections = await prisma.brokerageConnection.findMany({
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
                  marketValueKrw: true,
                  unrealizedPnl: true,
                },
              },
            },
          },
        },
      },
    },
  });

  let total = 0;
  const shaped = connections.map((c) => ({
    id: c.id,
    broker: c.broker,
    label: c.label,
    status: c.status,
    failureReason: c.failureReason,
    accounts: c.accounts.map((a) => {
      const snap = a.snapshots[0];
      if (snap?.totalEquityKrw != null) total += Number(snap.totalEquityKrw);
      return {
        id: a.id,
        displayName: a.displayName,
        accountType: a.accountType,
        asOf: snap?.asOf ? snap.asOf.toISOString() : null,
        cashKrw: decStr(snap?.cashKrw),
        totalEquityKrw: decStr(snap?.totalEquityKrw),
        positionsValueKrw: decStr(snap?.positionsValueKrw),
        positions: (snap?.positions ?? []).map((p) => ({
          symbol: p.symbol,
          name: p.name,
          market: p.market,
          currency: p.currency,
          quantity: p.quantity.toString(),
          marketValueKrw: p.marketValueKrw.toString(),
          unrealizedPnl: decStr(p.unrealizedPnl),
        })),
      };
    }),
  }));

  return { totalEquityKrw: String(total), connections: shaped };
}
