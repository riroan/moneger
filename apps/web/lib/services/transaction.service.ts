import { prisma } from '@/lib/prisma';
import { TransactionType, Prisma } from '@prisma/client';
import { updateDailyBalanceInTransaction } from './daily-balance.service';
import { CATEGORY_SELECT } from '@/lib/prisma-selects';
import { getMonthRange } from '@/lib/date-utils';
import { PAGINATION } from '@/lib/constants';

interface CreateTransactionInput {
  userId: string;
  type: TransactionType;
  amount: number;
  description?: string | null;
  categoryId?: string | null;
  date?: Date;
}

interface UpdateTransactionInput {
  type?: TransactionType;
  amount?: number;
  description?: string | null;
  categoryId?: string | null;
  date?: Date;
}

interface GetTransactionsInput {
  userId: string;
  year?: number;
  month?: number;
  type?: TransactionType;
  categoryIds?: string[];
  search?: string;
  sort?: 'recent' | 'oldest' | 'expensive' | 'cheapest';
  cursor?: string;
  limit?: number;
  startYear?: number;
  startMonth?: number;
  endYear?: number;
  endMonth?: number;
  minAmount?: number;
  maxAmount?: number;
  savingsOnly?: boolean;
}

/**
 * 거래 생성
 */
export async function createTransaction(input: CreateTransactionInput) {
  const { userId, type, amount, description, categoryId, date } = input;

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        userId,
        type,
        amount,
        description: description || null,
        categoryId: categoryId || null,
        date: date || new Date(),
      },
      include: { category: { select: CATEGORY_SELECT } },
    });

    await updateDailyBalanceInTransaction(tx, userId, transaction.date);

    return transaction;
  });
}

/**
 * 거래 수정
 */
export async function updateTransaction(
  id: string,
  userId: string,
  input: UpdateTransactionInput,
  existingTransaction: { date: Date; amount: number; savingsGoalId: string | null }
) {
  const updateData: Prisma.TransactionUpdateInput = {};

  if (input.type !== undefined) updateData.type = input.type;
  if (input.amount !== undefined) updateData.amount = input.amount;
  if (input.description !== undefined) updateData.description = input.description || null;
  if (input.categoryId !== undefined) {
    updateData.category = input.categoryId ? { connect: { id: input.categoryId } } : { disconnect: true };
  }
  if (input.date !== undefined) updateData.date = input.date;

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.update({
      where: { id },
      data: updateData,
      include: { category: { select: CATEGORY_SELECT } },
    });

    // 기존 날짜 업데이트
    await updateDailyBalanceInTransaction(tx, userId, existingTransaction.date);

    // 날짜가 변경된 경우 새 날짜도 업데이트
    if (input.date && input.date.toDateString() !== existingTransaction.date.toDateString()) {
      await updateDailyBalanceInTransaction(tx, userId, input.date);
    }

    // 저축 목표가 연결된 거래인 경우 저축 목표 금액 업데이트
    if (existingTransaction.savingsGoalId && input.amount !== undefined) {
      const amountDiff = input.amount - existingTransaction.amount;
      if (amountDiff !== 0) {
        await tx.savingsGoal.update({
          where: { id: existingTransaction.savingsGoalId },
          data: {
            currentAmount: { increment: amountDiff },
          },
        });
      }
    }

    return transaction;
  });
}

/**
 * 거래 삭제 (Soft Delete)
 */
export async function deleteTransaction(
  id: string,
  userId: string,
  existingTransaction: { date: Date; amount: number; savingsGoalId: string | null }
) {
  return prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await updateDailyBalanceInTransaction(tx, userId, existingTransaction.date);

    // 저축 목표가 연결된 거래인 경우 저축 목표 금액 차감
    if (existingTransaction.savingsGoalId) {
      await tx.savingsGoal.update({
        where: { id: existingTransaction.savingsGoalId },
        data: {
          currentAmount: { decrement: existingTransaction.amount },
        },
      });
    }
  });
}

/**
 * 거래 조회 (존재 확인용)
 */
export async function findTransaction(id: string, userId: string) {
  return prisma.transaction.findFirst({
    where: { id, userId, deletedAt: null },
    select: {
      id: true,
      amount: true,
      type: true,
      description: true,
      date: true,
      categoryId: true,
      savingsGoalId: true,
      userId: true,
    },
  });
}

/**
 * 거래 목록 조회 (페이지네이션)
 */
export async function getTransactions(input: GetTransactionsInput) {
  const { userId, year, month, type, categoryIds, search, sort = 'recent', cursor, limit = PAGINATION.DEFAULT_LIMIT } = input;

  // 필터 조건
  const where: Prisma.TransactionWhereInput = { userId, deletedAt: null };

  // 날짜 범위 필터 (startYear, startMonth ~ endYear, endMonth)
  if (input.startYear !== undefined && input.startMonth !== undefined &&
      input.endYear !== undefined && input.endMonth !== undefined) {
    const startDate = new Date(input.startYear, input.startMonth - 1, 1);
    const endDate = new Date(input.endYear, input.endMonth, 0, 23, 59, 59, 999);
    where.date = { gte: startDate, lte: endDate };
  } else if (year && month) {
    // 기존 단일 월 필터
    const { startDate, endDate } = getMonthRange(year, month);
    where.date = { gte: startDate, lte: endDate };
  }

  if (type) {
    where.type = type;
    // 지출 필터 시 저축 거래 제외
    if (type === 'EXPENSE') {
      where.savingsGoalId = null;
    }
  }
  if (categoryIds?.length) where.categoryId = { in: categoryIds };
  if (search) where.description = { contains: search, mode: 'insensitive' };

  // 저축 전용 필터 (savingsGoalId가 있는 거래만)
  if (input.savingsOnly) {
    where.savingsGoalId = { not: null };
  }

  // 금액 범위 필터
  if (input.minAmount !== undefined || input.maxAmount !== undefined) {
    where.amount = {};
    if (input.minAmount !== undefined) {
      where.amount.gte = input.minAmount;
    }
    if (input.maxAmount !== undefined) {
      where.amount.lte = input.maxAmount;
    }
  }

  // 정렬
  const orderByMap: Record<string, Prisma.TransactionOrderByWithRelationInput> = {
    recent: { date: 'desc' },
    oldest: { date: 'asc' },
    expensive: { amount: 'desc' },
    cheapest: { amount: 'asc' },
  };
  const orderBy = orderByMap[sort];

  // 쿼리 옵션
  const queryOptions: Prisma.TransactionFindManyArgs = {
    where,
    include: { category: { select: CATEGORY_SELECT } },
    orderBy,
    take: limit + 1,
  };

  if (cursor) {
    queryOptions.cursor = { id: cursor };
    queryOptions.skip = 1;
  }

  const transactions = await prisma.transaction.findMany(queryOptions);

  const hasMore = transactions.length > limit;
  const data = hasMore ? transactions.slice(0, limit) : transactions;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, count: data.length, nextCursor, hasMore };
}

/**
 * 최근 거래 조회
 */
export async function getRecentTransactions(userId: string, limit = 5) {
  return prisma.transaction.findMany({
    where: { userId, deletedAt: null },
    include: { category: { select: CATEGORY_SELECT } },
    orderBy: { date: 'desc' },
    take: limit,
  });
}

/**
 * 가장 오래된 거래 날짜 조회
 */
export async function getOldestTransactionDate(userId: string): Promise<Date | null> {
  const oldest = await prisma.transaction.findFirst({
    where: { userId, deletedAt: null },
    orderBy: { date: 'asc' },
    select: { date: true },
  });
  return oldest?.date || null;
}

/**
 * 카테고리 유효성 검증
 */
export async function validateCategory(categoryId: string, userId: string, type: TransactionType) {
  return prisma.category.findFirst({
    where: { id: categoryId, userId, type, deletedAt: null },
  });
}
