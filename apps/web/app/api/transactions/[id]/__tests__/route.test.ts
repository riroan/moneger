import { NextRequest } from 'next/server';
import { PATCH, DELETE } from '../route';
import { prisma } from '@/lib/prisma';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    dailyBalance: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('PATCH /api/transactions/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTransaction = {
    id: 'tx-1',
    userId: 'user-1',
    type: 'EXPENSE',
    amount: 50000,
    description: '점심',
    categoryId: 'cat-1',
    date: new Date('2024-01-15'),
    category: { id: 'cat-1', name: '식비', type: 'EXPENSE', color: '#EF4444', icon: '🍽️' },
  };

  it('거래를 성공적으로 수정해야 함', async () => {
    const updatedTransaction = { ...mockTransaction, amount: 60000, description: '저녁' };

    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(mockTransaction);
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        transaction: {
          update: jest.fn().mockResolvedValue(updatedTransaction),
          findMany: jest.fn().mockResolvedValue([]),
          aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
        },
        dailyBalance: {
          findUnique: jest.fn().mockResolvedValue(null),
          upsert: jest.fn().mockResolvedValue({}),
        },
      });
    });

    const request = new NextRequest('http://localhost:3000/api/transactions/tx-1', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        amount: 60000,
        description: '저녁',
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'tx-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Transaction updated successfully');
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/transactions/tx-1', {
      method: 'PATCH',
      body: JSON.stringify({ amount: 60000 }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'tx-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('존재하지 않는 거래면 404 에러를 반환해야 함', async () => {
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/transactions/tx-999', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        amount: 60000,
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'tx-999' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Transaction not found');
  });

  it('잘못된 타입이면 400 에러를 반환해야 함', async () => {
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(mockTransaction);

    const request = new NextRequest('http://localhost:3000/api/transactions/tx-1', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        type: 'INVALID_TYPE',
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'tx-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('type must be INCOME or EXPENSE');
  });

  it('금액이 0 이하면 400 에러를 반환해야 함', async () => {
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(mockTransaction);

    const request = new NextRequest('http://localhost:3000/api/transactions/tx-1', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        amount: -1000,
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'tx-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('amount must be greater than 0');
  });

  it('잘못된 카테고리면 400 에러를 반환해야 함', async () => {
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(mockTransaction);
    (prisma.category.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/transactions/tx-1', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        categoryId: 'invalid-cat',
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'tx-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid category or category type mismatch');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.transaction.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/transactions/tx-1', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        amount: 60000,
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'tx-1' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update transaction');
  });
});

describe('DELETE /api/transactions/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTransaction = {
    id: 'tx-1',
    userId: 'user-1',
    type: 'EXPENSE',
    amount: 50000,
    date: new Date('2024-01-15'),
  };

  it('거래를 성공적으로 삭제해야 함', async () => {
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(mockTransaction);
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        transaction: {
          update: jest.fn().mockResolvedValue({ ...mockTransaction, deletedAt: new Date() }),
          findMany: jest.fn().mockResolvedValue([]),
          aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
        },
        dailyBalance: {
          findUnique: jest.fn().mockResolvedValue(null),
          upsert: jest.fn().mockResolvedValue({}),
        },
      });
    });

    const request = new NextRequest('http://localhost:3000/api/transactions/tx-1', {
      method: 'DELETE',
      body: JSON.stringify({ userId: 'user-1' }),
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'tx-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Transaction deleted successfully');
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/transactions/tx-1', {
      method: 'DELETE',
      body: JSON.stringify({}),
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'tx-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('존재하지 않는 거래면 404 에러를 반환해야 함', async () => {
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/transactions/tx-999', {
      method: 'DELETE',
      body: JSON.stringify({ userId: 'user-1' }),
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'tx-999' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Transaction not found');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.transaction.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/transactions/tx-1', {
      method: 'DELETE',
      body: JSON.stringify({ userId: 'user-1' }),
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'tx-1' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete transaction');
  });
});
