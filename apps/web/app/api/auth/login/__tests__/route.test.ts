import { NextRequest } from 'next/server';
import { POST } from '../route';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
  },
}));

// bcrypt mock
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('올바른 이메일과 비밀번호로 로그인에 성공해야 함', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: '테스트',
      password: 'hashed_password',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.user).toMatchObject({
      id: 'user-1',
      email: 'test@example.com',
      name: '테스트',
    });
    expect(data.data.user.password).toBeUndefined();
  });

  it('존재하지 않는 이메일로 로그인 시 401 에러를 반환해야 함', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('이메일 또는 비밀번호가 올바르지 않습니다');
  });

  it('잘못된 비밀번호로 로그인 시 401 에러를 반환해야 함', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: '테스트',
      password: 'hashed_password',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('이메일 또는 비밀번호가 올바르지 않습니다');
  });

  it('이메일이 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('이메일과 비밀번호를 입력해주세요');
  });

  it('비밀번호가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('이메일과 비밀번호를 입력해주세요');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.user.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('로그인 처리 중 오류가 발생했습니다');
  });
});
