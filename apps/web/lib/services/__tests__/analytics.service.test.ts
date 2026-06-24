import { prisma } from '@/lib/prisma';
import { getAnalytics } from '../analytics.service';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    savingsGoal: {
      findFirst: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
  },
}));

describe('analytics.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2024-03-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getAnalytics', () => {
    it('월별 분석/카테고리 추이/요일 패턴에서 저축 거래를 일반 지출과 분리해야 함', async () => {
      (prisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: 1000000 } }) // income
        .mockResolvedValueOnce({ _sum: { amount: 300000 } }) // expense excluding savings
        .mockResolvedValueOnce({ _sum: { amount: 200000 } }) // savings
        .mockResolvedValueOnce({ _sum: { amount: 100000 } }); // investment deposit

      (prisma.transaction.groupBy as jest.Mock).mockResolvedValueOnce([
        { categoryId: 'cat-food', _sum: { amount: 300000 } },
      ]);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 'tx-expense-1',
          amount: 300000,
          description: '식비',
          date: new Date('2024-03-02T00:00:00Z'),
          category: { name: '식비', color: '#EF4444' },
        },
      ]);
      (prisma.savingsGoal.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.category.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 'cat-food', name: '식비', color: '#EF4444' },
      ]);

      const result = await getAnalytics('user-1', 1);

      expect(result.months).toEqual([
        {
          year: 2024,
          month: 3,
          income: 1000000,
          expense: 300000,
          savingsDeposit: 200000,
          investmentDeposit: 100000,
          assetFormation: 300000,
          net: 400000,
        },
      ]);
      expect(result.averages.expense).toBe(300000);
      expect(result.categoryTrends.categories).toEqual([
        { id: 'cat-food', name: '식비', color: '#EF4444' },
      ]);

      const aggregateCalls = (prisma.transaction.aggregate as jest.Mock).mock.calls;
      expect(aggregateCalls[1][0]).toEqual(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'EXPENSE',
            savingsGoalId: null,
          }),
        })
      );
      expect(aggregateCalls[2][0]).toEqual(
        expect.objectContaining({
          where: expect.objectContaining({
            savingsGoalId: { not: null },
          }),
        })
      );
      expect(aggregateCalls[3][0]).toEqual(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'EXPENSE',
            savingsGoalId: null,
            category: { categoryGroup: 'ASSET_FORMATION' },
          }),
        })
      );

      expect(prisma.transaction.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'EXPENSE',
            savingsGoalId: null,
            categoryId: { not: null },
          }),
        })
      );
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'EXPENSE',
            savingsGoalId: null,
          }),
        })
      );
    });
  });
});
