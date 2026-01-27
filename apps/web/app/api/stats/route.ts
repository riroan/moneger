import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validateUserId } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { getMonthlyStats } from '@/lib/services/stats.service';

// GET /api/stats - 통계 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    if (!year || !month) {
      return errorResponse('year and month are required', 400);
    }

    const stats = await getMonthlyStats(userId!, parseInt(year), parseInt(month));

    return successResponse(stats);
  } catch (error) {
    logger.error('Failed to fetch stats', error);
    return errorResponse('Failed to fetch stats', 500);
  }
}
