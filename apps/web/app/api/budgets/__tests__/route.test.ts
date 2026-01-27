import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../route';
import { prisma } from '@/lib/prisma';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    budget: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

describe('GET /api/budgets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('월별 예산 목록을 성공적으로 반환해야 함', async () => {
    const mockBudgets = [
      {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: 200000,
        month: new Date('2024-01-01'),
        category: { id: 'cat-1', name: '식비', icon: '🍽️', color: '#EF4444' },
      },
    ];

    (prisma.budget.findMany as jest.Mock).mockResolvedValue(mockBudgets);

    const url = new URL('http://localhost:3000/api/budgets');
    url.searchParams.set('userId', 'user-1');
    url.searchParams.set('year', '2024');
    url.searchParams.set('month', '1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].amount).toBe(200000);
  });

  it('전체 예산 목록을 반환해야 함', async () => {
    const mockBudgets = [
      { id: 'budget-1', amount: 200000 },
      { id: 'budget-2', amount: 100000 },
    ];

    (prisma.budget.findMany as jest.Mock).mockResolvedValue(mockBudgets);

    const url = new URL('http://localhost:3000/api/budgets');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const url = new URL('http://localhost:3000/api/budgets');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.budget.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const url = new URL('http://localhost:3000/api/budgets');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch budgets');
  });
});

describe('POST /api/budgets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('예산을 성공적으로 생성해야 함', async () => {
    const mockBudget = {
      id: 'budget-1',
      userId: 'user-1',
      categoryId: 'cat-1',
      amount: 200000,
      month: new Date('2024-01-01'),
      category: { id: 'cat-1', name: '식비', icon: '🍽️', color: '#EF4444' },
    };

    (prisma.budget.upsert as jest.Mock).mockResolvedValue(mockBudget);

    const request = new NextRequest('http://localhost:3000/api/budgets', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: 200000,
        year: 2024,
        month: 1,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Budget saved successfully');
    expect(data.data.amount).toBe(200000);
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/budgets', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'cat-1',
        amount: 200000,
        year: 2024,
        month: 1,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('categoryId가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/budgets', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        amount: 200000,
        year: 2024,
        month: 1,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('categoryId is required');
  });

  it('amount가 음수면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/budgets', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: -100,
        year: 2024,
        month: 1,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('amount must be 0 or greater');
  });

  it('year나 month가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/budgets', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: 200000,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('year and month are required');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.budget.upsert as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/budgets', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: 200000,
        year: 2024,
        month: 1,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to save budget');
  });
});

describe('DELETE /api/budgets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('예산을 성공적으로 삭제해야 함', async () => {
    (prisma.budget.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const url = new URL('http://localhost:3000/api/budgets');
    url.searchParams.set('userId', 'user-1');
    url.searchParams.set('categoryId', 'cat-1');
    url.searchParams.set('year', '2024');
    url.searchParams.set('month', '1');

    const request = new NextRequest(url, { method: 'DELETE' });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Budget deleted successfully');
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const url = new URL('http://localhost:3000/api/budgets');
    url.searchParams.set('categoryId', 'cat-1');
    url.searchParams.set('year', '2024');
    url.searchParams.set('month', '1');

    const request = new NextRequest(url, { method: 'DELETE' });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('필수 파라미터가 없으면 400 에러를 반환해야 함', async () => {
    const url = new URL('http://localhost:3000/api/budgets');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url, { method: 'DELETE' });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('categoryId, year, and month are required');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.budget.updateMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const url = new URL('http://localhost:3000/api/budgets');
    url.searchParams.set('userId', 'user-1');
    url.searchParams.set('categoryId', 'cat-1');
    url.searchParams.set('year', '2024');
    url.searchParams.set('month', '1');

    const request = new NextRequest(url, { method: 'DELETE' });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete budget');
  });
});
