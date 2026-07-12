import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../route';
import { prisma } from '@/lib/prisma';
import { __setMockSessionUserId } from '@/lib/session';

jest.mock('@/lib/session');

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    budget: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('GET /api/budgets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __setMockSessionUserId('user-1');
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
    (prisma.category.findMany as jest.Mock).mockResolvedValue([]);

    const url = new URL('http://localhost:3000/api/budgets');
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

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
  });

  it('기본 소비예산을 반환해야 함', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ defaultExpenseBudget: 1800000 });

    const url = new URL('http://localhost:3000/api/budgets');
    url.searchParams.set('scope', 'default');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.amount).toBe(1800000);
  });

  it('세션이 없으면 401 에러를 반환해야 함', async () => {
    __setMockSessionUserId(null);

    const url = new URL('http://localhost:3000/api/budgets');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.budget.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const url = new URL('http://localhost:3000/api/budgets');

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
    __setMockSessionUserId('user-1');
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

    (prisma.budget.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.budget.create as jest.Mock).mockResolvedValue(mockBudget);

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

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Budget saved successfully');
    expect(data.data.amount).toBe(200000);
  });

  it('기존 월별 예산을 성공적으로 수정해야 함', async () => {
    const mockBudget = {
      id: 'budget-1',
      userId: 'user-1',
      categoryId: 'cat-1',
      amount: 250000,
      month: new Date('2024-01-01'),
      category: { id: 'cat-1', name: '식비', icon: '🍽️', color: '#EF4444' },
    };

    (prisma.budget.findFirst as jest.Mock).mockResolvedValue({ id: 'budget-1' });
    (prisma.budget.update as jest.Mock).mockResolvedValue(mockBudget);

    const request = new NextRequest('http://localhost:3000/api/budgets', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'cat-1',
        amount: 250000,
        year: 2024,
        month: 1,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.amount).toBe(250000);
  });

  it('전체 소비 예산을 성공적으로 생성해야 함', async () => {
    const mockBudget = {
      id: 'budget-total',
      userId: 'user-1',
      categoryId: null,
      amount: 2000000,
      month: new Date('2024-01-01'),
      category: null,
    };

    (prisma.budget.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.budget.create as jest.Mock).mockResolvedValue(mockBudget);
    (prisma.budget.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    const request = new NextRequest('http://localhost:3000/api/budgets', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: null,
        amount: 2000000,
        year: 2024,
        month: 1,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.categoryId).toBeNull();
    expect(data.data.amount).toBe(2000000);
  });

  it('기본 소비예산을 성공적으로 저장해야 함', async () => {
    (prisma.user.update as jest.Mock).mockResolvedValue({ defaultExpenseBudget: 1800000 });

    const request = new NextRequest('http://localhost:3000/api/budgets', {
      method: 'POST',
      body: JSON.stringify({
        scope: 'default',
        amount: 1800000,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.amount).toBe(1800000);
  });

  it('세션이 없으면 401 에러를 반환해야 함', async () => {
    __setMockSessionUserId(null);

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

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('categoryId가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/budgets', {
      method: 'POST',
      body: JSON.stringify({
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
    (prisma.budget.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

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

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to save budget');
  });
});

describe('DELETE /api/budgets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __setMockSessionUserId('user-1');
  });

  it('예산을 성공적으로 삭제해야 함', async () => {
    (prisma.budget.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const url = new URL('http://localhost:3000/api/budgets');
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

  it('세션이 없으면 401 에러를 반환해야 함', async () => {
    __setMockSessionUserId(null);

    const url = new URL('http://localhost:3000/api/budgets');
    url.searchParams.set('categoryId', 'cat-1');
    url.searchParams.set('year', '2024');
    url.searchParams.set('month', '1');

    const request = new NextRequest(url, { method: 'DELETE' });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('필수 파라미터가 없으면 400 에러를 반환해야 함', async () => {
    const url = new URL('http://localhost:3000/api/budgets');

    const request = new NextRequest(url, { method: 'DELETE' });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('categoryId or scope=total, year, and month are required');
  });

  it('전체 소비 예산을 성공적으로 삭제해야 함', async () => {
    (prisma.budget.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const url = new URL('http://localhost:3000/api/budgets');
    url.searchParams.set('scope', 'total');
    url.searchParams.set('year', '2024');
    url.searchParams.set('month', '1');

    const request = new NextRequest(url, { method: 'DELETE' });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('기본 소비예산을 성공적으로 삭제해야 함', async () => {
    (prisma.user.update as jest.Mock).mockResolvedValue({ defaultExpenseBudget: null });

    const url = new URL('http://localhost:3000/api/budgets');
    url.searchParams.set('scope', 'default');

    const request = new NextRequest(url, { method: 'DELETE' });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.budget.updateMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const url = new URL('http://localhost:3000/api/budgets');
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
