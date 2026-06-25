import { prisma } from '@/lib/prisma';
import { syncConnection, getInvestmentsOverview } from '../brokerage-snapshot.service';
import { createBrokerageClient } from '../brokerage/factory';
import { decryptCredentialObject } from '../crypto.service';
import { BrokerageError } from '../brokerage/types';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    brokerageConnection: { findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    brokerageAccount: { upsert: jest.fn() },
    brokerageSnapshot: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    brokeragePosition: { deleteMany: jest.fn() },
  },
}));
jest.mock('../brokerage/factory', () => ({ createBrokerageClient: jest.fn() }));
jest.mock('../crypto.service', () => ({ decryptCredentialObject: jest.fn() }));

const p = prisma as unknown as {
  brokerageConnection: { findFirst: jest.Mock; update: jest.Mock; findMany: jest.Mock };
  brokerageAccount: { upsert: jest.Mock };
  brokerageSnapshot: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; findMany: jest.Mock };
  brokeragePosition: { deleteMany: jest.Mock };
};
const factoryMock = createBrokerageClient as jest.Mock;
const decryptMock = decryptCredentialObject as jest.Mock;

const connRow = {
  id: 'conn-1',
  userId: 'user-1',
  broker: 'KIS',
  ciphertext: Buffer.from('x'),
  iv: Buffer.from('y'),
  authTag: Buffer.from('z'),
};

const accountRef = {
  broker: 'KIS',
  externalAccountId: 'acc1',
  displayName: 'acc1',
  accountType: 'domestic',
  baseCurrency: 'KRW',
};

const snapshot = {
  broker: 'KIS',
  externalAccountId: 'acc1',
  asOf: new Date('2026-06-24T06:00:00Z'),
  cashKrw: '500000',
  cashBalances: [
    { amount: '500000', currency: 'KRW', amountKrw: '500000' },
    { amount: '25', currency: 'USD', amountKrw: '32500', fxRateToKrw: '1300' },
  ],
  totalEquityKrw: '1300000',
  positionsValueKrw: '800000',
  positions: [
    {
      symbol: '005930',
      name: '삼성전자',
      currency: 'KRW',
      quantity: '10',
      marketValue: '800000',
      marketValueKrw: '800000',
      unrealizedPnl: '100000',
    },
  ],
};

function mockClient() {
  return {
    listAccounts: jest.fn().mockResolvedValue([accountRef]),
    getAccountSnapshot: jest.fn().mockResolvedValue(snapshot),
  };
}

describe('brokerage-snapshot.service syncConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    decryptMock.mockReturnValue({ appKey: 'AK', appSecret: 'AS', accountNo: '12345678-01' });
    p.brokerageConnection.findFirst.mockResolvedValue(connRow);
    p.brokerageAccount.upsert.mockResolvedValue({ id: 'acct-db-1' });
    p.brokerageConnection.update.mockResolvedValue({});
  });

  it('연결 없으면 null', async () => {
    p.brokerageConnection.findFirst.mockResolvedValue(null);
    expect(await syncConnection('user-1', 'nope')).toBeNull();
  });

  it('신규 스냅샷: create + 포지션 + 성공 기록', async () => {
    factoryMock.mockReturnValue(mockClient());
    p.brokerageSnapshot.findUnique.mockResolvedValue(null);
    p.brokerageSnapshot.create.mockResolvedValue({ id: 'snap-new' });

    const res = await syncConnection('user-1', 'conn-1');
    expect(res).toEqual({ synced: 1 });
    expect(p.brokerageSnapshot.create).toHaveBeenCalled();
    const createArg = p.brokerageSnapshot.create.mock.calls[0][0];
    expect(createArg.data.accountId).toBe('acct-db-1');
    expect(createArg.data.cashKrw).toBe('500000');
    expect(createArg.data.cashBalances).toEqual(snapshot.cashBalances);
    expect(createArg.data.positions.create).toHaveLength(1);
    // AAD 컨텍스트 정확히 전달
    expect(decryptMock).toHaveBeenCalledWith(expect.anything(), { userId: 'user-1', broker: 'KIS' });
    expect(p.brokerageConnection.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE' }) })
    );
  });

  it('멱등: 같은 날 스냅샷 있으면 포지션 교체 + update(create 아님)', async () => {
    factoryMock.mockReturnValue(mockClient());
    p.brokerageSnapshot.findUnique.mockResolvedValue({ id: 'snap-1' });
    p.brokeragePosition.deleteMany.mockResolvedValue({ count: 1 });
    p.brokerageSnapshot.update.mockResolvedValue({ id: 'snap-1' });

    await syncConnection('user-1', 'conn-1');
    expect(p.brokeragePosition.deleteMany).toHaveBeenCalledWith({ where: { snapshotId: 'snap-1' } });
    expect(p.brokerageSnapshot.update).toHaveBeenCalled();
    expect(p.brokerageSnapshot.create).not.toHaveBeenCalled();
  });

  it('실패: status=ERROR 기록 후 throw', async () => {
    const client = mockClient();
    client.getAccountSnapshot.mockRejectedValue(new BrokerageError('unauthorized', 'auth', 'KIS'));
    factoryMock.mockReturnValue(client);
    p.brokerageSnapshot.findUnique.mockResolvedValue(null);

    await expect(syncConnection('user-1', 'conn-1')).rejects.toBeInstanceOf(BrokerageError);
    expect(p.brokerageConnection.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ERROR' }) })
    );
  });
});

function overviewPosition(symbol: string, lastPrice: string) {
  return {
    symbol,
    name: symbol,
    market: 'KRX',
    currency: 'KRW',
    quantity: '10',
    marketValue: '800000',
    marketValueKrw: '800000',
    unrealizedPnl: '100000',
    lastPrice,
  };
}

function overviewSnapshot(totalEquityKrw: string, lastPrice: string) {
  return {
    asOf: new Date('2026-06-25T06:00:00Z'),
    cashKrw: '500000',
    cashBalances: [],
    totalEquityKrw,
    positionsValueKrw: '800000',
    positions: [overviewPosition('005930', lastPrice)],
  };
}

function mockOverview(snapshots: ReturnType<typeof overviewSnapshot>[]) {
  p.brokerageConnection.findMany.mockResolvedValue([
    {
      id: 'conn-1',
      broker: 'KIS',
      label: null,
      status: 'ACTIVE',
      failureReason: null,
      accounts: [{ id: 'acct-1', displayName: 'acc1', accountType: 'domestic', snapshots }],
    },
  ]);
  p.brokerageSnapshot.findMany.mockResolvedValue([]); // monthlyReport은 본 테스트 대상 아님
}

describe('brokerage-snapshot.service getInvestmentsOverview 전일 대비', () => {
  beforeEach(() => jest.clearAllMocks());

  it('전일 스냅샷이 있으면 자산/종목가 전일 대비를 계산한다', async () => {
    // 최신[0] totalEquity 1,300,000 / 가격 80,000, 전일[1] 1,200,000 / 가격 76,000
    mockOverview([overviewSnapshot('1300000', '80000'), overviewSnapshot('1200000', '76000')]);

    const res = await getInvestmentsOverview('user-1');

    expect(res.totalEquityKrw).toBe('1300000');
    expect(res.dayChangeKrw).toBe('100000'); // 1,300,000 - 1,200,000
    expect(res.dayChangeRate).toBe('0.0833'); // 100,000 / 1,200,000
    const acct = res.connections[0].accounts[0];
    expect(acct.dayChangeKrw).toBe('100000'); // 계좌 카드용 전일 대비
    expect(acct.dayChangeRate).toBe('0.0833');
    const pos = acct.positions[0];
    expect(pos.lastPrice).toBe('80000');
    expect(pos.prevClose).toBe('76000'); // 전일 스냅샷의 같은 종목 lastPrice
  });

  it('연결 목록은 토스증권을 먼저 노출한다(createdAt 무관)', async () => {
    // createdAt 순서상 KIS가 먼저여도 응답에서는 TOSS가 앞
    p.brokerageConnection.findMany.mockResolvedValue([
      { id: 'kis-1', broker: 'KIS', label: null, status: 'ACTIVE', failureReason: null, accounts: [] },
      { id: 'toss-1', broker: 'TOSS', label: null, status: 'ACTIVE', failureReason: null, accounts: [] },
    ]);
    p.brokerageSnapshot.findMany.mockResolvedValue([]);

    const res = await getInvestmentsOverview('user-1');

    expect(res.connections.map((c) => c.broker)).toEqual(['TOSS', 'KIS']);
  });

  it('전일 스냅샷이 없으면 전일 대비는 null', async () => {
    mockOverview([overviewSnapshot('1300000', '80000')]); // 최신 1개뿐

    const res = await getInvestmentsOverview('user-1');

    expect(res.dayChangeKrw).toBeNull();
    expect(res.dayChangeRate).toBeNull();
    expect(res.connections[0].accounts[0].dayChangeKrw).toBeNull();
    expect(res.connections[0].accounts[0].positions[0].prevClose).toBeNull();
  });
});
