import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { logger } from '@/lib/logger';
import { successResponseWithMessage, errorResponse } from '@/lib/api-utils';

// PATCH /api/auth/password - 비밀번호 변경
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, currentPassword, newPassword } = body;

    // 유효성 검사
    if (!userId || !currentPassword || !newPassword) {
      return errorResponse('모든 필드를 입력해주세요', 400);
    }

    if (newPassword.length < 6) {
      return errorResponse('새 비밀번호는 최소 6자 이상이어야 합니다', 400);
    }

    // 사용자 조회
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    if (!user) {
      return errorResponse('사용자를 찾을 수 없습니다', 404);
    }

    // 현재 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return errorResponse('현재 비밀번호가 일치하지 않습니다', 401);
    }

    // 새 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return successResponseWithMessage(null, '비밀번호가 변경되었습니다');
  } catch (error) {
    logger.error('Password change failed', error);
    return errorResponse('비밀번호 변경 중 오류가 발생했습니다', 500);
  }
}
