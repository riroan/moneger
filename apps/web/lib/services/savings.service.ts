import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

type TransactionClient = Prisma.TransactionClient;

/**
 * 저축 목표 조회 (soft delete 제외)
 */
export async function findSavingsGoal(id: string, userId: string) {
  return prisma.savingsGoal.findFirst({
    where: { id, userId, deletedAt: null },
  });
}

/**
 * 대표 목표 설정을 포함한 저축 목표 업데이트 (트랜잭션)
 */
export async function updateSavingsGoalWithPrimary(
  id: string,
  userId: string,
  data: {
    name?: string;
    icon?: string;
    targetAmount?: number;
    targetYear?: number;
    targetMonth?: number;
    isPrimary?: boolean;
  }
) {
  return prisma.$transaction(async (tx) => {
    if (data.isPrimary === true) {
      await tx.savingsGoal.updateMany({
        where: { userId, deletedAt: null, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    return tx.savingsGoal.update({
      where: { id },
      data: {
        ...data,
        ...(data.isPrimary !== undefined ? { isPrimary: data.isPrimary } : {}),
      },
    });
  });
}

/**
 * 대표 목표 토글 (트랜잭션)
 */
export async function togglePrimarySavingsGoal(id: string, userId: string, isPrimary: boolean) {
  return prisma.$transaction(async (tx) => {
    if (isPrimary === true) {
      await tx.savingsGoal.updateMany({
        where: { userId, deletedAt: null, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    return tx.savingsGoal.update({
      where: { id },
      data: { isPrimary },
    });
  });
}

/**
 * 저축 목표 소프트 삭제
 */
export async function deleteSavingsGoal(id: string) {
  return prisma.savingsGoal.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/**
 * 저축 입금 (목표 금액 업데이트 + 거래 생성 + DailyBalance 업데이트)
 */
export async function depositToSavingsGoal(
  tx: TransactionClient,
  goalId: string,
  userId: string,
  amount: number,
  goalName: string,
  currentAmount: number,
  date: Date
) {
  const updatedGoal = await tx.savingsGoal.update({
    where: { id: goalId },
    data: { currentAmount: currentAmount + amount },
  });

  const transaction = await tx.transaction.create({
    data: {
      userId,
      amount,
      type: 'EXPENSE',
      description: `${goalName} 저축`,
      categoryId: null,
      savingsGoalId: goalId,
      date,
    },
  });

  return { updatedGoal, transaction };
}
