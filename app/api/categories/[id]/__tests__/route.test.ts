import { NextRequest } from 'next/server';
import { PATCH, DELETE } from '../route';
import { prisma } from '@/lib/prisma';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('PATCH /api/categories/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('카테고리를 성공적으로 수정해야 함', async () => {
    const existingCategory = {
      id: 'cat-1',
      name: '식비',
      type: 'EXPENSE',
      color: '#EF4444',
      icon: '🍽️',
      userId: 'user-1',
    };

    const updatedCategory = {
      ...existingCategory,
      name: '외식비',
      color: '#F59E0B',
    };

    (prisma.category.findFirst as jest.Mock)
      .mockResolvedValueOnce(existingCategory) // findCategory
      .mockResolvedValueOnce(null); // findDuplicateCategory
    (prisma.category.update as jest.Mock).mockResolvedValue(updatedCategory);

    const request = new NextRequest('http://localhost:3000/api/categories/cat-1', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        name: '외식비',
        color: '#F59E0B',
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'cat-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('외식비');
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/categories/cat-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: '외식비' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'cat-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('존재하지 않는 카테고리면 404 에러를 반환해야 함', async () => {
    (prisma.category.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/categories/cat-999', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        name: '외식비',
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'cat-999' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Category not found');
  });

  it('잘못된 타입이면 400 에러를 반환해야 함', async () => {
    const existingCategory = {
      id: 'cat-1',
      name: '식비',
      type: 'EXPENSE',
      userId: 'user-1',
    };

    (prisma.category.findFirst as jest.Mock).mockResolvedValue(existingCategory);

    const request = new NextRequest('http://localhost:3000/api/categories/cat-1', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        type: 'INVALID_TYPE',
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'cat-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('type must be INCOME or EXPENSE');
  });

  it('중복된 카테고리면 409 에러를 반환해야 함', async () => {
    const existingCategory = {
      id: 'cat-1',
      name: '식비',
      type: 'EXPENSE',
      userId: 'user-1',
    };

    const duplicateCategory = {
      id: 'cat-2',
      name: '외식비',
      type: 'EXPENSE',
      userId: 'user-1',
    };

    (prisma.category.findFirst as jest.Mock)
      .mockResolvedValueOnce(existingCategory)
      .mockResolvedValueOnce(duplicateCategory);

    const request = new NextRequest('http://localhost:3000/api/categories/cat-1', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        name: '외식비',
        type: 'EXPENSE',
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'cat-1' }) });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('이미 존재하는 카테고리입니다');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.category.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/categories/cat-1', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        name: '외식비',
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'cat-1' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update category');
  });
});

describe('DELETE /api/categories/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('카테고리를 성공적으로 삭제해야 함', async () => {
    const existingCategory = {
      id: 'cat-1',
      name: '식비',
      type: 'EXPENSE',
      userId: 'user-1',
    };

    (prisma.category.findFirst as jest.Mock).mockResolvedValue(existingCategory);
    (prisma.category.update as jest.Mock).mockResolvedValue({
      ...existingCategory,
      deletedAt: new Date(),
    });

    const url = new URL('http://localhost:3000/api/categories/cat-1');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url, { method: 'DELETE' });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'cat-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Category deleted successfully');
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/categories/cat-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'cat-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('존재하지 않는 카테고리면 404 에러를 반환해야 함', async () => {
    (prisma.category.findFirst as jest.Mock).mockResolvedValue(null);

    const url = new URL('http://localhost:3000/api/categories/cat-999');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url, { method: 'DELETE' });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'cat-999' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Category not found');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.category.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

    const url = new URL('http://localhost:3000/api/categories/cat-1');
    url.searchParams.set('userId', 'user-1');

    const request = new NextRequest(url, { method: 'DELETE' });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'cat-1' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete category');
  });
});
