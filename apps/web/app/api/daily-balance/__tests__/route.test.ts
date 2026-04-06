import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import * as dailyBalanceService from '@/lib/services/daily-balance.service';

// Mock daily-balance service
jest.mock('@/lib/services/daily-balance.service', () => ({
  saveDailyBalance: jest.fn(),
  getRecentDailyBalances: jest.fn(),
  getMonthlyDailyBalances: jest.fn(),
}));

describe('POST /api/daily-balance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('일별 잔액을 성공적으로 저장해야 함', async () => {
    const mockDailyBalance = {
      id: 'db-1',
      userId: 'user-1',
      date: new Date('2024-01-15'),
      balance: 100000,
      income: 150000,
      expense: 50000,
    };

    (dailyBalanceService.saveDailyBalance as jest.Mock).mockResolvedValue(mockDailyBalance);

    const request = new NextRequest('http://localhost:3000/api/daily-balance', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        date: '2024-01-15',
        balance: 100000,
        income: 150000,
        expense: 50000,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('일별 잔액이 저장되었습니다');
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/daily-balance', {
      method: 'POST',
      body: JSON.stringify({
        date: '2024-01-15',
        balance: 100000,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('date가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/daily-balance', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        balance: 100000,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('date is required');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (dailyBalanceService.saveDailyBalance as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/daily-balance', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        date: '2024-01-15',
        balance: 100000,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to save daily balance');
  });
});

describe('GET /api/daily-balance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('일별 잔액 목록을 성공적으로 반환해야 함', async () => {
    const mockBalances = [
      { id: 'db-1', userId: 'user-1', date: new Date('2024-01-14'), balance: 80000, income: 100000, expense: 20000 },
      { id: 'db-2', userId: 'user-1', date: new Date('2024-01-15'), balance: 100000, income: 50000, expense: 30000 },
    ];

    (dailyBalanceService.getRecentDailyBalances as jest.Mock).mockResolvedValue(mockBalances);

    const url = new URL('http://localhost:3000/api/daily-balance');
    url.searchParams.set('userId', 'user-1');
    url.searchParams.set('days', '5');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const url = new URL('http://localhost:3000/api/daily-balance');
    url.searchParams.set('days', '5');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (dailyBalanceService.getRecentDailyBalances as jest.Mock).mockRejectedValue(new Error('Database error'));

    const url = new URL('http://localhost:3000/api/daily-balance');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch daily balance');
  });
});
