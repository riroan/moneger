import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { authenticatedHandler } from '@/lib/auth-handler';
import { findUserById, verifyPassword } from '@/lib/services/auth.service';
import { deleteAllSessionsForUser, buildClearedSessionCookie } from '@/lib/session';

// DELETE /api/auth/delete - 계정 삭제 (soft delete)
export const DELETE = authenticatedHandler('delete account', async (request, { userId }) => {
  const body = await request.json();
  const { password } = body;

  if (!password) {
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

  // soft delete는 onDelete:Cascade를 트리거하지 않으므로 세션을 명시적으로 폐기
  await deleteAllSessionsForUser(userId);

  const response = successResponse({ message: '계정이 삭제되었습니다' });
  response.cookies.set(buildClearedSessionCookie());
  return response;
});
