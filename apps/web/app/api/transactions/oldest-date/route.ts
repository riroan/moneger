import { NextRequest } from 'next/server';
import { getOldestTransactionDate } from '@/lib/services/transaction.service';
import { successResponse, validateUserId, apiHandler } from '@/lib/api-utils';

// GET /api/transactions/oldest-date - 가장 오래된 거래 날짜 조회
export const GET = apiHandler('fetch oldest transaction date', async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const oldestDate = await getOldestTransactionDate(userId!);

  return successResponse({
    date: oldestDate?.toISOString() || null,
    year: oldestDate?.getFullYear() || null,
    month: oldestDate ? oldestDate.getMonth() + 1 : null, // 1-based
  });
});
