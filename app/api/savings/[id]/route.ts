import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validateUserId } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

// PUT /api/savings/[id] - 저축 목표 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, name, icon, targetAmount, targetYear, targetMonth, isPrimary } = body;

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    // 기존 저축 목표 확인
    const existingGoal = await prisma.savingsGoal.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existingGoal) {
      return errorResponse('Savings goal not found', 404);
    }

    // 대표 목표로 설정하는 경우, 다른 목표들의 isPrimary를 false로 변경
    if (isPrimary === true) {
      await prisma.savingsGoal.updateMany({
        where: { userId, deletedAt: null, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    const updatedGoal = await prisma.savingsGoal.update({
      where: { id },
      data: {
        name,
        icon,
        targetAmount,
        targetYear,
        targetMonth,
        ...(isPrimary !== undefined && { isPrimary }),
      },
    });

    return successResponse(updatedGoal);
  } catch (error) {
    logger.error('Failed to update savings goal', error);
    return errorResponse('Failed to update savings goal', 500);
  }
}

// PATCH /api/savings/[id] - 대표 저축 목표 설정/해제
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, isPrimary } = body;

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    // 기존 저축 목표 확인
    const existingGoal = await prisma.savingsGoal.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existingGoal) {
      return errorResponse('Savings goal not found', 404);
    }

    // 대표 목표로 설정하는 경우, 다른 목표들의 isPrimary를 false로 변경
    if (isPrimary === true) {
      await prisma.savingsGoal.updateMany({
        where: { userId, deletedAt: null, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    const updatedGoal = await prisma.savingsGoal.update({
      where: { id },
      data: { isPrimary },
    });

    return successResponse(updatedGoal);
  } catch (error) {
    logger.error('Failed to update primary savings goal', error);
    return errorResponse('Failed to update primary savings goal', 500);
  }
}

// DELETE /api/savings/[id] - 저축 목표 삭제 (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    // 기존 저축 목표 확인
    const existingGoal = await prisma.savingsGoal.findFirst({
      where: { id, userId: userId!, deletedAt: null },
    });

    if (!existingGoal) {
      return errorResponse('Savings goal not found', 404);
    }

    await prisma.savingsGoal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return successResponse({ message: 'Savings goal deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete savings goal', error);
    return errorResponse('Failed to delete savings goal', 500);
  }
}
