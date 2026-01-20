import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// DELETE /api/auth/delete - 계정 삭제 (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, password } = body;

    // 유효성 검사
    if (!userId || !password) {
      return NextResponse.json(
        { error: '비밀번호를 입력해주세요' },
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

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '비밀번호가 일치하지 않습니다' },
        { status: 401 }
      );
    }

    // Soft delete - deletedAt 필드 업데이트
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json(
      {
        success: true,
        message: '계정이 삭제되었습니다',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Account deletion failed:', error);
    return NextResponse.json(
      { error: '계정 삭제 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
