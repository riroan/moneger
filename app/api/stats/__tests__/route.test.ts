import { NextRequest } from 'next/server';
import { GET } from '../route';
import { prisma } from '@/lib/prisma';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      findMany: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    budget: {
      findFirst: jest.fn(),
    },
  },
}));

describe('GET /api/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('통계 데이터를 성공적으로 반환해야 함', async () => {
    const mockTransactions = [
      {
        id: 'trans-1',
        userId: 'user-1',
        type: 'INCOME',
        amount: 100000,
        date: new Date('2024-01-15'),
        category: { id: 'cat-1', name: '급여', type: 'INCOME', color: '#10B981', icon: '💰' },
      },
      {
        id: 'trans-2',
        userId: 'user-1',
        type: 'EXPENSE',
        amount: 30000,
        date: new Date('2024-01-16'),
        category: { id: 'cat-2', name: '식비', type: 'EXPENSE', color: '#EF4444', icon: '🍽️' },
      },
      {
        id: 'trans-3',
        userId: 'user-1',
        type: 'EXPENSE',
        amount: 20000,
        date: new Date('2024-01-17'),
        category: { id: 'cat-2', name: '식비', type: 'EXPENSE', color: '#EF4444', icon: '🍽️' },
      },
    ];

    (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue(null);

    const url = new URL('http://localhost:3000/api/stats');
    url.searchParams.set('userId', 'user-1');
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
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue(null);

    const url = new URL('http://localhost:3000/api/stats');
    url.searchParams.set('userId', 'user-1');
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

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const url = new URL('http://localhost:3000/api/stats');
    url.searchParams.set('year', '2024');
    url.searchParams.set('month', '1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('year가 없으면 400 에러를 반환해야 함', async () => {
    const url = new URL('http://localhost:3000/api/stats');
    url.searchParams.set('userId', 'user-1');
    url.searchParams.set('month', '1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('year and month are required');
  });

  it('month가 없으면 400 에러를 반환해야 함', async () => {
    const url = new URL('http://localhost:3000/api/stats');
    url.searchParams.set('userId', 'user-1');
    url.searchParams.set('year', '2024');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('year and month are required');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.transaction.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const url = new URL('http://localhost:3000/api/stats');
    url.searchParams.set('userId', 'user-1');
    url.searchParams.set('year', '2024');
    url.searchParams.set('month', '1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch stats');
  });
});
