import { NextRequest } from 'next/server';
import { apiHandler, isErrorResponse, parseYearMonth, successResponse, validateUserId } from '@/lib/api-utils';
import { getOrSeedCategories } from '@/lib/services/category.service';
import { getTransactionSummary } from '@/lib/services/summary.service';
import { getOldestTransactionDate, getRecentTransactions, getTodaySummary } from '@/lib/services/transaction.service';

function previousYearMonth(year: number, month: number) {
  const date = new Date(year, month - 2, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function normalizeLimit(value: string | null) {
  const parsed = value ? parseInt(value, 10) : 10;
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(Math.max(parsed, 1), 100);
}

export const GET = apiHandler('fetch dashboard bootstrap', async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const parsed = parseYearMonth(searchParams);
  if (isErrorResponse(parsed)) return parsed;

  const limit = normalizeLimit(searchParams.get('recentLimit'));
  const lastMonth = previousYearMonth(parsed.year, parsed.month);

  const [categories, oldestDate, recentTransactions, todaySummary, summary, lastMonthSummary] = await Promise.all([
    getOrSeedCategories(userId!),
    getOldestTransactionDate(userId!),
    getRecentTransactions(userId!, limit),
    getTodaySummary(userId!),
    getTransactionSummary(userId!, parsed.year, parsed.month),
    getTransactionSummary(userId!, lastMonth.year, lastMonth.month),
  ]);

  return successResponse({
    categories,
    oldestTransactionDate: {
      date: oldestDate?.toISOString() ?? null,
      year: oldestDate?.getFullYear() ?? null,
      month: oldestDate ? oldestDate.getMonth() + 1 : null,
    },
    recentTransactions,
    todaySummary,
    summary,
    lastMonthBalance: lastMonthSummary.summary.balance || 0,
  });
});
