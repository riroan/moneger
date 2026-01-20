import { NextRequest } from 'next/server';
import { DELETE } from '../route';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// bcrypt mock
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

describe('DELETE /api/auth/delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUser = {
    id: 'user-1',
    email: 'test@test.com',
    password: 'hashedPassword123',
    name: 'Test User',
    deletedAt: null,
  };

  it('계정을 성공적으로 삭제해야 함', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (prisma.user.update as jest.Mock).mockResolvedValue({
      ...mockUser,
      deletedAt: new Date(),
    });

    const request = new NextRequest('http://localhost:3000/api/auth/delete', {
      method: 'DELETE',
      body: JSON.stringify({
        userId: 'user-1',
        password: 'password123',
      }),
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('계정이 삭제되었습니다');
  });

  it('userId나 password가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/delete', {
      method: 'DELETE',
      body: JSON.stringify({ userId: 'user-1' }),
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('비밀번호를 입력해주세요');
  });

  it('사용자를 찾을 수 없으면 404 에러를 반환해야 함', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/auth/delete', {
      method: 'DELETE',
      body: JSON.stringify({
        userId: 'user-999',
        password: 'password123',
      }),
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('사용자를 찾을 수 없습니다');
  });

  it('비밀번호가 틀리면 401 에러를 반환해야 함', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const request = new NextRequest('http://localhost:3000/api/auth/delete', {
      method: 'DELETE',
      body: JSON.stringify({
        userId: 'user-1',
        password: 'wrongpassword',
      }),
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('비밀번호가 일치하지 않습니다');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.user.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/auth/delete', {
      method: 'DELETE',
      body: JSON.stringify({
        userId: 'user-1',
        password: 'password123',
      }),
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('계정 삭제 중 오류가 발생했습니다');
  });
});
