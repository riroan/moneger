import { prisma } from '@/lib/prisma';
import { getMonthlyStats } from '../stats.service';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      aggregate: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    budget: {
      findFirst: jest.fn(),
    },
  },
}));

describe('stats.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMonthlyStats', () => {
    const userId = 'user-1';
    const year = 2024;
    const month = 1;

    const mockCategories = [
      { id: 'cat-1', name: '식비', type: 'EXPENSE', color: '#EF4444', icon: '🍽️' },
      { id: 'cat-2', name: '교통비', type: 'EXPENSE', color: '#3B82F6', icon: '🚗' },
    ];

    const setupDefaultMocks = () => {
      (prisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: 3000000 } }) // 총 수입
        .mockResolvedValueOnce({ _sum: { amount: 1500000 } }); // 총 지출

      (prisma.transaction.count as jest.Mock)
        .mockResolvedValueOnce(2) // 수입 건수
        .mockResolvedValueOnce(23); // 지출 건수

      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          { categoryId: 'cat-1', _sum: { amount: 500000 }, _count: 15 },
          { categoryId: 'cat-2', _sum: { amount: 300000 }, _count: 8 },
        ]) // 카테고리별 지출
        .mockResolvedValueOnce([
          { date: new Date('2024-01-20'), _sum: { amount: 50000 } },
          { date: new Date('2024-01-21'), _sum: { amount: 30000 } },
        ]); // 최근 7일 지출

      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.budget.findFirst as jest.Mock).mockResolvedValue({ amount: 2000000 });
    };

    it('월별 통계 요약을 반환해야 함', async () => {
      setupDefaultMocks();
      const result = await getMonthlyStats(userId, year, month);

      expect(result.summary).toEqual({
        totalIncome: 3000000,
        totalExpense: 1500000,
        balance: 1500000,
        incomeCount: 2,
        expenseCount: 23,
        transactionCount: 25,
      });
    });

    it('예산 정보를 반환해야 함', async () => {
      setupDefaultMocks();
      const result = await getMonthlyStats(userId, year, month);

      expect(result.budget).toEqual({
        amount: 2000000,
        used: 1500000,
        remaining: 500000,
        usagePercent: 75,
      });
    });

    it('카테고리별 지출 통계를 반환해야 함', async () => {
      setupDefaultMocks();
      const result = await getMonthlyStats(userId, year, month);

      expect(result.categoryBreakdown).toHaveLength(2);
      expect(result.categoryBreakdown[0]).toMatchObject({
        categoryId: 'cat-1',
        categoryName: '식비',
        total: 500000,
        count: 15,
      });
    });

    it('카테고리가 지출 금액 순으로 정렬되어야 함', async () => {
      setupDefaultMocks();
      const result = await getMonthlyStats(userId, year, month);

      // cat-1 (500000) > cat-2 (300000)
      expect(result.categoryBreakdown[0].categoryId).toBe('cat-1');
      expect(result.categoryBreakdown[1].categoryId).toBe('cat-2');
    });

    it('최근 7일 지출 데이터를 반환해야 함', async () => {
      setupDefaultMocks();
      const result = await getMonthlyStats(userId, year, month);

      expect(result.last7Days).toHaveLength(7);
      expect(result.last7Days.every((d) => 'date' in d && 'amount' in d)).toBe(true);
    });

    it('예산이 없으면 0으로 처리해야 함', async () => {
      setupDefaultMocks();
      (prisma.budget.findFirst as jest.Mock).mockReset();
      (prisma.budget.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await getMonthlyStats(userId, year, month);

      expect(result.budget).toEqual({
        amount: 0,
        used: 1500000,
        remaining: 0,
        usagePercent: 0,
      });
    });

    it('거래가 없으면 0으로 반환해야 함', async () => {
      jest.clearAllMocks();
      (prisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });
      (prisma.transaction.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.budget.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await getMonthlyStats(userId, year, month);

      expect(result.summary.totalIncome).toBe(0);
      expect(result.summary.totalExpense).toBe(0);
      expect(result.categoryBreakdown).toHaveLength(0);
    });

    it('예산 사용률이 100%를 초과하지 않아야 함', async () => {
      jest.clearAllMocks();
      (prisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: 0 } })
        .mockResolvedValueOnce({ _sum: { amount: 3000000 } }); // 예산 초과
      (prisma.transaction.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(50);
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.budget.findFirst as jest.Mock).mockResolvedValue({ amount: 2000000 });

      const result = await getMonthlyStats(userId, year, month);

      expect(result.budget.usagePercent).toBe(100);
      expect(result.budget.remaining).toBe(0); // max(0, ...) 처리
    });

    it('삭제된 카테고리는 제외해야 함', async () => {
      jest.clearAllMocks();
      (prisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: 3000000 } })
        .mockResolvedValueOnce({ _sum: { amount: 1500000 } });
      (prisma.transaction.count as jest.Mock)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(18);
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          { categoryId: 'cat-1', _sum: { amount: 500000 }, _count: 15 },
          { categoryId: 'deleted-cat', _sum: { amount: 100000 }, _count: 3 }, // 삭제된 카테고리
        ])
        .mockResolvedValueOnce([]);
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.budget.findFirst as jest.Mock).mockResolvedValue({ amount: 2000000 });

      const result = await getMonthlyStats(userId, year, month);

      // deleted-cat은 categoryMap에 없으므로 제외됨
      expect(result.categoryBreakdown).toHaveLength(1);
      expect(result.categoryBreakdown[0].categoryId).toBe('cat-1');
    });
  });
});
