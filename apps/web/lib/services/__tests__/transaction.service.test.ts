import { prisma } from '@/lib/prisma';
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  findTransaction,
  getTransactions,
  getRecentTransactions,
  getOldestTransactionDate,
  validateCategory,
} from '../transaction.service';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    savingsGoal: {
      update: jest.fn(),
    },
    dailyBalance: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('transaction.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTransaction = {
    id: 'tx-1',
    userId: 'user-1',
    type: 'EXPENSE',
    amount: 10000,
    description: '점심',
    categoryId: 'cat-1',
    date: new Date('2024-01-15'),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    savingsGoalId: null,
    category: { id: 'cat-1', name: '식비', type: 'EXPENSE', color: '#EF4444', icon: '🍽️' },
  };

  describe('createTransaction', () => {
    it('거래를 생성하고 DailyBalance를 업데이트해야 함', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            create: jest.fn().mockResolvedValue(mockTransaction),
            aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 10000 } }),
          },
          dailyBalance: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const result = await createTransaction({
        userId: 'user-1',
        type: 'EXPENSE',
        amount: 10000,
        description: '점심',
        categoryId: 'cat-1',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual(mockTransaction);
    });

    it('날짜를 지정하여 거래를 생성할 수 있음', async () => {
      const customDate = new Date('2024-02-01');
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            create: jest.fn().mockResolvedValue({ ...mockTransaction, date: customDate }),
            aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
          },
          dailyBalance: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const result = await createTransaction({
        userId: 'user-1',
        type: 'EXPENSE',
        amount: 10000,
        date: customDate,
      });

      expect(result.date).toEqual(customDate);
    });
  });

  describe('updateTransaction', () => {
    it('거래를 수정하고 DailyBalance를 업데이트해야 함', async () => {
      const updatedTransaction = { ...mockTransaction, amount: 20000 };
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            update: jest.fn().mockResolvedValue(updatedTransaction),
            aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
          },
          dailyBalance: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: jest.fn().mockResolvedValue({}),
          },
          savingsGoal: {
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const existingTransaction = {
        date: new Date('2024-01-15'),
        amount: 10000,
        savingsGoalId: null,
      };

      const result = await updateTransaction('tx-1', 'user-1', { amount: 20000 }, existingTransaction);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.amount).toBe(20000);
    });

    it('날짜가 변경되면 두 날짜 모두 DailyBalance를 업데이트해야 함', async () => {
      const newDate = new Date('2024-01-20');
      const updatedTransaction = { ...mockTransaction, date: newDate };
      let dailyBalanceUpdateCount = 0;

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            update: jest.fn().mockResolvedValue(updatedTransaction),
            aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
          },
          dailyBalance: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: jest.fn().mockImplementation(() => {
              dailyBalanceUpdateCount++;
              return Promise.resolve({});
            }),
          },
          savingsGoal: {
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const existingTransaction = {
        date: new Date('2024-01-15'),
        amount: 10000,
        savingsGoalId: null,
      };

      await updateTransaction('tx-1', 'user-1', { date: newDate }, existingTransaction);

      // 기존 날짜 + 새 날짜 = 2회
      expect(dailyBalanceUpdateCount).toBe(2);
    });

    it('저축 거래 금액이 변경되면 저축 목표도 업데이트해야 함', async () => {
      let savingsGoalUpdated = false;

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            update: jest.fn().mockResolvedValue(mockTransaction),
            aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
          },
          dailyBalance: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: jest.fn().mockResolvedValue({}),
          },
          savingsGoal: {
            update: jest.fn().mockImplementation(() => {
              savingsGoalUpdated = true;
              return Promise.resolve({});
            }),
          },
        };
        return callback(tx);
      });

      const existingTransaction = {
        date: new Date('2024-01-15'),
        amount: 10000,
        savingsGoalId: 'savings-1',
      };

      await updateTransaction('tx-1', 'user-1', { amount: 15000 }, existingTransaction);

      expect(savingsGoalUpdated).toBe(true);
    });
  });

  describe('deleteTransaction', () => {
    it('거래를 소프트 삭제하고 DailyBalance를 업데이트해야 함', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            update: jest.fn().mockResolvedValue({}),
            aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
          },
          dailyBalance: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: jest.fn().mockResolvedValue({}),
          },
          savingsGoal: {
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const existingTransaction = {
        date: new Date('2024-01-15'),
        amount: 10000,
        savingsGoalId: null,
      };

      await deleteTransaction('tx-1', 'user-1', existingTransaction);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('저축 거래 삭제 시 저축 목표 금액을 차감해야 함', async () => {
      let savingsGoalDecremented = false;

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            update: jest.fn().mockResolvedValue({}),
            aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
          },
          dailyBalance: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: jest.fn().mockResolvedValue({}),
          },
          savingsGoal: {
            update: jest.fn().mockImplementation((args) => {
              if (args.data.currentAmount?.decrement) {
                savingsGoalDecremented = true;
              }
              return Promise.resolve({});
            }),
          },
        };
        return callback(tx);
      });

      const existingTransaction = {
        date: new Date('2024-01-15'),
        amount: 50000,
        savingsGoalId: 'savings-1',
      };

      await deleteTransaction('tx-1', 'user-1', existingTransaction);

      expect(savingsGoalDecremented).toBe(true);
    });
  });

  describe('findTransaction', () => {
    it('거래를 찾아야 함', async () => {
      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(mockTransaction);

      const result = await findTransaction('tx-1', 'user-1');

      expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
        where: { id: 'tx-1', userId: 'user-1', deletedAt: null },
        select: expect.objectContaining({
          id: true,
          amount: true,
          type: true,
          savingsGoalId: true,
        }),
      });
      expect(result).toEqual(mockTransaction);
    });

    it('존재하지 않는 거래는 null을 반환해야 함', async () => {
      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await findTransaction('invalid-id', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('getTransactions', () => {
    const mockTransactions = [mockTransaction];

    it('거래 목록을 조회해야 함', async () => {
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

      const result = await getTransactions({ userId: 'user-1' });

      expect(result.data).toEqual(mockTransactions);
      expect(result.hasMore).toBe(false);
    });

    it('연도/월로 필터링해야 함', async () => {
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

      await getTransactions({ userId: 'user-1', year: 2024, month: 1 });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('타입으로 필터링해야 함', async () => {
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

      await getTransactions({ userId: 'user-1', type: 'EXPENSE' });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'EXPENSE',
            savingsGoalId: null, // 지출 필터 시 저축 거래 제외
          }),
        })
      );
    });

    it('검색어로 필터링해야 함', async () => {
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

      await getTransactions({ userId: 'user-1', search: '점심' });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            description: { contains: '점심', mode: 'insensitive' },
          }),
        })
      );
    });

    it('페이지네이션이 작동해야 함', async () => {
      const manyTransactions = Array.from({ length: 21 }, (_, i) => ({
        ...mockTransaction,
        id: `tx-${i}`,
      }));
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue(manyTransactions);

      const result = await getTransactions({ userId: 'user-1', limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('tx-19');
    });

    it('저축 거래만 필터링해야 함', async () => {
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

      await getTransactions({ userId: 'user-1', savingsOnly: true });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            savingsGoalId: { not: null },
          }),
        })
      );
    });

    it('금액 범위로 필터링해야 함', async () => {
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

      await getTransactions({ userId: 'user-1', minAmount: 5000, maxAmount: 50000 });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            amount: { gte: 5000, lte: 50000 },
          }),
        })
      );
    });

    it('정렬 옵션이 작동해야 함', async () => {
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

      await getTransactions({ userId: 'user-1', sort: 'expensive' });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { amount: 'desc' },
        })
      );
    });
  });

  describe('getRecentTransactions', () => {
    it('최근 거래를 조회해야 함', async () => {
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([mockTransaction]);

      const result = await getRecentTransactions('user-1', 5);

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
        include: { category: { select: expect.any(Object) } },
        orderBy: { date: 'desc' },
        take: 5,
      });
      expect(result).toEqual([mockTransaction]);
    });
  });

  describe('getOldestTransactionDate', () => {
    it('가장 오래된 거래 날짜를 반환해야 함', async () => {
      const oldDate = new Date('2023-01-01');
      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({ date: oldDate });

      const result = await getOldestTransactionDate('user-1');

      expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
        orderBy: { date: 'asc' },
        select: { date: true },
      });
      expect(result).toEqual(oldDate);
    });

    it('거래가 없으면 null을 반환해야 함', async () => {
      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await getOldestTransactionDate('user-1');

      expect(result).toBeNull();
    });
  });

  describe('validateCategory', () => {
    it('유효한 카테고리를 반환해야 함', async () => {
      const mockCategory = { id: 'cat-1', name: '식비', type: 'EXPENSE', userId: 'user-1' };
      (prisma.category.findFirst as jest.Mock).mockResolvedValue(mockCategory);

      const result = await validateCategory('cat-1', 'user-1', 'EXPENSE');

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-1', userId: 'user-1', type: 'EXPENSE', deletedAt: null },
      });
      expect(result).toEqual(mockCategory);
    });

    it('유효하지 않은 카테고리는 null을 반환해야 함', async () => {
      (prisma.category.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await validateCategory('invalid', 'user-1', 'EXPENSE');

      expect(result).toBeNull();
    });
  });
});
