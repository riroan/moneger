import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validateUserId } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

// POST /api/savings/[id]/deposit - 저축 목표에 입금 (거래 내역도 함께 생성)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, amount } = body;

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    if (!amount || amount <= 0) {
      return errorResponse('Amount must be greater than 0', 400);
    }

    // 저축 목표 확인
    const savingsGoal = await prisma.savingsGoal.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!savingsGoal) {
      return errorResponse('Savings goal not found', 404);
    }

    // 트랜잭션으로 저축 목표 업데이트 + 거래 내역 생성 (카테고리 없이)
    const [updatedGoal, transaction] = await prisma.$transaction([
      prisma.savingsGoal.update({
        where: { id },
        data: {
          currentAmount: savingsGoal.currentAmount + amount,
        },
      }),
      prisma.transaction.create({
        data: {
          userId,
          amount,
          type: 'EXPENSE',
          description: `${savingsGoal.name} 저축`,
          categoryId: null,
          savingsGoalId: id,
          date: new Date(),
        },
      }),
    ]);

    return successResponse({
      savingsGoal: updatedGoal,
      transaction,
    });
  } catch (error) {
    logger.error('Failed to deposit to savings goal', error);
    return errorResponse('Failed to deposit to savings goal', 500);
  }
}
