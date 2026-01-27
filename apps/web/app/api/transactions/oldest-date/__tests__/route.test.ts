import { NextRequest } from 'next/server';
import { GET } from '../route';
import { prisma } from '@/lib/prisma';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      findFirst: jest.fn(),
    },
  },
}));

describe('GET /api/transactions/oldest-date', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('가장 오래된 거래 날짜를 성공적으로 반환해야 함', async () => {
    const oldestDate = new Date('2024-01-15');
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({
      date: oldestDate,
    });

    const url = new URL('http://localhost:3000/api/transactions/oldest-date');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.year).toBe(2024);
    expect(data.data.month).toBe(1);
  });

  it('거래가 없으면 null을 반환해야 함', async () => {
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);

    const url = new URL('http://localhost:3000/api/transactions/oldest-date');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.date).toBeNull();
    expect(data.data.year).toBeNull();
    expect(data.data.month).toBeNull();
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const url = new URL('http://localhost:3000/api/transactions/oldest-date');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.transaction.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

    const url = new URL('http://localhost:3000/api/transactions/oldest-date');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch oldest transaction date');
  });
});
