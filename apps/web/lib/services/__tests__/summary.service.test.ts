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

// Mock prisma-selects
jest.mock('@/lib/prisma-selects', () => ({
  CATEGORY_WITH_BUDGET_SELECT: {
    id: true,
    name: true,
    icon: true,
    color: true,
    defaultBudget: true,
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

    // fetchMonthlyAggregations runs 9 parallel queries:
    // 1. aggregate: incomeAgg
    // 2. aggregate: expenseAgg
    // 3. groupBy: categoryStats (by categoryId)
    // 4. groupBy: transactionCounts (by type)
    // 5. savingsGoal.findMany: activeSavingsData
    // 6. aggregate: monthlySavingsAgg
    // 7. aggregate: previousIncomeAgg
    // 8. aggregate: previousExpenseAgg
    // 9. aggregate: previousSavingsAgg
    //
    // Then buildCategoryStats runs 2 parallel queries:
    // 1. category.findMany
    // 2. budget.findMany (for categories)
    //
    // Then another budget.findMany (for overall budget)

    const setupDefaultMocks = () => {
      // aggregate calls: income, expense, monthlySavings, previousIncome, previousExpense, previousSavings
      (prisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: 3000000 } }) // incomeAgg
        .mockResolvedValueOnce({ _sum: { amount: 1500000 } }) // expenseAgg
        .mockResolvedValueOnce({ _sum: { amount: 100000 }, _count: 2 }) // monthlySavingsAgg
        .mockResolvedValueOnce({ _sum: { amount: 0 } }) // previousIncomeAgg
        .mockResolvedValueOnce({ _sum: { amount: 0 } }) // previousExpenseAgg
        .mockResolvedValueOnce({ _sum: { amount: 0 } }); // previousSavingsAgg

      // groupBy calls: categoryStats, transactionCounts
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([ // categoryStats
          { categoryId: 'cat-1', _sum: { amount: 500000 }, _count: 15 },
          { categoryId: 'cat-2', _sum: { amount: 300000 }, _count: 8 },
        ])
        .mockResolvedValueOnce([ // transactionCounts
          { type: 'INCOME', _count: 2 },
          { type: 'EXPENSE', _count: 23 },
        ]);

      // savingsGoal
      (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue([
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
      ]);

      // category.findMany (called by buildCategoryStats)
      (prisma.category.findMany as jest.Mock).mockResolvedValue([
        { id: 'cat-1', name: '식비', icon: '🍽️', color: '#EF4444', defaultBudget: 600000 },
        { id: 'cat-2', name: '교통비', icon: '🚗', color: '#3B82F6', defaultBudget: 200000 },
      ]);

      // budget.findMany (called by buildCategoryStats for category budgets + overall budget)
      (prisma.budget.findMany as jest.Mock)
        .mockResolvedValueOnce([ // category budgets
          { id: 'budget-1', categoryId: 'cat-1', amount: 500000 },
          { id: 'budget-overall', categoryId: null, amount: 2000000 },
        ])
        .mockResolvedValueOnce([ // overall budget
          { id: 'budget-overall', categoryId: null, amount: 2000000 },
        ]);
    };

    it('월별 거래 요약을 반환해야 함', async () => {
      setupDefaultMocks();
      const result = await getTransactionSummary(userId, year, month);

      expect(result.period).toEqual({ year: 2024, month: 1 });
      expect(result.summary.totalIncome).toBe(3000000);
      expect(result.summary.totalExpense).toBe(1500000);
      expect(result.summary.totalSavings).toBe(100000);
      expect(result.summary.netAmount).toBe(1500000); // 3000000 - 1500000
      expect(result.summary.balance).toBe(1400000); // carryOver(0) + 3000000 - 1500000 - 100000
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
      (prisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: 3000000 } }) // income
        .mockResolvedValueOnce({ _sum: { amount: 1500000 } }) // expense
        .mockResolvedValueOnce({ _sum: { amount: null }, _count: 0 }) // monthlySavings
        .mockResolvedValueOnce({ _sum: { amount: 0 } }) // previousIncome
        .mockResolvedValueOnce({ _sum: { amount: 0 } }) // previousExpense
        .mockResolvedValueOnce({ _sum: { amount: 0 } }); // previousSavings

      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([]) // categoryStats
        .mockResolvedValueOnce([]); // transactionCounts

      (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.category.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.budget.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // category budgets
        .mockResolvedValueOnce([]); // overall budget

      const result = await getTransactionSummary(userId, year, month);

      expect(result.savings.primaryGoal).toBeNull();
      expect(result.savings.targetAmount).toBe(0);
    });

    it('거래가 없으면 0으로 반환해야 함', async () => {
      jest.clearAllMocks();
      (prisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: null } }) // income
        .mockResolvedValueOnce({ _sum: { amount: null } }) // expense
        .mockResolvedValueOnce({ _sum: { amount: null }, _count: 0 }) // monthlySavings
        .mockResolvedValueOnce({ _sum: { amount: null } }) // previousIncome
        .mockResolvedValueOnce({ _sum: { amount: null } }) // previousExpense
        .mockResolvedValueOnce({ _sum: { amount: null } }); // previousSavings

      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([]) // categoryStats
        .mockResolvedValueOnce([]); // transactionCounts

      (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.category.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.budget.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // category budgets
        .mockResolvedValueOnce([]); // overall budget

      const result = await getTransactionSummary(userId, year, month);

      expect(result.summary.totalIncome).toBe(0);
      expect(result.summary.totalExpense).toBe(0);
      expect(result.categories).toHaveLength(0);
    });

    it('전체 예산이 없으면 0으로 처리해야 함', async () => {
      jest.clearAllMocks();
      (prisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: 3000000 } }) // income
        .mockResolvedValueOnce({ _sum: { amount: 1500000 } }) // expense
        .mockResolvedValueOnce({ _sum: { amount: 100000 }, _count: 2 }) // monthlySavings
        .mockResolvedValueOnce({ _sum: { amount: 0 } }) // previousIncome
        .mockResolvedValueOnce({ _sum: { amount: 0 } }) // previousExpense
        .mockResolvedValueOnce({ _sum: { amount: 0 } }); // previousSavings

      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([ // categoryStats
          { categoryId: 'cat-1', _sum: { amount: 500000 }, _count: 15 },
          { categoryId: 'cat-2', _sum: { amount: 300000 }, _count: 8 },
        ])
        .mockResolvedValueOnce([ // transactionCounts
          { type: 'INCOME', _count: 2 },
          { type: 'EXPENSE', _count: 23 },
        ]);

      (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue([
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
      ]);

      (prisma.category.findMany as jest.Mock).mockResolvedValue([
        { id: 'cat-1', name: '식비', icon: '🍽️', color: '#EF4444', defaultBudget: 600000 },
        { id: 'cat-2', name: '교통비', icon: '🚗', color: '#3B82F6', defaultBudget: 200000 },
      ]);

      (prisma.budget.findMany as jest.Mock)
        .mockResolvedValueOnce([ // category budgets (only cat-1 specific budget, no overall)
          { id: 'budget-1', categoryId: 'cat-1', amount: 500000 },
        ])
        .mockResolvedValueOnce([]); // overall budget - empty

      const result = await getTransactionSummary(userId, year, month);

      expect(result.budget.amount).toBe(0);
      expect(result.budget.usagePercent).toBe(0);
    });
  });
});
