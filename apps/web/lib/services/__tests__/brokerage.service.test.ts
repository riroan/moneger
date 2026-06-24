import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import {
  listConnections,
  createConnection,
  deleteConnection,
  testCredentials,
} from '../brokerage.service';
import { createBrokerageClient } from '../brokerage/factory';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    brokerageConnection: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../brokerage/factory', () => ({
  createBrokerageClient: jest.fn(),
}));

const prismaMock = prisma as unknown as {
  brokerageConnection: {
    findMany: jest.Mock;
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
};
const factoryMock = createBrokerageClient as jest.Mock;

describe('brokerage.service', () => {
  const originalKey = process.env.BROKERAGE_ENC_KEY;
  beforeAll(() => {
    process.env.BROKERAGE_ENC_KEY = randomBytes(32).toString('base64');
  });
  afterAll(() => {
    process.env.BROKERAGE_ENC_KEY = originalKey;
  });
  beforeEach(() => jest.clearAllMocks());

  describe('createConnection', () => {
    it('자격증명을 암호화해 저장하고 평문은 넘기지 않는다', async () => {
      prismaMock.brokerageConnection.create.mockResolvedValue({ id: 'c1', broker: 'KIS' });
      await createConnection('user-1', {
        broker: 'KIS',
        label: '내 한투',
        credentials: { appKey: 'AK', appSecret: 'AS', accountNo: '12345678-01' },
      });

      const arg = prismaMock.brokerageConnection.create.mock.calls[0][0];
      expect(arg.data.userId).toBe('user-1');
      expect(arg.data.broker).toBe('KIS');
      expect(arg.data.ciphertext).toBeInstanceOf(Uint8Array);
      expect(arg.data.iv).toBeInstanceOf(Uint8Array);
      expect(arg.data.authTag).toBeInstanceOf(Uint8Array);
      expect(arg.data.ciphertext.length).toBeGreaterThan(0);
      // 평문 자격증명이 data에 절대 없어야 함
      expect(arg.data).not.toHaveProperty('credentials');
      expect(JSON.stringify(arg.data)).not.toContain('appSecret');
      expect(JSON.stringify(arg.data)).not.toContain('AS');
      // 안전 select 사용 (ciphertext 미반환)
      expect(arg.select).not.toHaveProperty('ciphertext');
    });
  });

  describe('deleteConnection', () => {
    it('소유 연결이면 soft-delete + 자격증명 wipe', async () => {
      prismaMock.brokerageConnection.findFirst.mockResolvedValue({ id: 'c1' });
      prismaMock.brokerageConnection.update.mockResolvedValue({});
      const res = await deleteConnection('user-1', 'c1');
      expect(res).toEqual({ id: 'c1' });
      const updateArg = prismaMock.brokerageConnection.update.mock.calls[0][0];
      expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
      expect(updateArg.data.status).toBe('DISABLED');
      expect(updateArg.data.ciphertext.length).toBe(0);
      expect(updateArg.data.iv.length).toBe(0);
      expect(updateArg.data.authTag.length).toBe(0);
    });

    it('소유 연결이 없으면 null, update 호출 안 함', async () => {
      prismaMock.brokerageConnection.findFirst.mockResolvedValue(null);
      const res = await deleteConnection('user-1', 'nope');
      expect(res).toBeNull();
      expect(prismaMock.brokerageConnection.update).not.toHaveBeenCalled();
    });
  });

  describe('testCredentials', () => {
    it('클라이언트를 만들어 validateCredentials를 호출', async () => {
      const validate = jest.fn().mockResolvedValue(undefined);
      factoryMock.mockReturnValue({ validateCredentials: validate });
      await testCredentials('KIS', { appKey: 'AK' });
      expect(factoryMock).toHaveBeenCalledWith('KIS', { appKey: 'AK' });
      expect(validate).toHaveBeenCalled();
    });

    it('validateCredentials가 throw하면 전파', async () => {
      factoryMock.mockReturnValue({
        validateCredentials: jest.fn().mockRejectedValue(new Error('bad creds')),
      });
      await expect(testCredentials('KIS', {})).rejects.toThrow('bad creds');
    });
  });

  describe('listConnections', () => {
    it('userId + deletedAt:null + 안전 select로 조회', async () => {
      prismaMock.brokerageConnection.findMany.mockResolvedValue([]);
      await listConnections('user-1');
      const arg = prismaMock.brokerageConnection.findMany.mock.calls[0][0];
      expect(arg.where).toEqual({ userId: 'user-1', deletedAt: null });
      expect(arg.select).not.toHaveProperty('ciphertext');
    });
  });
});
