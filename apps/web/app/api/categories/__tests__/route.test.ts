import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { prisma } from '@/lib/prisma';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

describe('GET /api/categories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('사용자의 카테고리 목록을 성공적으로 반환해야 함', async () => {
    const mockCategories = [
      {
        id: 'cat-1',
        name: '식비',
        type: 'EXPENSE',
        color: '#EF4444',
        icon: '🍽️',
        userId: 'user-1',
      },
      {
        id: 'cat-2',
        name: '급여',
        type: 'INCOME',
        color: '#10B981',
        icon: '💰',
        userId: 'user-1',
      },
    ];

    (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);

    const url = new URL('http://localhost:3000/api/categories');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockCategories);
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const url = new URL('http://localhost:3000/api/categories');
    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('type 파라미터로 필터링할 수 있어야 함', async () => {
    const mockCategories = [
      { id: 'cat-1', name: '식비', type: 'EXPENSE', color: '#EF4444', icon: '🍽️' },
    ];
    (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);

    const url = new URL('http://localhost:3000/api/categories');
    url.searchParams.set('userId', 'user-1');
    url.searchParams.set('type', 'EXPENSE');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(1);
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        type: 'EXPENSE',
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
    });
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.category.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const url = new URL('http://localhost:3000/api/categories');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch categories');
  });
});

describe('POST /api/categories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('새 카테고리를 성공적으로 생성해야 함', async () => {
    const now = new Date();
    const mockCategory = {
      id: 'cat-1',
      name: '카페',
      type: 'EXPENSE',
      color: '#8B5CF6',
      icon: '☕',
      userId: 'user-1',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    (prisma.category.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.category.create as jest.Mock).mockResolvedValue(mockCategory);

    const request = new NextRequest('http://localhost:3000/api/categories', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        name: '카페',
        type: 'EXPENSE',
        color: '#8B5CF6',
        icon: '☕',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    // Date 객체가 JSON 직렬화되면 문자열이 됨
    expect(data.data).toMatchObject({
      id: 'cat-1',
      name: '카페',
      type: 'EXPENSE',
      color: '#8B5CF6',
      icon: '☕',
      userId: 'user-1',
    });
  });

  it('중복된 카테고리 생성 시 409 에러를 반환해야 함', async () => {
    const existingCategory = {
      id: 'cat-1',
      name: '식비',
      type: 'EXPENSE',
      userId: 'user-1',
    };

    (prisma.category.findFirst as jest.Mock).mockResolvedValue(existingCategory);

    const request = new NextRequest('http://localhost:3000/api/categories', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        name: '식비',
        type: 'EXPENSE',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('이미 존재하는 카테고리입니다');
  });

  it('필수 필드가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/categories', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        // name과 type이 없음
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('name is required');
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: '카페',
        type: 'EXPENSE',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('잘못된 type이면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/categories', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        name: '카페',
        type: 'INVALID',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('type must be INCOME or EXPENSE');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.category.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/categories', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        name: '카페',
        type: 'EXPENSE',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create category');
  });
});
