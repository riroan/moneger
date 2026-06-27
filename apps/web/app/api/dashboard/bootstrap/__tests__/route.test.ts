import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getOrSeedCategories } from '@/lib/services/category.service';
import { getTransactionSummary } from '@/lib/services/summary.service';
import { getOldestTransactionDate, getRecentTransactions, getTodaySummary } from '@/lib/services/transaction.service';

jest.mock('@/lib/services/category.service', () => ({
  getOrSeedCategories: jest.fn(),
}));

jest.mock('@/lib/services/summary.service', () => ({
  getTransactionSummary: jest.fn(),
}));

jest.mock('@/lib/services/transaction.service', () => ({
  getOldestTransactionDate: jest.fn(),
  getRecentTransactions: jest.fn(),
  getTodaySummary: jest.fn(),
}));

const mockGetOrSeedCategories = getOrSeedCategories as jest.Mock;
const mockGetTransactionSummary = getTransactionSummary as jest.Mock;
const mockGetOldestTransactionDate = getOldestTransactionDate as jest.Mock;
const mockGetRecentTransactions = getRecentTransactions as jest.Mock;
const mockGetTodaySummary = getTodaySummary as jest.Mock;

function makeRequest(url: string) {
  return new NextRequest(url);
}

function makeSummary(balance: number) {
  return {
    summary: {
      totalIncome: 0,
      totalExpense: 0,
      totalSavings: 0,
      netAmount: 0,
      balance,
      carryOverBalance: 0,
    },
    categories: [],
    transactionCount: { income: 0, expense: 0 },
    savings: { totalAmount: 0, targetAmount: 0, count: 0, primaryGoal: null },
  };
}

describe('GET /api/dashboard/bootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrSeedCategories.mockResolvedValue([{ id: 'cat-1', name: '식비' }]);
    mockGetOldestTransactionDate.mockResolvedValue(new Date('2026-01-15T00:00:00.000Z'));
    mockGetRecentTransactions.mockResolvedValue([{ id: 'tx-1' }]);
    mockGetTodaySummary.mockResolvedValue({ expense: { total: 1000, count: 1 } });
    mockGetTransactionSummary
      .mockResolvedValueOnce(makeSummary(120000))
      .mockResolvedValueOnce(makeSummary(90000));
  });

  it('returns dashboard bootstrap data in one response', async () => {
    const response = await GET(makeRequest('http://localhost:3000/api/dashboard/bootstrap?userId=user-1&year=2026&month=6'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.categories).toEqual([{ id: 'cat-1', name: '식비' }]);
    expect(data.data.oldestTransactionDate).toEqual({
      date: '2026-01-15T00:00:00.000Z',
      year: 2026,
      month: 1,
    });
    expect(data.data.recentTransactions).toEqual([{ id: 'tx-1' }]);
    expect(data.data.summary.summary.balance).toBe(120000);
    expect(data.data.lastMonthBalance).toBe(90000);
    expect(mockGetRecentTransactions).toHaveBeenCalledWith('user-1', 10);
    expect(mockGetTransactionSummary).toHaveBeenNthCalledWith(1, 'user-1', 2026, 6);
    expect(mockGetTransactionSummary).toHaveBeenNthCalledWith(2, 'user-1', 2026, 5);
  });

  it('validates required query params', async () => {
    const response = await GET(makeRequest('http://localhost:3000/api/dashboard/bootstrap?userId=user-1'));

    expect(response.status).toBe(400);
    expect(mockGetOrSeedCategories).not.toHaveBeenCalled();
  });
});
