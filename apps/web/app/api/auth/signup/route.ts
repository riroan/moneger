import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponseWithMessage, errorResponse, apiHandler } from '@/lib/api-utils';
import { findUserByEmail, hashPassword, excludePassword } from '@/lib/services/auth.service';

// POST /api/auth/signup - 회원가입
export const POST = apiHandler('signup', async (request: NextRequest) => {
  const body = await request.json();
  const { email, password, name } = body;

  if (!email || !password) {
    return errorResponse('이메일과 비밀번호를 입력해주세요', 400);
  }

  if (password.length < 6) {
    return errorResponse('비밀번호는 최소 6자 이상이어야 합니다', 400);
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return errorResponse('이미 사용 중인 이메일입니다', 409);
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name || null,
    },
  });

  return successResponseWithMessage({ user: excludePassword(user) }, '회원가입 성공', 201);
});
