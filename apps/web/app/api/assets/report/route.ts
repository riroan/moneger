import { NextRequest } from 'next/server';
import {
  apiHandler,
  errorResponse,
  successResponse,
  validateUserId,
} from '@/lib/api-utils';
import { getAssetReport } from '@/lib/services/asset.service';
import { parseMonthKey } from '@/lib/utils/asset-month';

const DEFAULT_RANGE = 5;
const MAX_RANGE = 12;

export const GET = apiHandler('fetch asset report', async (request: NextRequest) => {
  const userId = request.nextUrl.searchParams.get('userId');
  const monthStr = request.nextUrl.searchParams.get('month');
  const rangeStr = request.nextUrl.searchParams.get('range');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
    return errorResponse('month must be YYYY-MM', 400);
  }

  let range = rangeStr ? parseInt(rangeStr, 10) : DEFAULT_RANGE;
  if (isNaN(range) || range < 1) range = DEFAULT_RANGE;
  if (range > MAX_RANGE) range = MAX_RANGE;

  const endMonthKey = parseMonthKey(monthStr);
  if (isNaN(endMonthKey.getTime())) {
    return errorResponse('invalid month', 400);
  }

  const report = await getAssetReport(userId!, endMonthKey, range);
  return successResponse(report);
});
