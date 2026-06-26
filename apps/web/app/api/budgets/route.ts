import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  successResponseWithMessage,
  errorResponse,
  validateUserId,
  apiHandler,
} from '@/lib/api-utils';
import { getMonthRangeKST } from '@/lib/date-utils';

// GET /api/budgets - 예산 목록 조회
export const GET = apiHandler('fetch budgets', async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const scope = searchParams.get('scope');
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  if (scope === 'default') {
    const user = await prisma.user.findUnique({
      where: { id: userId! },
      select: { defaultExpenseBudget: true },
    });
    return successResponse({ amount: user?.defaultExpenseBudget ?? null });
  }

  // 월별 조회 시 해당 월의 예산만 반환
  if (year && month) {
    const { startDate, endDate } = getMonthRangeKST(parseInt(year), parseInt(month));

    const budgets = await prisma.budget.findMany({
      where: {
        userId: userId!,
        month: { gte: startDate, lt: new Date(endDate.getTime() + 1) },
        deletedAt: null,
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(budgets);
  }

  // 전체 예산 조회
  const budgets = await prisma.budget.findMany({
    where: {
      userId: userId!,
      deletedAt: null,
    },
    include: {
      category: {
        select: { id: true, name: true, icon: true, color: true },
      },
    },
    orderBy: { month: 'desc' },
  });

  return successResponse(budgets);
});

// POST /api/budgets - 예산 생성/업데이트
export const POST = apiHandler('save budget', async (request: NextRequest) => {
  const body = await request.json();
  const { userId, categoryId, amount, year, month, scope } = body;

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  if (amount === undefined || amount < 0) {
    return errorResponse('amount must be 0 or greater', 400);
  }

  if (scope === 'default') {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { defaultExpenseBudget: amount > 0 ? amount : null },
      select: { defaultExpenseBudget: true },
    });
    return successResponseWithMessage({ amount: user.defaultExpenseBudget }, 'Default budget saved successfully', 201);
  }

  if (!Object.prototype.hasOwnProperty.call(body, 'categoryId')) {
    return errorResponse('categoryId is required', 400);
  }

  if (!year || !month) {
    return errorResponse('year and month are required', 400);
  }

  const monthDate = new Date(year, month - 1, 1);
  const budgetCategoryId = categoryId ?? null;

  const existingBudget = await prisma.budget.findFirst({
    where: {
      userId,
      categoryId: budgetCategoryId,
      month: monthDate,
    },
    orderBy: { updatedAt: 'desc' },
  });

  const budgetPayload = {
    amount,
    deletedAt: null,
  };

  const budget = existingBudget
    ? await prisma.budget.update({
      where: { id: existingBudget.id },
      data: budgetPayload,
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
    })
    : await prisma.budget.create({
      data: {
        userId,
        categoryId: budgetCategoryId,
        amount,
        month: monthDate,
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
    });

  if (budgetCategoryId == null) {
    await prisma.budget.updateMany({
      where: {
        userId,
        categoryId: null,
        month: monthDate,
        deletedAt: null,
        id: { not: budget.id },
      },
      data: { deletedAt: new Date() },
    });
  }

  return successResponseWithMessage(budget, 'Budget saved successfully', 201);
});

// DELETE /api/budgets - 예산 삭제
export const DELETE = apiHandler('delete budget', async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const categoryId = searchParams.get('categoryId');
  const scope = searchParams.get('scope');
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const isTotalBudget = scope === 'total';
  if (scope === 'default') {
    await prisma.user.update({
      where: { id: userId! },
      data: { defaultExpenseBudget: null },
    });
    return successResponseWithMessage(null, 'Default budget deleted successfully');
  }

  if ((!isTotalBudget && !categoryId) || !year || !month) {
    return errorResponse('categoryId or scope=total, year, and month are required', 400);
  }

  const { startDate, endDate } = getMonthRangeKST(parseInt(year), parseInt(month));

  // Soft delete로 변경 (다른 테이블과 일관성 유지)
  await prisma.budget.updateMany({
    where: {
      userId: userId!,
      categoryId: isTotalBudget ? null : categoryId,
      month: { gte: startDate, lt: new Date(endDate.getTime() + 1) },
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  return successResponseWithMessage(null, 'Budget deleted successfully');
});
