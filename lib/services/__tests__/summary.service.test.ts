import { prisma } from '@/lib/prisma';
import { getTransactionSummary } from '../summary.service';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    budget: {
      findMany: jest.fn(),
    },
    savingsGoal: {
      findMany: jest.fn(),
    },
  },
}));

describe('summary.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransactionSummary', () => {
    const userId = 'user-1';
    const year = 2024;
    const month = 1;

    const mockIncomeAgg = { _sum: { amount: 3000000 } };
    const mockExpenseAgg = { _sum: { amount: 1500000 } };
    const mockCategoryStats = [
      { categoryId: 'cat-1', _sum: { amount: 500000 }, _count: 15 },
      { categoryId: 'cat-2', _sum: { amount: 300000 }, _count: 8 },
    ];
    const mockTransactionCounts = [
      { type: 'INCOME', _count: 2 },
      { type: 'EXPENSE', _count: 23 },
    ];
    const mockSavingsData = [
      {
        id: 'savings-1',
        name: '여행 자금',
        icon: '✈️',
        currentAmount: 500000,
        targetAmount: 2000000,
        targetYear: 2024,
        targetMonth: 12,
        isPrimary: true,
      },
    ];
    const mockMonthlySavingsAgg = { _sum: { amount: 100000 }, _count: 2 };

    const mockCategories = [
      { id: 'cat-1', name: '식비', icon: '🍽️', color: '#EF4444', defaultBudget: 600000 },
      { id: 'cat-2', name: '교통비', icon: '🚗', color: '#3B82F6', defaultBudget: 200000 },
    ];

    const mockBudgets = [
      { id: 'budget-1', categoryId: 'cat-1', amount: 500000 },
      { id: 'budget-overall', categoryId: null, amount: 2000000 },
    ];

    const setupDefaultMocks = () => {
      (prisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce(mockIncomeAgg)
        .mockResolvedValueOnce(mockExpenseAgg)
        .mockResolvedValueOnce(mockMonthlySavingsAgg);

      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce(mockCategoryStats)
        .mockResolvedValueOnce(mockTransactionCounts);

      (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue(mockSavingsData);
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.budget.findMany as jest.Mock).mockResolvedValue(mockBudgets);
    };

    it('월별 거래 요약을 반환해야 함', async () => {
      setupDefaultMocks();
      const result = await getTransactionSummary(userId, year, month);

      expect(result.period).toEqual({ year: 2024, month: 1 });
      expect(result.summary.totalIncome).toBe(3000000);
      expect(result.summary.totalExpense).toBe(1500000);
      expect(result.summary.totalSavings).toBe(100000);
      expect(result.summary.netAmount).toBe(1500000); // 3000000 - 1500000
      expect(result.summary.balance).toBe(1400000); // 3000000 - 1500000 - 100000
    });

    it('예산 정보를 포함해야 함', async () => {
      setupDefaultMocks();
      const result = await getTransactionSummary(userId, year, month);

      expect(result.budget.amount).toBe(2000000);
      expect(result.budget.used).toBe(1500000);
      expect(result.budget.remaining).toBe(500000);
      expect(result.budget.usagePercent).toBe(75);
    });

    it('카테고리별 통계를 포함해야 함', async () => {
      setupDefaultMocks();
      const result = await getTransactionSummary(userId, year, month);

      expect(result.categories).toHaveLength(2);
      expect(result.categories[0]).toMatchObject({
        id: 'cat-1',
        name: '식비',
        count: 15,
        total: 500000,
        budget: 500000, // 월별 예산이 있으면 해당 값 사용
        budgetUsagePercent: 100, // 500000 / 500000 * 100
      });
    });

    it('카테고리에 월별 예산이 없으면 기본 예산을 사용해야 함', async () => {
      setupDefaultMocks();
      // cat-2에는 월별 예산이 없음
      const result = await getTransactionSummary(userId, year, month);

      const cat2 = result.categories.find((c) => c.id === 'cat-2');
      expect(cat2?.budget).toBe(200000); // defaultBudget 사용
      expect(cat2?.budgetUsagePercent).toBe(150); // 300000 / 200000 * 100
    });

    it('거래 건수를 포함해야 함', async () => {
      setupDefaultMocks();
      const result = await getTransactionSummary(userId, year, month);

      expect(result.transactionCount).toEqual({
        income: 2,
        expense: 23,
        total: 25,
      });
    });

    it('저축 정보를 포함해야 함', async () => {
      setupDefaultMocks();
      const result = await getTransactionSummary(userId, year, month);

      expect(result.savings.totalAmount).toBe(100000);
      expect(result.savings.targetAmount).toBe(2000000);
      expect(result.savings.count).toBe(2);
      expect(result.savings.primaryGoal).toMatchObject({
        id: 'savings-1',
        name: '여행 자금',
        currentAmount: 500000,
        targetAmount: 2000000,
        progressPercent: 25,
      });
    });

    it('저축 목표가 없으면 primaryGoal이 null이어야 함', async () => {
      jest.clearAllMocks();
      (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce(mockIncomeAgg)
        .mockResolvedValueOnce(mockExpenseAgg)
        .mockResolvedValueOnce({ _sum: { amount: null }, _count: 0 });
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (prisma.category.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.budget.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getTransactionSummary(userId, year, month);

      expect(result.savings.primaryGoal).toBeNull();
      expect(result.savings.targetAmount).toBe(0);
    });

    it('거래가 없으면 0으로 반환해야 함', async () => {
      jest.clearAllMocks();
      (prisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null }, _count: 0 });
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.category.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.budget.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getTransactionSummary(userId, year, month);

      expect(result.summary.totalIncome).toBe(0);
      expect(result.summary.totalExpense).toBe(0);
      expect(result.categories).toHaveLength(0);
    });

    it('전체 예산이 없으면 0으로 처리해야 함', async () => {
      jest.clearAllMocks();
      (prisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce(mockIncomeAgg)
        .mockResolvedValueOnce(mockExpenseAgg)
        .mockResolvedValueOnce(mockMonthlySavingsAgg);
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce(mockCategoryStats)
        .mockResolvedValueOnce(mockTransactionCounts);
      (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue(mockSavingsData);
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.budget.findMany as jest.Mock).mockResolvedValue([
        { id: 'budget-1', categoryId: 'cat-1', amount: 500000 },
      ]);

      const result = await getTransactionSummary(userId, year, month);

      expect(result.budget.amount).toBe(0);
      expect(result.budget.usagePercent).toBe(0);
    });
  });
});
