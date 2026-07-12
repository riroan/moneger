import { getOldestTransactionDate } from '@/lib/services/transaction.service';
import { successResponse } from '@/lib/api-utils';
import { authenticatedHandler } from '@/lib/auth-handler';

// GET /api/transactions/oldest-date - 가장 오래된 거래 날짜 조회
export const GET = authenticatedHandler('fetch oldest transaction date', async (request, { userId }) => {
  const oldestDate = await getOldestTransactionDate(userId);

  return successResponse({
    date: oldestDate?.toISOString() || null,
    year: oldestDate?.getFullYear() || null,
    month: oldestDate ? oldestDate.getMonth() + 1 : null, // 1-based
  });
});
