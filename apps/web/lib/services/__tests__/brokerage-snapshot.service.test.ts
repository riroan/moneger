import { prisma } from '@/lib/prisma';
import { syncConnection } from '../brokerage-snapshot.service';
import { createBrokerageClient } from '../brokerage/factory';
import { decryptCredentialObject } from '../crypto.service';
import { BrokerageError } from '../brokerage/types';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    brokerageConnection: { findFirst: jest.fn(), update: jest.fn() },
    brokerageAccount: { upsert: jest.fn() },
    brokerageSnapshot: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    brokeragePosition: { deleteMany: jest.fn() },
  },
}));
jest.mock('../brokerage/factory', () => ({ createBrokerageClient: jest.fn() }));
jest.mock('../crypto.service', () => ({ decryptCredentialObject: jest.fn() }));

const p = prisma as unknown as {
  brokerageConnection: { findFirst: jest.Mock; update: jest.Mock };
  brokerageAccount: { upsert: jest.Mock };
  brokerageSnapshot: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
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
