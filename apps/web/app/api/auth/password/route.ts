import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponseWithMessage, errorResponse, apiHandler } from '@/lib/api-utils';
import { findUserById, verifyPassword, hashPassword } from '@/lib/services/auth.service';

// PATCH /api/auth/password - 비밀번호 변경
export const PATCH = apiHandler('change password', async (request: NextRequest) => {
  const body = await request.json();
  const { userId, currentPassword, newPassword } = body;

  if (!userId || !currentPassword || !newPassword) {
    return errorResponse('모든 필드를 입력해주세요', 400);
  }

  if (newPassword.length < 6) {
    return errorResponse('새 비밀번호는 최소 6자 이상이어야 합니다', 400);
  }

  const user = await findUserById(userId);
  if (!user) {
    return errorResponse('사용자를 찾을 수 없습니다', 404);
  }

  const isPasswordValid = await verifyPassword(currentPassword, user.password);
  if (!isPasswordValid) {
    return errorResponse('현재 비밀번호가 일치하지 않습니다', 401);
  }

  const hashedNewPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedNewPassword },
  });

  return successResponseWithMessage(null, '비밀번호가 변경되었습니다');
});
