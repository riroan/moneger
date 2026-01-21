import { NextRequest } from 'next/server';
import { GET } from '../route';
import { prisma } from '@/lib/prisma';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      aggregate: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('GET /api/transactions/today', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('오늘의 지출/수입 요약을 성공적으로 반환해야 함', async () => {
    (prisma.transaction.aggregate as jest.Mock)
      .mockResolvedValueOnce({ _sum: { amount: 30000 } }) // expense
      .mockResolvedValueOnce({ _sum: { amount: 100000 } }); // income

    (prisma.transaction.count as jest.Mock)
      .mockResolvedValueOnce(2) // expense count
      .mockResolvedValueOnce(1); // income count

    const url = new URL('http://localhost:3000/api/transactions/today');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.expense.total).toBe(30000);
    expect(data.data.expense.count).toBe(2);
    expect(data.data.income.total).toBe(100000);
    expect(data.data.income.count).toBe(1);
    expect(data.data.year).toBeDefined();
    expect(data.data.month).toBeDefined();
    expect(data.data.day).toBeDefined();
    expect(data.data.dayOfWeek).toBeDefined();
  });

  it('거래가 없으면 0을 반환해야 함', async () => {
    (prisma.transaction.aggregate as jest.Mock)
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } });

    (prisma.transaction.count as jest.Mock)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const url = new URL('http://localhost:3000/api/transactions/today');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.expense.total).toBe(0);
    expect(data.data.expense.count).toBe(0);
    expect(data.data.income.total).toBe(0);
    expect(data.data.income.count).toBe(0);
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const url = new URL('http://localhost:3000/api/transactions/today');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.transaction.aggregate as jest.Mock).mockRejectedValue(new Error('Database error'));

    const url = new URL('http://localhost:3000/api/transactions/today');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch today summary');
  });
});
