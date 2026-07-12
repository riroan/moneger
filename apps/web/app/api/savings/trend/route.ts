import { successResponse } from '@/lib/api-utils';
import { authenticatedHandler } from '@/lib/auth-handler';
import { requireFeature } from '@/lib/entitlements-server';
import { prisma } from '@/lib/prisma';

// GET /api/savings/trend - 월별 저축 추세 조회
export const GET = authenticatedHandler('fetch savings trend', async (request, { userId }) => {
  const featureError = await requireFeature(userId, 'SAVINGS');
  if (featureError) return featureError;

  const monthlyData = await prisma.$queryRaw<{ month: string; amount: number }[]>`
    SELECT
      DATE_FORMAT(date, '%Y-%m') as month,
      SUM(savings) as amount
    FROM DailyBalance
    WHERE userId = ${userId}
    GROUP BY DATE_FORMAT(date, '%Y-%m')
    HAVING SUM(savings) > 0
    ORDER BY month DESC
    LIMIT 5
  `;

  monthlyData.reverse();

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
