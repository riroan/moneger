import { NextRequest } from 'next/server';
import { GET } from '../route';
import { prisma } from '@/lib/prisma';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      findMany: jest.fn(),
    },
    budget: {
      findFirst: jest.fn(),
    },
  },
}));

describe('GET /api/transactions/summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('월별 거래 요약을 성공적으로 반환해야 함', async () => {
    const mockTransactions = [
      {
        id: '1',
        type: 'INCOME',
        amount: 100000,
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: '급여', type: 'INCOME', color: '#10B981', icon: '💰' },
      },
      {
        id: '2',
        type: 'EXPENSE',
        amount: 30000,
        categoryId: 'cat-2',
        category: { id: 'cat-2', name: '식비', type: 'EXPENSE', color: '#EF4444', icon: '🍽️' },
      },
      {
        id: '3',
        type: 'EXPENSE',
        amount: 20000,
        categoryId: 'cat-2',
        category: { id: 'cat-2', name: '식비', type: 'EXPENSE', color: '#EF4444', icon: '🍽️' },
      },
    ];

    const mockBudget = {
      id: 'budget-1',
      amount: 200000,
      month: new Date('2024-01-01'),
    };

    (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue(mockBudget);

    const url = new URL('http://localhost:3000/api/transactions/summary');
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
    expect(data.data.summary.netAmount).toBe(50000);
    expect(data.data.budget.amount).toBe(200000);
    expect(data.data.budget.used).toBe(50000);
    expect(data.data.budget.remaining).toBe(150000);
    expect(data.data.budget.usagePercent).toBe(25);
  });

  it('카테고리별 통계를 금액순으로 정렬해야 함', async () => {
    const mockTransactions = [
      {
        id: '1',
        type: 'EXPENSE',
        amount: 10000,
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: '교통비', type: 'EXPENSE', color: '#F59E0B', icon: '🚗' },
      },
      {
        id: '2',
        type: 'EXPENSE',
        amount: 30000,
        categoryId: 'cat-2',
        category: { id: 'cat-2', name: '식비', type: 'EXPENSE', color: '#EF4444', icon: '🍽️' },
      },
      {
        id: '3',
        type: 'EXPENSE',
        amount: 20000,
        categoryId: 'cat-3',
        category: { id: 'cat-3', name: '쇼핑', type: 'EXPENSE', color: '#EC4899', icon: '🛍️' },
      },
    ];

    (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue(null);

    const url = new URL('http://localhost:3000/api/transactions/summary');
    url.searchParams.set('userId', 'user-1');
    url.searchParams.set('year', '2024');
    url.searchParams.set('month', '1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.categories).toHaveLength(3);
    expect(data.data.categories[0].name).toBe('식비');
    expect(data.data.categories[0].total).toBe(30000);
    expect(data.data.categories[1].name).toBe('쇼핑');
    expect(data.data.categories[1].total).toBe(20000);
    expect(data.data.categories[2].name).toBe('교통비');
    expect(data.data.categories[2].total).toBe(10000);
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const url = new URL('http://localhost:3000/api/transactions/summary');
    url.searchParams.set('year', '2024');
    url.searchParams.set('month', '1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('year나 month가 없으면 400 에러를 반환해야 함', async () => {
    const url = new URL('http://localhost:3000/api/transactions/summary');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('year and month are required');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.transaction.findMany as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );

    const url = new URL('http://localhost:3000/api/transactions/summary');
    url.searchParams.set('userId', 'user-1');
    url.searchParams.set('year', '2024');
    url.searchParams.set('month', '1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch transaction summary');
  });
});
