import { NextRequest } from 'next/server';
import { POST } from '../route';
import { prisma } from '@/lib/prisma';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  },
}));

describe('POST /api/categories/seed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('기본 카테고리를 성공적으로 생성해야 함', async () => {
    (prisma.category.findMany as jest.Mock).mockResolvedValue([]);

    // create가 호출될 때마다 순서대로 반환할 mock 카테고리들
    let callCount = 0;
    const mockCategories = [
      { id: '1', name: '식비', type: 'EXPENSE', icon: '🍽️', color: '#EF4444' },
      { id: '2', name: '교통비', type: 'EXPENSE', icon: '🚗', color: '#F59E0B' },
      { id: '3', name: '쇼핑', type: 'EXPENSE', icon: '🛍️', color: '#EC4899' },
      { id: '4', name: '문화생활', type: 'EXPENSE', icon: '🎬', color: '#8B5CF6' },
      { id: '5', name: '의료', type: 'EXPENSE', icon: '🏥', color: '#14B8A6' },
      { id: '6', name: '주거비', type: 'EXPENSE', icon: '🏠', color: '#6366F1' },
      { id: '7', name: '통신비', type: 'EXPENSE', icon: '📱', color: '#3B82F6' },
      { id: '8', name: '대출이자', type: 'EXPENSE', icon: '💳', color: '#DC2626' },
      { id: '9', name: '저축 납입', type: 'EXPENSE', icon: 'savings', color: '#FBBF24' },
      { id: '10', name: '투자 납입', type: 'EXPENSE', icon: 'chart', color: '#8B5CF6' },
      { id: '11', name: '기타지출', type: 'EXPENSE', icon: 'etc', color: '#64748B' },
      { id: '12', name: '급여', type: 'INCOME', icon: 'money', color: '#10B981' },
      { id: '13', name: '부수입', type: 'INCOME', icon: 'wallet', color: '#059669' },
      { id: '14', name: '용돈', type: 'INCOME', icon: 'gift', color: '#34D399' },
      { id: '15', name: '기타수입', type: 'INCOME', icon: 'etc', color: '#6EE7B7' },
    ];
    (prisma.category.create as jest.Mock).mockImplementation(() => {
      return Promise.resolve(mockCategories[callCount++]);
    });

    const request = new NextRequest('http://localhost:3000/api/categories/seed', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Default categories created successfully');
    expect(data.count).toBe(15); // 11 expense + 4 income
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/categories/seed', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('이미 카테고리가 존재하면 409 에러를 반환해야 함', async () => {
    (prisma.category.findMany as jest.Mock).mockResolvedValue([
      { id: '1', name: '식비', type: 'EXPENSE' },
    ]);

    const request = new NextRequest('http://localhost:3000/api/categories/seed', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('이미 카테고리가 존재합니다');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.category.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/categories/seed', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to seed categories');
  });
});
