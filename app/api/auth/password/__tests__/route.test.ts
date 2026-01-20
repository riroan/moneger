import { NextRequest } from 'next/server';
import { PATCH } from '../route';
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
  hash: jest.fn(),
}));

describe('PATCH /api/auth/password', () => {
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

  it('비밀번호를 성공적으로 변경해야 함', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
    (prisma.user.update as jest.Mock).mockResolvedValue({
      ...mockUser,
      password: 'newHashedPassword',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('비밀번호가 변경되었습니다');
  });

  it('필수 필드가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        currentPassword: 'oldPassword123',
        // newPassword 누락
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('모든 필드를 입력해주세요');
  });

  it('새 비밀번호가 6자 미만이면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        currentPassword: 'oldPassword123',
        newPassword: '12345', // 5자
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('새 비밀번호는 최소 6자 이상이어야 합니다');
  });

  it('사용자를 찾을 수 없으면 404 에러를 반환해야 함', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-999',
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('사용자를 찾을 수 없습니다');
  });

  it('현재 비밀번호가 틀리면 401 에러를 반환해야 함', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const request = new NextRequest('http://localhost:3000/api/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('현재 비밀번호가 일치하지 않습니다');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.user.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'user-1',
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('비밀번호 변경 중 오류가 발생했습니다');
  });
});
