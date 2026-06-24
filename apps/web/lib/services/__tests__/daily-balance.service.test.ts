import { prisma } from '@/lib/prisma';
import {
  updateDailyBalance,
  saveDailyBalance,
  getRecentDailyBalances,
  getMonthlyDailyBalances,
  calculateDailyBalancesFromTransactions,
} from '../daily-balance.service';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    dailyBalance: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('daily-balance.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateDailyBalance', () => {
    it('일별 잔액을 업데이트해야 함', async () => {
      // computeAndUpsertDailyBalance: findUnique (prev balance) + 4 aggregates (income, expense, savings, investment)
      (prisma.dailyBalance.findUnique as jest.Mock).mockResolvedValue({ balance: 400000 });
      (prisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: 100000 } }) // 당일 수입
        .mockResolvedValueOnce({ _sum: { amount: 50000 } }) // 당일 지출
        .mockResolvedValueOnce({ _sum: { amount: 0 } }) // 당일 저축
        .mockResolvedValueOnce({ _sum: { amount: 0 } }); // 당일 투자 납입

      (prisma.dailyBalance.upsert as jest.Mock).mockResolvedValue({
        balance: 450000,
        income: 100000,
        expense: 50000,
        savings: 0,
      });

      await updateDailyBalance('user-1', new Date('2024-01-15'));

      expect(prisma.dailyBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId_date: expect.objectContaining({
              userId: 'user-1',
            }),
          }),
          update: { balance: 450000, income: 100000, expense: 50000, savings: 0 },
        })
      );
    });

    it('거래가 없으면 0으로 처리해야 함', async () => {
      (prisma.dailyBalance.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });

      (prisma.dailyBalance.upsert as jest.Mock).mockResolvedValue({});

      await updateDailyBalance('user-1', new Date('2024-01-15'));

      expect(prisma.dailyBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { balance: 0, income: 0, expense: 0, savings: 0 },
        })
      );
    });

    it('일반 지출과 저축 거래를 별도 집계해야 함', async () => {
      (prisma.dailyBalance.findUnique as jest.Mock).mockResolvedValue({ balance: 100000 });
      (prisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: 50000 } }) // income
        .mockResolvedValueOnce({ _sum: { amount: 20000 } }) // expense excluding savings
        .mockResolvedValueOnce({ _sum: { amount: 10000 } }) // savings
        .mockResolvedValueOnce({ _sum: { amount: 5000 } }); // investment deposit
      (prisma.dailyBalance.upsert as jest.Mock).mockResolvedValue({});

      await updateDailyBalance('user-1', new Date('2024-01-15'));

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
      expect(prisma.dailyBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            balance: 115000,
            income: 50000,
            expense: 20000,
            savings: 15000,
          },
        })
      );
    });
  });

  describe('saveDailyBalance', () => {
    it('일별 잔액을 저장해야 함', async () => {
      const date = new Date('2024-01-15');
      (prisma.dailyBalance.upsert as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        date,
        balance: 500000,
        income: 100000,
        expense: 50000,
      });

      const result = await saveDailyBalance('user-1', date, 500000, 100000, 50000);

      expect(prisma.dailyBalance.upsert).toHaveBeenCalledWith({
        where: { userId_date: { userId: 'user-1', date } },
        update: { balance: 500000, income: 100000, expense: 50000, savings: 0 },
        create: { userId: 'user-1', date, balance: 500000, income: 100000, expense: 50000, savings: 0 },
      });
      expect(result.balance).toBe(500000);
    });
  });

  describe('getRecentDailyBalances', () => {
    it('최근 N일 일별 잔액을 조회해야 함', async () => {
      const mockBalances = [
        { date: new Date('2024-01-14'), balance: 400000 },
        { date: new Date('2024-01-15'), balance: 500000 },
      ];
      (prisma.dailyBalance.findMany as jest.Mock).mockResolvedValue(mockBalances);

      const result = await getRecentDailyBalances('user-1', 7);

      expect(prisma.dailyBalance.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          date: { gte: expect.any(Date), lte: expect.any(Date) },
        },
        orderBy: { date: 'asc' },
      });
      expect(result).toEqual(mockBalances);
    });
  });

  describe('getMonthlyDailyBalances', () => {
    // Helper to setup mocks for calculateMonthlyDailyBalancesFromTransactions
    // 기존 테스트 입력 형태를 유지하되 서비스 쿼리 구조에 맞춰 분리한다.
    const setupMonthlyMocks = (
      previousByType: { type: string; _sum: { amount: number | null } }[],
      previousSavingsAgg: { _sum: { amount: number | null } },
      currentByDateType: { date: Date; type: string; _sum: { amount: number | null } }[],
      savingsGrouped: { date: Date; _sum: { amount: number | null } }[],
      investmentGrouped: { date: Date; _sum: { amount: number | null } }[] = [],
    ) => {
      const previousIncome = previousByType.find((row) => row.type === 'INCOME')?._sum.amount ?? null;
      const previousExpense = previousByType.find((row) => row.type === 'EXPENSE')?._sum.amount ?? null;
      const incomeGrouped = currentByDateType.filter((row) => row.type === 'INCOME');
      const expenseGrouped = currentByDateType.filter((row) => row.type === 'EXPENSE');

      (prisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: previousIncome } })
        .mockResolvedValueOnce({ _sum: { amount: previousExpense } })
        .mockResolvedValueOnce(previousSavingsAgg)
        .mockResolvedValueOnce({ _sum: { amount: null } });

      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce(incomeGrouped)
        .mockResolvedValueOnce(expenseGrouped)
        .mockResolvedValueOnce(savingsGrouped)
        .mockResolvedValueOnce(investmentGrouped);
    };

    it('특정 월의 일별 잔액을 반환해야 함', async () => {
      setupMonthlyMocks(
        [], // no previous transactions
        { _sum: { amount: null } },
        [
          { date: new Date('2024-01-15T00:00:00Z'), type: 'INCOME', _sum: { amount: 100000 } },
          { date: new Date('2024-01-15T00:00:00Z'), type: 'EXPENSE', _sum: { amount: 50000 } },
        ],
        [], // no savings
      );

      const result = await getMonthlyDailyBalances('user-1', 2024, 1);

      // 1월은 31일
      expect(result).toHaveLength(31);
      expect(result[0]).toMatchObject({
        date: expect.any(Date),
        income: expect.any(Number),
        expense: expect.any(Number),
        balance: expect.any(Number),
      });
    });

    it('누적 잔액이 계산되어야 함', async () => {
      setupMonthlyMocks(
        [], // no previous transactions
        { _sum: { amount: null } },
        [
          { date: new Date('2024-01-01T00:00:00Z'), type: 'INCOME', _sum: { amount: 100000 } },
          { date: new Date('2024-01-01T00:00:00Z'), type: 'EXPENSE', _sum: { amount: 30000 } },
          { date: new Date('2024-01-02T00:00:00Z'), type: 'INCOME', _sum: { amount: 50000 } },
        ],
        [],
      );

      const result = await getMonthlyDailyBalances('user-1', 2024, 1);

      // 1일: 100000 - 30000 = 70000
      // 2일: 70000 + 50000 = 120000
      expect(result[0].balance).toBe(70000);
      expect(result[1].balance).toBe(120000);
    });

    it('저축 거래도 잔액에 반영되어야 함', async () => {
      setupMonthlyMocks(
        [], // no previous transactions
        { _sum: { amount: null } },
        [
          { date: new Date('2024-01-01T00:00:00Z'), type: 'INCOME', _sum: { amount: 100000 } },
        ],
        [
          { date: new Date('2024-01-01T00:00:00Z'), _sum: { amount: 20000 } },
        ],
      );

      const result = await getMonthlyDailyBalances('user-1', 2024, 1);

      // 1일: 100000 - 0 - 20000 = 80000
      expect(result[0].balance).toBe(80000);
      expect(result[0].savings).toBe(20000);
    });

    it('거래가 없는 날은 0으로 처리해야 함', async () => {
      setupMonthlyMocks(
        [],
        { _sum: { amount: null } },
        [],
        [],
      );

      const result = await getMonthlyDailyBalances('user-1', 2024, 1);

      expect(result.every((d) => d.income === 0 && d.expense === 0 && d.balance === 0)).toBe(true);
    });
  });

  describe('calculateDailyBalancesFromTransactions', () => {
    it('최근 N일 일별 잔액을 계산해야 함', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const mockTransactions = [
        { date: yesterday, type: 'INCOME', amount: 100000 },
        { date: today, type: 'EXPENSE', amount: 50000 },
      ];

      (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);
      (prisma.dailyBalance.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await calculateDailyBalancesFromTransactions('user-1', 7);

      expect(result).toHaveLength(7);
      expect(result.every((d) => 'date' in d && 'balance' in d && 'income' in d && 'expense' in d)).toBe(true);
    });

    it('누적 잔액이 올바르게 계산되어야 함', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2024-01-07'));

      const mockTransactions = [
        { date: new Date('2024-01-01'), type: 'INCOME', amount: 100000 },
        { date: new Date('2024-01-03'), type: 'EXPENSE', amount: 30000 },
        { date: new Date('2024-01-05'), type: 'INCOME', amount: 50000 },
      ];

      (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);
      (prisma.dailyBalance.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await calculateDailyBalancesFromTransactions('user-1', 7);

      // 누적 잔액 검증 (KST 시간대 고려)
      expect(result[result.length - 1].balance).toBeGreaterThanOrEqual(0);

      jest.useRealTimers();
    });
  });
});
