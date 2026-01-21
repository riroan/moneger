import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  successResponseWithMessage,
  errorResponse,
  validateUserId,
} from '@/lib/api-utils';

// GET /api/budgets - 예산 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    // 월별 조회 시 해당 월의 예산만 반환
    if (year && month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);

      const budgets = await prisma.budget.findMany({
        where: {
          userId: userId!,
          month: startDate,
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
  } catch (error) {
    console.error('Failed to fetch budgets:', error);
    return errorResponse('Failed to fetch budgets', 500);
  }
}

// POST /api/budgets - 예산 생성/업데이트
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, categoryId, amount, year, month } = body;

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    if (!categoryId) {
      return errorResponse('categoryId is required', 400);
    }

    if (amount === undefined || amount < 0) {
      return errorResponse('amount must be 0 or greater', 400);
    }

    if (!year || !month) {
      return errorResponse('year and month are required', 400);
    }

    const monthDate = new Date(year, month - 1, 1);

    // upsert로 생성 또는 업데이트
    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_month: {
          userId,
          categoryId,
          month: monthDate,
        },
      },
      update: { amount },
      create: {
        userId,
        categoryId,
        amount,
        month: monthDate,
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
    });

    return successResponseWithMessage(budget, 'Budget saved successfully', 201);
  } catch (error) {
    console.error('Failed to save budget:', error);
    return errorResponse('Failed to save budget', 500);
  }
}

// DELETE /api/budgets - 예산 삭제
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const categoryId = searchParams.get('categoryId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    if (!categoryId || !year || !month) {
      return errorResponse('categoryId, year, and month are required', 400);
    }

    const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);

    await prisma.budget.deleteMany({
      where: {
        userId: userId!,
        categoryId,
        month: monthDate,
      },
    });

    return successResponseWithMessage(null, 'Budget deleted successfully');
  } catch (error) {
    console.error('Failed to delete budget:', error);
    return errorResponse('Failed to delete budget', 500);
  }
}
