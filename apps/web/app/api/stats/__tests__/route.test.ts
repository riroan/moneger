import { NextRequest } from 'next/server';
import { GET } from '../route';
import { prisma } from '@/lib/prisma';
import { __setMockSessionUserId } from '@/lib/session';

jest.mock('@/lib/session');

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
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe('GET /api/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __setMockSessionUserId('user-1');
  });

  it('통계 데이터를 성공적으로 반환해야 함', async () => {
    // aggregate mocks
    (prisma.transaction.aggregate as jest.Mock)
      .mockResolvedValueOnce({ _sum: { amount: 100000 } }) // income
      .mockResolvedValueOnce({ _sum: { amount: 50000 } }); // expense

    // count mocks
    (prisma.transaction.count as jest.Mock)
      .mockResolvedValueOnce(1) // income count
      .mockResolvedValueOnce(2); // expense count

    // groupBy mocks
    (prisma.transaction.groupBy as jest.Mock)
      .mockResolvedValueOnce([ // category breakdown
        { categoryId: 'cat-2', _sum: { amount: 50000 }, _count: 2 },
      ])
      .mockResolvedValueOnce([]); // last 7 days

    // category mock
    (prisma.category.findMany as jest.Mock).mockResolvedValue([
      { id: 'cat-2', name: '식비', color: '#EF4444', icon: '🍽️' },
    ]);

    (prisma.budget.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.budget.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ defaultExpenseBudget: null });

    const url = new URL('http://localhost:3000/api/stats');
    url.searchParams.set('year', '2024');
    url.searchParams.set('month', '1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.summary.totalIncome).toBe(100000);
    expect(data.data.summary.totalExpense).toBe(50000);
    expect(data.data.summary.balance).toBe(50000);
    expect(data.data.summary.transactionCount).toBe(3);
  });

  it('거래가 없을 때 0으로 반환해야 함', async () => {
    // aggregate mocks
    (prisma.transaction.aggregate as jest.Mock)
      .mockResolvedValueOnce({ _sum: { amount: null } }) // income
      .mockResolvedValueOnce({ _sum: { amount: null } }); // expense

    // count mocks
    (prisma.transaction.count as jest.Mock)
      .mockResolvedValueOnce(0) // income count
      .mockResolvedValueOnce(0); // expense count

    // groupBy mocks
    (prisma.transaction.groupBy as jest.Mock)
      .mockResolvedValueOnce([]) // category breakdown
      .mockResolvedValueOnce([]); // last 7 days

    // category mock
    (prisma.category.findMany as jest.Mock).mockResolvedValue([]);

    (prisma.budget.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.budget.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ defaultExpenseBudget: null });

    const url = new URL('http://localhost:3000/api/stats');
    url.searchParams.set('year', '2024');
    url.searchParams.set('month', '1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.summary.totalIncome).toBe(0);
    expect(data.data.summary.totalExpense).toBe(0);
    expect(data.data.summary.balance).toBe(0);
    expect(data.data.summary.transactionCount).toBe(0);
  });

  it('세션이 없으면 401 에러를 반환해야 함', async () => {
    __setMockSessionUserId(null);

    const url = new URL('http://localhost:3000/api/stats');
    url.searchParams.set('year', '2024');
    url.searchParams.set('month', '1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('year가 없으면 400 에러를 반환해야 함', async () => {
    const url = new URL('http://localhost:3000/api/stats');
    url.searchParams.set('month', '1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('year and month are required');
  });

  it('month가 없으면 400 에러를 반환해야 함', async () => {
    const url = new URL('http://localhost:3000/api/stats');
    url.searchParams.set('year', '2024');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('year and month are required');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.transaction.aggregate as jest.Mock).mockRejectedValue(new Error('Database error'));

    const url = new URL('http://localhost:3000/api/stats');
    url.searchParams.set('year', '2024');
    url.searchParams.set('month', '1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch stats');
  });
});
