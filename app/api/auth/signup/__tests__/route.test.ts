import { NextRequest } from 'next/server';
import { POST } from '../route';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Prisma mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// bcrypt mock
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('새 사용자를 성공적으로 생성해야 함', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'newuser@example.com',
      name: '새 사용자',
      password: 'hashed_password',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
    (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'newuser@example.com',
        password: 'Password123!',
        name: '새 사용자',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.user).toMatchObject({
      id: 'user-1',
      email: 'newuser@example.com',
      name: '새 사용자',
    });
    expect(data.data.user.password).toBeUndefined();
  });

  it('이미 존재하는 이메일로 가입 시 409 에러를 반환해야 함', async () => {
    const existingUser = {
      id: 'user-1',
      email: 'existing@example.com',
      name: '기존 사용자',
      password: 'hashed_password',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    (prisma.user.findFirst as jest.Mock).mockResolvedValue(existingUser);

    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'existing@example.com',
        password: 'Password123!',
        name: '새 사용자',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('이미 사용 중인 이메일입니다');
  });

  it('이메일이 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        password: 'Password123!',
        name: '새 사용자',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('이메일과 비밀번호를 입력해주세요');
  });

  it('비밀번호가 없으면 400 에러를 반환해야 함', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'newuser@example.com',
        name: '새 사용자',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('이메일과 비밀번호를 입력해주세요');
  });

  it('비밀번호가 6자 미만이면 400 에러를 반환해야 함', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'newuser@example.com',
        password: 'Pass1',
        name: '새 사용자',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('비밀번호는 최소 6자 이상이어야 합니다');
  });

  it('데이터베이스 에러 시 500 에러를 반환해야 함', async () => {
    (prisma.user.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'newuser@example.com',
        password: 'Password123!',
        name: '새 사용자',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('회원가입 처리 중 오류가 발생했습니다');
  });
});
