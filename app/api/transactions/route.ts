import { NextRequest } from 'next/server';
import { TransactionType } from '@prisma/client';
import {
  successResponseWithMessage,
  errorResponse,
  paginatedResponse,
  validateUserId,
  validateTransactionType,
  validateAmount,
} from '@/lib/api-utils';
import {
  createTransaction,
  getTransactions,
  validateCategory,
} from '@/lib/services/transaction.service';

// GET /api/transactions - 거래 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    const result = await getTransactions({
      userId: userId!,
      year: searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined,
      month: searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined,
      type: searchParams.get('type') as TransactionType | undefined,
      categoryIds: searchParams.getAll('categoryId'),
      search: searchParams.get('search') || undefined,
      sort: (searchParams.get('sort') || 'recent') as 'recent' | 'oldest' | 'expensive' | 'cheapest',
      cursor: searchParams.get('cursor') || undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      startYear: searchParams.get('startYear') ? parseInt(searchParams.get('startYear')!) : undefined,
      startMonth: searchParams.get('startMonth') ? parseInt(searchParams.get('startMonth')!) : undefined,
      endYear: searchParams.get('endYear') ? parseInt(searchParams.get('endYear')!) : undefined,
      endMonth: searchParams.get('endMonth') ? parseInt(searchParams.get('endMonth')!) : undefined,
      minAmount: searchParams.get('minAmount') ? parseInt(searchParams.get('minAmount')!) : undefined,
      maxAmount: searchParams.get('maxAmount') ? parseInt(searchParams.get('maxAmount')!) : undefined,
    });

    return paginatedResponse(result.data, result.count, result.nextCursor, result.hasMore);
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return errorResponse('Failed to fetch transactions', 500);
  }
}

// POST /api/transactions - 거래 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, amount, description, categoryId, date } = body;

    // 유효성 검사
    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    const typeError = validateTransactionType(type);
    if (typeError) return typeError;

    const amountError = validateAmount(amount);
    if (amountError) return amountError;

    // 카테고리 검증
    if (categoryId) {
      const category = await validateCategory(categoryId, userId, type);
      if (!category) {
        return errorResponse('Invalid category or category type mismatch', 400);
      }
    }

    const transaction = await createTransaction({
      userId,
      type,
      amount: parseFloat(amount),
      description,
      categoryId,
      date: date ? new Date(date) : undefined,
    });

    return successResponseWithMessage(transaction, 'Transaction created successfully', 201);
  } catch (error) {
    console.error('Failed to create transaction:', error);
    return errorResponse('Failed to create transaction', 500);
  }
}
