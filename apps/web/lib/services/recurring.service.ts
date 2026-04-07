import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';
import { createTransaction } from './transaction.service';
import { toKSTDateForDB } from '@/lib/date-utils';
import { logger } from '@/lib/logger';
import { CATEGORY_SELECT } from '@/lib/prisma-selects';

interface CreateRecurringExpenseInput {
  userId: string;
  amount: number;
  description: string;
  type?: TransactionType;
  categoryId?: string | null;
  dayOfMonth: number;
}

interface UpdateRecurringExpenseInput {
  amount?: number;
  description?: string;
  categoryId?: string | null;
  dayOfMonth?: number;
  isActive?: boolean;
}

/**
 * dayOfMonth를 해당 월의 유효한 날짜로 클램핑
 */
function clampDayOfMonth(year: number, month: number, dayOfMonth: number): number {
  const lastDay = new Date(year, month, 0).getDate();
  return Math.min(dayOfMonth, lastDay);
}

/**
 * nextDueDate 계산 (KST 기준, @db.Date 저장용)
 */
function calculateNextDueDate(dayOfMonth: number, fromDate?: Date): Date {
  const now = fromDate || new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);
  const kstYear = kstNow.getUTCFullYear();
  const kstMonth = kstNow.getUTCMonth() + 1; // 1-based
  const kstDay = kstNow.getUTCDate();

  const clampedDay = clampDayOfMonth(kstYear, kstMonth, dayOfMonth);

  // 오늘 이후면 이번 달, 아니면 다음 달
  if (clampedDay > kstDay) {
    return new Date(Date.UTC(kstYear, kstMonth - 1, clampedDay));
  }

  // 다음 달
  const nextMonth = kstMonth + 1;
  const nextYear = nextMonth > 12 ? kstYear + 1 : kstYear;
  const actualNextMonth = nextMonth > 12 ? 1 : nextMonth;
  const nextClampedDay = clampDayOfMonth(nextYear, actualNextMonth, dayOfMonth);
  return new Date(Date.UTC(nextYear, actualNextMonth - 1, nextClampedDay));
}

/**
 * nextDueDate를 다음 달로 이동
 */
function advanceNextDueDate(currentDueDate: Date, dayOfMonth: number): Date {
  const year = currentDueDate.getUTCFullYear();
  const month = currentDueDate.getUTCMonth(); // 0-based
  const nextMonth = month + 1;
  const nextYear = nextMonth > 11 ? year + 1 : year;
  const actualNextMonth = nextMonth > 11 ? 0 : nextMonth;
  const lastDay = new Date(nextYear, actualNextMonth + 1, 0).getDate();
  const clampedDay = Math.min(dayOfMonth, lastDay);
  return new Date(Date.UTC(nextYear, actualNextMonth, clampedDay));
}

/**
 * 정기 지출 생성
 */
export async function createRecurringExpense(input: CreateRecurringExpenseInput) {
  const { userId, amount, description, type = 'EXPENSE', categoryId, dayOfMonth } = input;

  const nextDueDate = calculateNextDueDate(dayOfMonth);

  return prisma.recurringExpense.create({
    data: {
      userId,
      amount,
      description,
      type,
      categoryId: categoryId || null,
      dayOfMonth,
      nextDueDate,
    },
    include: { category: { select: CATEGORY_SELECT } },
  });
}

/**
 * 정기 지출 수정
 */
export async function updateRecurringExpense(
  id: string,
  userId: string,
  input: UpdateRecurringExpenseInput
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.recurringExpense.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) return null;

    // 금액 변경 시 이력 저장
    if (input.amount !== undefined && input.amount !== existing.amount) {
      await tx.recurringExpenseHistory.create({
        data: {
          recurringExpenseId: id,
          previousAmount: existing.amount,
          newAmount: input.amount,
        },
      });
    }

    // dayOfMonth 변경 시 nextDueDate 재계산
    const updateData: Record<string, unknown> = {};
    if (input.amount !== undefined) updateData.amount = input.amount;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.categoryId !== undefined) updateData.categoryId = input.categoryId || null;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.dayOfMonth !== undefined) {
      updateData.dayOfMonth = input.dayOfMonth;
      updateData.nextDueDate = calculateNextDueDate(input.dayOfMonth);
    }

    return tx.recurringExpense.update({
      where: { id },
      data: updateData,
      include: { category: { select: CATEGORY_SELECT } },
    });
  });
}

/**
 * 정기 지출 삭제 (soft delete)
 */
export async function deleteRecurringExpense(id: string, userId: string) {
  const existing = await prisma.recurringExpense.findFirst({
    where: { id, userId, deletedAt: null },
  });

  if (!existing) return null;

  return prisma.recurringExpense.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}

/**
 * 정기 지출 목록 조회
 */
export async function getRecurringExpenses(userId: string) {
  return prisma.recurringExpense.findMany({
    where: { userId, deletedAt: null },
    include: {
      category: { select: CATEGORY_SELECT },
      history: { orderBy: { changedAt: 'desc' }, take: 5 },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * 정기 지출 단건 조회
 */
export async function findRecurringExpense(id: string, userId: string) {
  return prisma.recurringExpense.findFirst({
    where: { id, userId, deletedAt: null },
    include: {
      category: { select: CATEGORY_SELECT },
      history: { orderBy: { changedAt: 'desc' } },
    },
  });
}

/**
 * 정기 지출 요약 (실제 쓸 수 있는 돈)
 */
export async function getRecurringSummary(userId: string) {
  const today = toKSTDateForDB(new Date());
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(Date.now() + kstOffset);
  const year = kstNow.getUTCFullYear();
  const month = kstNow.getUTCMonth(); // 0-based
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0));

  const [currentBalance, remainingExpenses, allActiveExpenses, processedCount] = await Promise.all([
    // 현재 잔액: DailyBalance에서 MAX(date)의 balance
    prisma.dailyBalance.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { balance: true },
    }),
    // 이번 달 남은 정기 지출
    prisma.recurringExpense.findMany({
      where: {
        userId,
        isActive: true,
        deletedAt: null,
        nextDueDate: { gt: today, lte: monthEnd },
      },
      select: { amount: true },
    }),
    // 전체 활성 정기 지출 (카테고리별 분석용)
    prisma.recurringExpense.findMany({
      where: { userId, isActive: true, deletedAt: null },
      include: { category: { select: CATEGORY_SELECT } },
    }),
    // 이번 달 처리된 정기 지출 수
    prisma.transaction.count({
      where: {
        userId,
        recurringExpenseId: { not: null },
        date: { gte: monthStart, lte: monthEnd },
        deletedAt: null,
      },
    }),
  ]);

  const balance = currentBalance?.balance || 0;
  const remainingTotal = remainingExpenses.reduce((sum, e) => sum + e.amount, 0);
  const disposableAmount = balance - remainingTotal;
  const totalMonthly = allActiveExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 카테고리별 분석
  const categoryBreakdown: { name: string; color: string | null; amount: number; percentage: number }[] = [];
  const categoryMap = new Map<string, { name: string; color: string | null; amount: number }>();

  for (const expense of allActiveExpenses) {
    const key = expense.categoryId || '_uncategorized';
    const name = expense.category?.name || '미분류';
    const color = expense.category?.color || null;
    const existing = categoryMap.get(key);
    if (existing) {
      existing.amount += expense.amount;
    } else {
      categoryMap.set(key, { name, color, amount: expense.amount });
    }
  }

  for (const [, value] of categoryMap) {
    categoryBreakdown.push({
      ...value,
      percentage: totalMonthly > 0 ? Math.round((value.amount / totalMonthly) * 100) : 0,
    });
  }
  categoryBreakdown.sort((a, b) => b.amount - a.amount);

  return {
    balance,
    remainingTotal,
    disposableAmount,
    totalMonthly,
    activeCount: allActiveExpenses.length,
    processedThisMonth: processedCount,
    categoryBreakdown,
  };
}

/**
 * 다가오는 정기 지출 알림 (3일 이내)
 */
export async function getUpcomingAlerts(userId: string) {
  const today = toKSTDateForDB(new Date());
  const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

  return prisma.recurringExpense.findMany({
    where: {
      userId,
      isActive: true,
      deletedAt: null,
      nextDueDate: { gte: today, lte: threeDaysLater },
    },
    include: { category: { select: CATEGORY_SELECT } },
    orderBy: { nextDueDate: 'asc' },
  });
}

/**
 * Cron: 만기된 정기 지출 처리
 */
export async function processRecurringExpenses() {
  const today = toKSTDateForDB(new Date());

  const dueExpenses = await prisma.recurringExpense.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      nextDueDate: { lte: today },
    },
  });

  let processed = 0;
  let failed = 0;
  const errors: { id: string; error: string }[] = [];

  for (const expense of dueExpenses) {
    try {
      // 멱등성 체크: 이번 월에 이미 이 recurringExpenseId로 생성된 거래가 있는지
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstNow = new Date(Date.now() + kstOffset);
      const year = kstNow.getUTCFullYear();
      const month = kstNow.getUTCMonth();
      const monthStart = new Date(Date.UTC(year, month, 1));
      const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

      const existing = await prisma.transaction.findFirst({
        where: {
          recurringExpenseId: expense.id,
          date: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        },
      });

      if (existing) {
        // 이미 처리됨 — nextDueDate만 이동
        await prisma.recurringExpense.update({
          where: { id: expense.id },
          data: { nextDueDate: advanceNextDueDate(expense.nextDueDate, expense.dayOfMonth) },
        });
        processed++;
        continue;
      }

      // 거래 생성
      await createTransaction({
        userId: expense.userId,
        type: expense.type,
        amount: expense.amount,
        description: expense.description,
        categoryId: expense.categoryId,
        recurringExpenseId: expense.id,
        date: today,
      });

      // nextDueDate 이동
      await prisma.recurringExpense.update({
        where: { id: expense.id },
        data: { nextDueDate: advanceNextDueDate(expense.nextDueDate, expense.dayOfMonth) },
      });

      processed++;
    } catch (error) {
      failed++;
      errors.push({
        id: expense.id,
        error: error instanceof Error ? error.message : String(error),
      });
      logger.error(`Failed to process recurring expense ${expense.id}`, error as Error, {
        userId: expense.userId,
        description: expense.description,
      });
    }
  }

  logger.info(`Recurring expenses processed`, {
    total: dueExpenses.length,
    processed,
    failed,
  });

  return { total: dueExpenses.length, processed, failed, errors };
}
