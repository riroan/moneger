import { NextRequest, NextResponse } from 'next/server';
import { processRecurringExpenses } from '@/lib/services/recurring.service';
import { logger } from '@/lib/logger';

// POST /api/cron/recurring - Vercel Cron: 정기 지출 자동 처리
export async function POST(request: NextRequest) {
  // CRON_SECRET 인증
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processRecurringExpenses();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Cron job failed', error as Error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
