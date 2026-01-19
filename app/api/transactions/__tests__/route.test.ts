import { NextRequest } from 'next/server';
import { POST } from '../route';
import { prisma } from '@/lib/prisma';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      create: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
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
    };

    // Mock category findFirst to return a valid category
    (prisma.category.findFirst as jest.Mock).mockResolvedValue({
      id: 'category-1',
      name: '식비',
      userId: 'user-1',
    });
    (prisma.transaction.create as jest.Mock).mockResolvedValue(mockTransaction);

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
    // Date 객체가 JSON 직렬화되면 문자열이 됨
    expect(data.data).toMatchObject({
      id: 'test-id',
      userId: 'user-1',
      type: 'EXPENSE',
      amount: 10000,
      description: '점심',
      categoryId: 'category-1',
    });
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: 'EXPENSE',
        amount: 10000,
        description: '점심',
        categoryId: 'category-1',
        date: expect.any(Date),
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
    (prisma.transaction.create as jest.Mock).mockRejectedValue(
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
});
