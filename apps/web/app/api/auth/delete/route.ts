import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, apiHandler } from '@/lib/api-utils';
import { findUserById, verifyPassword } from '@/lib/services/auth.service';

// DELETE /api/auth/delete - 계정 삭제 (soft delete)
export const DELETE = apiHandler('delete account', async (request: NextRequest) => {
  const body = await request.json();
  const { userId, password } = body;

  if (!userId || !password) {
    return errorResponse('비밀번호를 입력해주세요', 400);
  }

  const user = await findUserById(userId);
  if (!user) {
    return errorResponse('사용자를 찾을 수 없습니다', 404);
  }

  const isPasswordValid = await verifyPassword(password, user.password);
  if (!isPasswordValid) {
    return errorResponse('비밀번호가 일치하지 않습니다', 401);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });

  return successResponse({ message: '계정이 삭제되었습니다' });
});
