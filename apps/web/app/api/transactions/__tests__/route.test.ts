import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { prisma } from '@/lib/prisma';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    dailyBalance: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('POST /api/transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('거래를 성공적으로 생성해야 함', async () => {
    const mockTransaction = {
      id: 'test-id',
      userId: 'user-1',
      type: 'EXPENSE',
      amount: 10000,
      description: '점심',
      categoryId: 'category-1',
      date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      category: {
        id: 'category-1',
        name: '식비',
        type: 'EXPENSE',
        color: '#EF4444',
        icon: '🍽️',
      },
    };

    // Mock category findFirst to return a valid category
    (prisma.category.findFirst as jest.Mock).mockResolvedValue({
      id: 'category-1',
      name: '식비',
      type: 'EXPENSE',
      userId: 'user-1',
    });

    // Mock $transaction to simulate the transaction behavior
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      const tx = {
        transaction: {
          create: jest.fn().mockResolvedValue(mockTransaction),
          findMany: jest.fn().mockResolvedValue([mockTransaction]),
          aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
        },
        dailyBalance: {
          findUnique: jest.fn().mockResolvedValue(null),
          upsert: jest.fn().mockResolvedValue({}),
        },
      };
      return callback(tx);
    });

    const request = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        type: 'EXPENSE',
        amount: 10000,
        description: '점심',
        categoryId: 'category-1',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toMatchObject({
      id: 'test-id',
      userId: 'user-1',
      type: 'EXPENSE',
      amount: 10000,
      description: '점심',
      categoryId: 'category-1',
    });
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        type: 'EXPENSE',
        amount: 10000,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('type이 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        amount: 10000,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('type must be INCOME or EXPENSE');
  });

  it('amount가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        type: 'EXPENSE',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('amount must be greater than 0');
  });

  it('amount가 0 이하면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        type: 'EXPENSE',
        amount: 0,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('amount must be greater than 0');
  });

  it('잘못된 type이면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        type: 'INVALID',
        amount: 10000,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('type must be INCOME or EXPENSE');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.$transaction as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );

    const request = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        type: 'EXPENSE',
        amount: 10000,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create transaction');
  });

  it('잘못된 카테고리면 400 에러를 반환해야 함', async () => {
    (prisma.category.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        type: 'EXPENSE',
        amount: 10000,
        categoryId: 'invalid-category',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid category or category type mismatch');
  });
});

describe('GET /api/transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTransactions = [
    {
      id: 'tx-1',
      userId: 'user-1',
      type: 'EXPENSE',
      amount: 10000,
      description: '점심',
      categoryId: 'cat-1',
      date: new Date('2024-01-15'),
      category: { id: 'cat-1', name: '식비', type: 'EXPENSE', color: '#EF4444', icon: '🍽️' },
    },
    {
      id: 'tx-2',
      userId: 'user-1',
      type: 'INCOME',
      amount: 50000,
      description: '급여',
      categoryId: 'cat-2',
      date: new Date('2024-01-10'),
      category: { id: 'cat-2', name: '급여', type: 'INCOME', color: '#10B981', icon: '💰' },
    },
  ];

  it('거래 목록을 성공적으로 조회해야 함', async () => {
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

    const url = new URL('http://localhost:3000/api/transactions');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.hasMore).toBe(false);
  });

  it('연도/월 필터로 거래를 조회해야 함', async () => {
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([mockTransactions[0]]);

    const url = new URL('http://localhost:3000/api/transactions');
    url.searchParams.set('userId', 'user-1');
    url.searchParams.set('year', '2024');
    url.searchParams.set('month', '1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/transactions');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.transaction.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const url = new URL('http://localhost:3000/api/transactions');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch transactions');
  });

  it('페이지네이션이 정상 작동해야 함', async () => {
    // 21개 반환 - hasMore true
    const manyTransactions = Array.from({ length: 21 }, (_, i) => ({
      ...mockTransactions[0],
      id: `tx-${i}`,
    }));
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue(manyTransactions);

    const url = new URL('http://localhost:3000/api/transactions');
    url.searchParams.set('userId', 'user-1');
    url.searchParams.set('limit', '20');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(20);
    expect(data.hasMore).toBe(true);
    expect(data.nextCursor).toBe('tx-19');
  });
});
