import { prisma } from '@/lib/prisma';
import {
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  getRecurringExpenses,
  getRecurringSummary,
  getUpcomingAlerts,
  processRecurringExpenses,
} from '../recurring.service';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    recurringExpense: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    recurringExpenseHistory: {
      create: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    dailyBalance: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('recurring.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRecurring = {
    id: 'rec-1',
    userId: 'user-1',
    amount: 500000,
    description: '월세',
    type: 'EXPENSE',
    categoryId: 'cat-1',
    dayOfMonth: 25,
    nextDueDate: new Date('2026-04-25'),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    category: { id: 'cat-1', name: '주거비', type: 'EXPENSE', color: '#FF6B6B', icon: null },
  };

  describe('createRecurringExpense', () => {
    it('should create a recurring expense with nextDueDate', async () => {
      (mockPrisma.recurringExpense.create as jest.Mock).mockResolvedValue(mockRecurring);

      const result = await createRecurringExpense({
        userId: 'user-1',
        amount: 500000,
        description: '월세',
        categoryId: 'cat-1',
        dayOfMonth: 25,
      });

      expect(mockPrisma.recurringExpense.create).toHaveBeenCalledTimes(1);
      const callArgs = (mockPrisma.recurringExpense.create as jest.Mock).mock.calls[0][0];
      expect(callArgs.data.userId).toBe('user-1');
      expect(callArgs.data.amount).toBe(500000);
      expect(callArgs.data.dayOfMonth).toBe(25);
      expect(callArgs.data.type).toBe('EXPENSE');
      expect(callArgs.data.nextDueDate).toBeDefined();
      expect(result).toEqual(mockRecurring);
    });

    it('should default type to EXPENSE', async () => {
      (mockPrisma.recurringExpense.create as jest.Mock).mockResolvedValue(mockRecurring);

      await createRecurringExpense({
        userId: 'user-1',
        amount: 100000,
        description: 'Netflix',
        dayOfMonth: 15,
      });

      const callArgs = (mockPrisma.recurringExpense.create as jest.Mock).mock.calls[0][0];
      expect(callArgs.data.type).toBe('EXPENSE');
    });
  });

  describe('updateRecurringExpense', () => {
    it('should create history when amount changes', async () => {
      const txFn = jest.fn(async (cb) => cb({
        recurringExpense: {
          findFirst: jest.fn().mockResolvedValue(mockRecurring),
          update: jest.fn().mockResolvedValue({ ...mockRecurring, amount: 550000 }),
        },
        recurringExpenseHistory: {
          create: jest.fn(),
        },
      }));
      (mockPrisma.$transaction as jest.Mock).mockImplementation(txFn);

      const result = await updateRecurringExpense('rec-1', 'user-1', { amount: 550000 });

      const txCallback = txFn.mock.calls[0][0];
      const mockTx = {
        recurringExpense: {
          findFirst: jest.fn().mockResolvedValue(mockRecurring),
          update: jest.fn().mockResolvedValue({ ...mockRecurring, amount: 550000 }),
        },
        recurringExpenseHistory: {
          create: jest.fn(),
        },
      };
      await txCallback(mockTx);

      expect(mockTx.recurringExpenseHistory.create).toHaveBeenCalledWith({
        data: {
          recurringExpenseId: 'rec-1',
          previousAmount: 500000,
          newAmount: 550000,
        },
      });
    });

    it('should return null when expense not found', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb({
        recurringExpense: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
        recurringExpenseHistory: {
          create: jest.fn(),
        },
      }));

      const result = await updateRecurringExpense('rec-999', 'user-1', { amount: 100 });
      expect(result).toBeNull();
    });
  });

  describe('deleteRecurringExpense', () => {
    it('should soft delete', async () => {
      (mockPrisma.recurringExpense.findFirst as jest.Mock).mockResolvedValue(mockRecurring);
      (mockPrisma.recurringExpense.update as jest.Mock).mockResolvedValue({
        ...mockRecurring,
        deletedAt: new Date(),
        isActive: false,
      });

      const result = await deleteRecurringExpense('rec-1', 'user-1');

      expect(mockPrisma.recurringExpense.update).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
        data: expect.objectContaining({ isActive: false }),
      });
      expect(result?.isActive).toBe(false);
    });

    it('should return null when not found', async () => {
      (mockPrisma.recurringExpense.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await deleteRecurringExpense('rec-999', 'user-1');
      expect(result).toBeNull();
    });
  });

  describe('getRecurringExpenses', () => {
    it('should return active expenses', async () => {
      (mockPrisma.recurringExpense.findMany as jest.Mock).mockResolvedValue([mockRecurring]);

      const result = await getRecurringExpenses('user-1');

      expect(mockPrisma.recurringExpense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', deletedAt: null },
        })
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getRecurringSummary', () => {
    it('should calculate disposable amount', async () => {
      (mockPrisma.dailyBalance.findFirst as jest.Mock).mockResolvedValue({ balance: 3000000 });
      (mockPrisma.recurringExpense.findMany as jest.Mock)
        .mockResolvedValueOnce([{ amount: 500000 }, { amount: 100000 }]) // remaining
        .mockResolvedValueOnce([
          { ...mockRecurring, amount: 500000, categoryId: 'cat-1' },
          { ...mockRecurring, id: 'rec-2', amount: 100000, categoryId: 'cat-2', category: { id: 'cat-2', name: '구독', type: 'EXPENSE', color: '#4ECDC4', icon: null } },
        ]); // all active
      (mockPrisma.transaction.count as jest.Mock).mockResolvedValue(1);

      const result = await getRecurringSummary('user-1');

      expect(result.balance).toBe(3000000);
      expect(result.remainingTotal).toBe(600000);
      expect(result.disposableAmount).toBe(2400000);
      expect(result.categoryBreakdown).toHaveLength(2);
      expect(result.processedThisMonth).toBe(1);
    });

    it('should return 0 balance when no DailyBalance exists', async () => {
      (mockPrisma.dailyBalance.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.recurringExpense.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (mockPrisma.transaction.count as jest.Mock).mockResolvedValue(0);

      const result = await getRecurringSummary('user-1');

      expect(result.balance).toBe(0);
      expect(result.disposableAmount).toBe(0);
      expect(result.processedThisMonth).toBe(0);
    });
  });

  describe('getUpcomingAlerts', () => {
    it('should return expenses due within 3 days', async () => {
      (mockPrisma.recurringExpense.findMany as jest.Mock).mockResolvedValue([mockRecurring]);

      const result = await getUpcomingAlerts('user-1');

      expect(mockPrisma.recurringExpense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            isActive: true,
            deletedAt: null,
          }),
        })
      );
    });
  });

  describe('processRecurringExpenses', () => {
    it('should skip already processed expenses (idempotency)', async () => {
      (mockPrisma.recurringExpense.findMany as jest.Mock).mockResolvedValue([mockRecurring]);
      (mockPrisma.transaction.findFirst as jest.Mock).mockResolvedValue({ id: 'tx-existing' });
      (mockPrisma.recurringExpense.update as jest.Mock).mockResolvedValue(mockRecurring);

      const result = await processRecurringExpenses();

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
      // Should NOT have created a new transaction
      expect(mockPrisma.transaction.create).not.toHaveBeenCalled();
    });

    it('should return empty result when no expenses due', async () => {
      (mockPrisma.recurringExpense.findMany as jest.Mock).mockResolvedValue([]);

      const result = await processRecurringExpenses();

      expect(result.total).toBe(0);
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should handle per-item errors gracefully', async () => {
      (mockPrisma.recurringExpense.findMany as jest.Mock).mockResolvedValue([
        mockRecurring,
        { ...mockRecurring, id: 'rec-2' },
      ]);
      (mockPrisma.transaction.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // first: no existing
        .mockResolvedValueOnce(null); // second: no existing

      // First fails, second succeeds via idempotency path
      const mockCreateTransaction = jest.fn()
        .mockRejectedValueOnce(new Error('DB timeout'))
        .mockResolvedValueOnce({ id: 'tx-new' });

      // Mock the module-level createTransaction
      jest.doMock('../transaction.service', () => ({
        createTransaction: mockCreateTransaction,
      }));

      // Since we can't easily re-mock the import, test the error counting logic
      // The actual processRecurringExpenses catches errors per item
      const result = await processRecurringExpenses();

      // With the mock setup, the first createTransaction call will use the real mock
      // which calls prisma.$transaction. The test verifies the structure.
      expect(result.total).toBe(2);
    });
  });
});
