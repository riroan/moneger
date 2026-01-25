import { NextRequest } from 'next/server';
import { PUT, PATCH, DELETE } from '../[id]/route';
import { prisma } from '@/lib/prisma';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    savingsGoal: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

describe('PUT /api/savings/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockParams = Promise.resolve({ id: 'savings-1' });

  it('저축 목표를 수정해야 함', async () => {
    const existingGoal = {
      id: 'savings-1',
      name: '여행 자금',
      userId: 'user-1',
    };
    const updatedGoal = {
      ...existingGoal,
      name: '수정된 목표',
      targetAmount: 3000000,
    };

    (prisma.savingsGoal.findFirst as jest.Mock).mockResolvedValue(existingGoal);
    (prisma.savingsGoal.update as jest.Mock).mockResolvedValue(updatedGoal);

    const request = new NextRequest('http://localhost:3000/api/savings/savings-1', {
      method: 'PUT',
      body: JSON.stringify({
        userId: 'user-1',
        name: '수정된 목표',
        targetAmount: 3000000,
      }),
    });

    const response = await PUT(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('수정된 목표');
  });

  it('대표 목표로 설정하면 다른 목표들의 isPrimary를 false로 변경해야 함', async () => {
    const existingGoal = { id: 'savings-1', userId: 'user-1' };

    (prisma.savingsGoal.findFirst as jest.Mock).mockResolvedValue(existingGoal);
    (prisma.savingsGoal.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
    (prisma.savingsGoal.update as jest.Mock).mockResolvedValue({ ...existingGoal, isPrimary: true });

    const request = new NextRequest('http://localhost:3000/api/savings/savings-1', {
      method: 'PUT',
      body: JSON.stringify({
        userId: 'user-1',
        isPrimary: true,
      }),
    });

    await PUT(request, { params: mockParams });

    expect(prisma.savingsGoal.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', deletedAt: null, id: { not: 'savings-1' } },
      data: { isPrimary: false },
    });
  });

  it('존재하지 않는 저축 목표는 404 에러를 반환해야 함', async () => {
    (prisma.savingsGoal.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/savings/invalid-id', {
      method: 'PUT',
      body: JSON.stringify({
        userId: 'user-1',
        name: '수정',
      }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: 'invalid-id' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Savings goal not found');
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/savings/savings-1', {
      method: 'PUT',
      body: JSON.stringify({ name: '수정' }),
    });

    const response = await PUT(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });
});

describe('PATCH /api/savings/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockParams = Promise.resolve({ id: 'savings-1' });

  it('대표 저축 목표를 설정해야 함', async () => {
    const existingGoal = { id: 'savings-1', userId: 'user-1', isPrimary: false };

    (prisma.savingsGoal.findFirst as jest.Mock).mockResolvedValue(existingGoal);
    (prisma.savingsGoal.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.savingsGoal.update as jest.Mock).mockResolvedValue({ ...existingGoal, isPrimary: true });

    const request = new NextRequest('http://localhost:3000/api/savings/savings-1', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        isPrimary: true,
      }),
    });

    const response = await PATCH(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.isPrimary).toBe(true);
    expect(prisma.savingsGoal.updateMany).toHaveBeenCalled();
  });

  it('대표 저축 목표를 해제해야 함', async () => {
    const existingGoal = { id: 'savings-1', userId: 'user-1', isPrimary: true };

    (prisma.savingsGoal.findFirst as jest.Mock).mockResolvedValue(existingGoal);
    (prisma.savingsGoal.update as jest.Mock).mockResolvedValue({ ...existingGoal, isPrimary: false });

    const request = new NextRequest('http://localhost:3000/api/savings/savings-1', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        isPrimary: false,
      }),
    });

    const response = await PATCH(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.isPrimary).toBe(false);
    expect(prisma.savingsGoal.updateMany).not.toHaveBeenCalled();
  });

  it('존재하지 않는 저축 목표는 404 에러를 반환해야 함', async () => {
    (prisma.savingsGoal.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/savings/invalid-id', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        isPrimary: true,
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'invalid-id' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/savings/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockParams = Promise.resolve({ id: 'savings-1' });

  it('저축 목표를 소프트 삭제해야 함', async () => {
    const existingGoal = { id: 'savings-1', userId: 'user-1' };

    (prisma.savingsGoal.findFirst as jest.Mock).mockResolvedValue(existingGoal);
    (prisma.savingsGoal.update as jest.Mock).mockResolvedValue({ ...existingGoal, deletedAt: new Date() });

    const url = new URL('http://localhost:3000/api/savings/savings-1');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url, { method: 'DELETE' });

    const response = await DELETE(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.savingsGoal.update).toHaveBeenCalledWith({
      where: { id: 'savings-1' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('존재하지 않는 저축 목표는 404 에러를 반환해야 함', async () => {
    (prisma.savingsGoal.findFirst as jest.Mock).mockResolvedValue(null);

    const url = new URL('http://localhost:3000/api/savings/invalid-id');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url, { method: 'DELETE' });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'invalid-id' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Savings goal not found');
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/savings/savings-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.savingsGoal.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

    const url = new URL('http://localhost:3000/api/savings/savings-1');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url, { method: 'DELETE' });

    const response = await DELETE(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete savings goal');
  });
});
