import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/entitlements-server', () => ({
  requireFeature: jest.fn(async () => null),
}));

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    savingsGoal: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    transaction: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('GET /api/savings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 목표별 최근 입금(embed) 조회 — 기본 빈 배열
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
  });

  const mockSavingsGoals = [
    {
      id: 'savings-1',
      name: '여행 자금',
      icon: '✈️',
      targetAmount: 2000000,
      currentAmount: 500000,
      targetYear: 2024,
      targetMonth: 12,
      isPrimary: true,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'savings-2',
      name: '비상금',
      icon: '💰',
      targetAmount: 5000000,
      currentAmount: 1000000,
      targetYear: 2025,
      targetMonth: 6,
      isPrimary: false,
      createdAt: new Date('2024-01-01'),
    },
  ];

  it('저축 목표 목록을 조회해야 함', async () => {
    (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue(mockSavingsGoals);
    // groupBy는 두 번 호출됨: 이번 달 합계(_sum) + 입금 건수(_count)
    (prisma.transaction.groupBy as jest.Mock).mockImplementation((args) =>
      Promise.resolve(
        args._count
          ? [{ savingsGoalId: 'savings-1', _count: { _all: 3 } }]
          : [{ savingsGoalId: 'savings-1', _sum: { amount: 100000 } }]
      )
    );

    const url = new URL('http://localhost:3000/api/savings');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.data[0]).toMatchObject({
      id: 'savings-1',
      name: '여행 자금',
      progressPercent: 25, // 500000 / 2000000 * 100
    });
  });

  it('이번 달 저축액을 포함해야 함', async () => {
    (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue(mockSavingsGoals);
    (prisma.transaction.groupBy as jest.Mock).mockImplementation((args) =>
      Promise.resolve(
        args._count
          ? [{ savingsGoalId: 'savings-1', _count: { _all: 3 } }]
          : [{ savingsGoalId: 'savings-1', _sum: { amount: 200000 } }]
      )
    );

    const url = new URL('http://localhost:3000/api/savings');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(data.data[0].thisMonthSavings).toBe(200000);
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/savings');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.savingsGoal.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const url = new URL('http://localhost:3000/api/savings');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch savings goals');
  });
});

describe('POST /api/savings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('저축 목표를 생성해야 함', async () => {
    const mockCreatedGoal = {
      id: 'savings-new',
      userId: 'user-1',
      name: '새 목표',
      icon: '🎯',
      targetAmount: 1000000,
      currentAmount: 0,
      targetYear: 2024,
      targetMonth: 12,
    };

    (prisma.savingsGoal.create as jest.Mock).mockResolvedValue(mockCreatedGoal);

    const request = new NextRequest('http://localhost:3000/api/savings', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        name: '새 목표',
        icon: '🎯',
        targetAmount: 1000000,
        targetYear: 2024,
        targetMonth: 12,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toMatchObject({
      name: '새 목표',
      targetAmount: 1000000,
    });
  });

  it('필수 필드가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/savings', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        name: '새 목표',
        // icon, targetAmount, targetYear, targetMonth 누락
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/savings', {
      method: 'POST',
      body: JSON.stringify({
        name: '새 목표',
        icon: '🎯',
        targetAmount: 1000000,
        targetYear: 2024,
        targetMonth: 12,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('currentAmount를 지정하여 생성할 수 있음', async () => {
    const mockCreatedGoal = {
      id: 'savings-new',
      currentAmount: 500000,
    };

    (prisma.savingsGoal.create as jest.Mock).mockResolvedValue(mockCreatedGoal);

    const request = new NextRequest('http://localhost:3000/api/savings', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        name: '새 목표',
        icon: '🎯',
        targetAmount: 1000000,
        currentAmount: 500000,
        targetYear: 2024,
        targetMonth: 12,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.data.currentAmount).toBe(500000);
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.savingsGoal.create as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/savings', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        name: '새 목표',
        icon: '🎯',
        targetAmount: 1000000,
        targetYear: 2024,
        targetMonth: 12,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create savings goal');
  });
});
