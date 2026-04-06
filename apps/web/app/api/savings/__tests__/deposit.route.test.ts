import { NextRequest } from 'next/server';
import { POST } from '../[id]/deposit/route';
import { prisma } from '@/lib/prisma';
import * as savingsService from '@/lib/services/savings.service';
import * as dailyBalanceService from '@/lib/services/daily-balance.service';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

// Mock services
jest.mock('@/lib/services/savings.service', () => ({
  findSavingsGoal: jest.fn(),
  depositToSavingsGoal: jest.fn(),
}));

jest.mock('@/lib/services/daily-balance.service', () => ({
  updateDailyBalanceInTransaction: jest.fn(),
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
    (savingsService.findSavingsGoal as jest.Mock).mockResolvedValue(mockSavingsGoal);

    const updatedGoal = { ...mockSavingsGoal, currentAmount: 600000 };
    const mockTransaction = { id: 'tx-1', amount: 100000, type: 'EXPENSE' };

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: Function) => {
      const tx = {};
      (savingsService.depositToSavingsGoal as jest.Mock).mockResolvedValue({
        updatedGoal,
        transaction: mockTransaction,
      });
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
    (savingsService.findSavingsGoal as jest.Mock).mockResolvedValue(null);

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
    (savingsService.findSavingsGoal as jest.Mock).mockResolvedValue(mockSavingsGoal);
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
    (savingsService.findSavingsGoal as jest.Mock).mockResolvedValue(mockSavingsGoal);

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: Function) => {
      const tx = {};
      (savingsService.depositToSavingsGoal as jest.Mock).mockResolvedValue({
        updatedGoal: mockSavingsGoal,
        transaction: { id: 'tx-1' },
      });
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

    expect(dailyBalanceService.updateDailyBalanceInTransaction).toHaveBeenCalled();
  });
});
