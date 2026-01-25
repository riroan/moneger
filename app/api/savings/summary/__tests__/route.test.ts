import { NextRequest } from 'next/server';
import { GET } from '../route';
import { prisma } from '@/lib/prisma';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    savingsGoal: {
      findMany: jest.fn(),
    },
  },
}));

describe('GET /api/savings/summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSavingsGoals = [
    {
      id: 'savings-1',
      name: '여행 자금',
      currentAmount: 500000,
      targetAmount: 2000000,
    },
    {
      id: 'savings-2',
      name: '비상금',
      currentAmount: 1000000,
      targetAmount: 5000000,
    },
  ];

  it('저축 요약을 반환해야 함', async () => {
    (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue(mockSavingsGoals);

    const url = new URL('http://localhost:3000/api/savings/summary');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual({
      totalCurrentAmount: 1500000, // 500000 + 1000000
      totalTargetAmount: 7000000, // 2000000 + 5000000
      goalsCount: 2,
      progressPercent: 21, // Math.round((1500000 / 7000000) * 100)
    });
  });

  it('저축 목표가 없으면 0으로 반환해야 함', async () => {
    (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue([]);

    const url = new URL('http://localhost:3000/api/savings/summary');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual({
      totalCurrentAmount: 0,
      totalTargetAmount: 0,
      goalsCount: 0,
      progressPercent: 0,
    });
  });

  it('targetAmount가 0이면 progressPercent는 0이어야 함', async () => {
    (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue([
      { id: 'savings-1', currentAmount: 0, targetAmount: 0 },
    ]);

    const url = new URL('http://localhost:3000/api/savings/summary');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.progressPercent).toBe(0);
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/savings/summary');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.savingsGoal.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const url = new URL('http://localhost:3000/api/savings/summary');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch savings summary');
  });

  it('삭제되지 않은 목표만 조회해야 함', async () => {
    (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue(mockSavingsGoals);

    const url = new URL('http://localhost:3000/api/savings/summary');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    await GET(request);

    expect(prisma.savingsGoal.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        deletedAt: null,
      },
    });
  });
});
