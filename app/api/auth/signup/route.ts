import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { logger } from '@/lib/logger';
import { successResponseWithMessage, errorResponse } from '@/lib/api-utils';

// POST /api/auth/signup - 회원가입
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // 유효성 검사
    if (!email || !password) {
      return errorResponse('이메일과 비밀번호를 입력해주세요', 400);
    }

    if (password.length < 6) {
      return errorResponse('비밀번호는 최소 6자 이상이어야 합니다', 400);
    }

    // 이메일 중복 확인
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });

    if (existingUser) {
      return errorResponse('이미 사용 중인 이메일입니다', 409);
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
    });

    // 비밀번호 제외하고 반환
    const { password: _, ...userWithoutPassword } = user;

    return successResponseWithMessage({ user: userWithoutPassword }, '회원가입 성공', 201);
  } catch (error) {
    logger.error('Signup failed', error);
    return errorResponse('회원가입 처리 중 오류가 발생했습니다', 500);
  }
}
