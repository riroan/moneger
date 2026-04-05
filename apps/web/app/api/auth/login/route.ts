import { NextRequest } from 'next/server';
import { successResponseWithMessage, errorResponse, apiHandler } from '@/lib/api-utils';
import { findUserByEmail, verifyPassword, excludePassword } from '@/lib/services/auth.service';

// POST /api/auth/login - 로그인
export const POST = apiHandler('login', async (request: NextRequest) => {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return errorResponse('이메일과 비밀번호를 입력해주세요', 400);
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return errorResponse('이메일 또는 비밀번호가 올바르지 않습니다', 401);
  }

  const isPasswordValid = await verifyPassword(password, user.password);
  if (!isPasswordValid) {
    return errorResponse('이메일 또는 비밀번호가 올바르지 않습니다', 401);
  }

  return successResponseWithMessage({ user: excludePassword(user) }, '로그인 성공');
});
