import { NextRequest } from 'next/server';
import { POST } from '../[id]/deposit/route';
import { prisma } from '@/lib/prisma';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    savingsGoal: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('POST /api/savings/[id]/deposit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockParams = Promise.resolve({ id: 'savings-1' });

  const mockSavingsGoal = {
    id: 'savings-1',
    name: '여행 자금',
    userId: 'user-1',
    currentAmount: 500000,
    targetAmount: 2000000,
  };

  it('저축 목표에 입금하고 거래 내역을 생성해야 함', async () => {
    (prisma.savingsGoal.findFirst as jest.Mock).mockResolvedValue(mockSavingsGoal);
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      const tx = {
        savingsGoal: {
          update: jest.fn().mockResolvedValue({
            ...mockSavingsGoal,
            currentAmount: 600000, // 500000 + 100000
          }),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({
            id: 'tx-1',
            amount: 100000,
            type: 'EXPENSE',
            description: '여행 자금 저축',
            savingsGoalId: 'savings-1',
          }),
          aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
        },
        dailyBalance: {
          upsert: jest.fn().mockResolvedValue({}),
        },
      };
      return callback(tx);
    });

    const request = new NextRequest('http://localhost:3000/api/savings/savings-1/deposit', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        amount: 100000,
      }),
    });

    const response = await POST(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.savingsGoal.currentAmount).toBe(600000);
    expect(data.data.transaction).toBeDefined();
  });

  it('금액이 0 이하면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/savings/savings-1/deposit', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        amount: 0,
      }),
    });

    const response = await POST(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Amount must be greater than 0');
  });

  it('금액이 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/savings/savings-1/deposit', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
      }),
    });

    const response = await POST(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Amount must be greater than 0');
  });

  it('음수 금액은 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/savings/savings-1/deposit', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        amount: -50000,
      }),
    });

    const response = await POST(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Amount must be greater than 0');
  });

  it('존재하지 않는 저축 목표는 404 에러를 반환해야 함', async () => {
    (prisma.savingsGoal.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/savings/invalid-id/deposit', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        amount: 100000,
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'invalid-id' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Savings goal not found');
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/savings/savings-1/deposit', {
      method: 'POST',
      body: JSON.stringify({
        amount: 100000,
      }),
    });

    const response = await POST(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.savingsGoal.findFirst as jest.Mock).mockResolvedValue(mockSavingsGoal);
    (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/savings/savings-1/deposit', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        amount: 100000,
      }),
    });

    const response = await POST(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to deposit to savings goal');
  });

  it('트랜잭션 내에서 DailyBalance가 업데이트되어야 함', async () => {
    (prisma.savingsGoal.findFirst as jest.Mock).mockResolvedValue(mockSavingsGoal);

    let dailyBalanceUpdated = false;
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      const tx = {
        savingsGoal: {
          update: jest.fn().mockResolvedValue(mockSavingsGoal),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({ id: 'tx-1' }),
          aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
        },
        dailyBalance: {
          upsert: jest.fn().mockImplementation(() => {
            dailyBalanceUpdated = true;
            return Promise.resolve({});
          }),
        },
      };
      return callback(tx);
    });

    const request = new NextRequest('http://localhost:3000/api/savings/savings-1/deposit', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        amount: 100000,
      }),
    });

    await POST(request, { params: mockParams });

    expect(dailyBalanceUpdated).toBe(true);
  });
});
