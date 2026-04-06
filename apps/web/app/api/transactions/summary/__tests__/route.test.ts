import { NextRequest } from 'next/server';
import { GET } from '../route';
import * as summaryService from '@/lib/services/summary.service';

// Mock summary service
jest.mock('@/lib/services/summary.service', () => ({
  getTransactionSummary: jest.fn(),
}));

describe('GET /api/transactions/summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('월별 거래 요약을 성공적으로 반환해야 함', async () => {
    const mockSummary = {
      period: { year: 2024, month: 1 },
      summary: {
        totalIncome: 100000,
        totalExpense: 50000,
        totalSavings: 0,
        netAmount: 50000,
        balance: 50000,
        carryOverBalance: 0,
      },
      budget: {
        amount: 200000,
        used: 50000,
        remaining: 150000,
        usagePercent: 25,
      },
      categories: [
        { id: 'cat-2', name: '식비', icon: '🍽️', color: '#EF4444', count: 2, total: 50000 },
      ],
      transactionCount: { income: 1, expense: 2, total: 3 },
      savings: { totalAmount: 0, count: 0, targetAmount: 0, primaryGoal: null },
    };

    (summaryService.getTransactionSummary as jest.Mock).mockResolvedValue(mockSummary);

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
    const mockSummary = {
      period: { year: 2024, month: 1 },
      summary: {
        totalIncome: 0,
        totalExpense: 60000,
        totalSavings: 0,
        netAmount: -60000,
        balance: -60000,
        carryOverBalance: 0,
      },
      budget: { amount: 0, used: 60000, remaining: 0, usagePercent: 0 },
      categories: [
        { id: 'cat-2', name: '식비', icon: '🍽️', color: '#EF4444', count: 1, total: 30000 },
        { id: 'cat-3', name: '쇼핑', icon: '🛍️', color: '#EC4899', count: 1, total: 20000 },
        { id: 'cat-1', name: '교통비', icon: '🚗', color: '#F59E0B', count: 1, total: 10000 },
      ],
      transactionCount: { income: 0, expense: 3, total: 3 },
      savings: { totalAmount: 0, count: 0, targetAmount: 0, primaryGoal: null },
    };

    (summaryService.getTransactionSummary as jest.Mock).mockResolvedValue(mockSummary);

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
    (summaryService.getTransactionSummary as jest.Mock).mockRejectedValue(
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
