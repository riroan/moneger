import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// PATCH /api/auth/password - 비밀번호 변경
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, currentPassword, newPassword } = body;

    // 유효성 검사
    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: '새 비밀번호는 최소 6자 이상이어야 합니다' },
        { status: 400 }
      );
    }

    // 사용자 조회
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 현재 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '현재 비밀번호가 일치하지 않습니다' },
        { status: 401 }
      );
    }

    // 새 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json(
      {
        success: true,
        message: '비밀번호가 변경되었습니다',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password change failed:', error);
    return NextResponse.json(
      { error: '비밀번호 변경 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
