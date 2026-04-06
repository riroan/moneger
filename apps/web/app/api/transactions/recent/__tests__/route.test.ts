import { NextRequest } from 'next/server';
import { GET } from '../route';
import { prisma } from '@/lib/prisma';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('GET /api/transactions/recent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('최근 거래를 성공적으로 반환해야 함', async () => {
    const mockTransactions = [
      {
        id: 'trans-1',
        userId: 'user-1',
        type: 'EXPENSE',
        amount: 10000,
        description: '점심',
        categoryId: 'cat-1',
        date: new Date('2024-01-15'),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        category: {
          id: 'cat-1',
          name: '식비',
          type: 'EXPENSE',
          color: '#EF4444',
          icon: '🍽️',
        },
      },
      {
        id: 'trans-2',
        userId: 'user-1',
        type: 'INCOME',
        amount: 50000,
        description: '급여',
        categoryId: 'cat-2',
        date: new Date('2024-01-14'),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        category: {
          id: 'cat-2',
          name: '급여',
          type: 'INCOME',
          color: '#10B981',
          icon: '💰',
        },
      },
    ];

    (prisma.transaction.count as jest.Mock).mockResolvedValue(2);
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

    const url = new URL('http://localhost:3000/api/transactions/recent');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        deletedAt: null,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            color: true,
            icon: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 10,
      skip: 0,
    });
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const url = new URL('http://localhost:3000/api/transactions/recent');
    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('limit 파라미터를 지정할 수 있어야 함', async () => {
    (prisma.transaction.count as jest.Mock).mockResolvedValue(0);
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

    const url = new URL('http://localhost:3000/api/transactions/recent');
    url.searchParams.set('userId', 'user-1');
    url.searchParams.set('limit', '5');

    const request = new NextRequest(url);
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
      })
    );
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.transaction.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const url = new URL('http://localhost:3000/api/transactions/recent');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch recent transactions');
  });

  it('type 파라미터로 필터링할 수 있어야 함', async () => {
    const mockTransactions = [
      {
        id: 'trans-1',
        type: 'EXPENSE',
        amount: 10000,
        category: { id: 'cat-1', name: '식비', type: 'EXPENSE', color: '#EF4444', icon: '🍽️' },
      },
    ];
    (prisma.transaction.count as jest.Mock).mockResolvedValue(1);
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

    const url = new URL('http://localhost:3000/api/transactions/recent');
    url.searchParams.set('userId', 'user-1');
    url.searchParams.set('type', 'EXPENSE');

    const request = new NextRequest(url);
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'EXPENSE',
        }),
      })
    );
  });

  it('limit이 100을 초과하면 100으로 제한되어야 함', async () => {
    (prisma.transaction.count as jest.Mock).mockResolvedValue(0);
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

    const url = new URL('http://localhost:3000/api/transactions/recent');
    url.searchParams.set('userId', 'user-1');
    url.searchParams.set('limit', '200');

    const request = new NextRequest(url);
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    );
  });
});
