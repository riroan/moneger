import { NextRequest } from 'next/server';
import { successResponse, validateUserId, apiHandler } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';

// GET /api/savings/trend - 월별 저축 추세 조회
export const GET = apiHandler('fetch savings trend', async (request: NextRequest) => {
  const userId = request.nextUrl.searchParams.get('userId');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const monthlyData = await prisma.$queryRaw<{ month: string; amount: number }[]>`
    SELECT
      DATE_FORMAT(date, '%Y-%m') as month,
      SUM(savings) as amount
    FROM DailyBalance
    WHERE userId = ${userId}
    GROUP BY DATE_FORMAT(date, '%Y-%m')
    HAVING SUM(savings) > 0
    ORDER BY month ASC
  `;

  let cumulative = 0;
  const data = monthlyData.map((row) => {
    cumulative += Number(row.amount);
    return {
      month: row.month,
      amount: Number(row.amount),
      cumulative,
    };
  });

  return successResponse(data);
});
