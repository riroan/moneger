import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { successResponseWithMessage, errorResponse, apiHandler } from '@/lib/api-utils';

// POST /api/auth/login - 로그인
export const POST = apiHandler('login', async (request: NextRequest) => {
  const body = await request.json();
  const { email, password } = body;

  // 유효성 검사
  if (!email || !password) {
    return errorResponse('이메일과 비밀번호를 입력해주세요', 400);
  }

  // 사용자 조회
  const user = await prisma.user.findFirst({
    where: {
      email,
      deletedAt: null,
    },
  });

  if (!user) {
    return errorResponse('이메일 또는 비밀번호가 올바르지 않습니다', 401);
  }

  // 비밀번호 확인
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return errorResponse('이메일 또는 비밀번호가 올바르지 않습니다', 401);
  }

  // 비밀번호 제외하고 반환
  const { password: _, ...userWithoutPassword } = user;

  return successResponseWithMessage({ user: userWithoutPassword }, '로그인 성공');
});
