import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { toKST } from '@/lib/date-utils';
import { upsertMonthlyAssetSnapshot } from '@/lib/services/monthly-asset.service';
import { kstMonthKeyFromYM } from '@/lib/utils/asset-month';

function currentKstMonth() {
  const kst = toKST(new Date());
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { year, month, day, lastDay };
}

// POST /api/cron/assets-monthly
// 월말 KST 기준으로 모든 활성 사용자의 월간 자산 스냅샷을 멱등 저장한다.
// 테스트/수동 보정은 ?force=true 로 실행할 수 있다.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const force = request.nextUrl.searchParams.get('force') === 'true';
  const current = currentKstMonth();
  if (!force && current.day !== current.lastDay) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'not month end in KST',
      date: `${current.year}-${String(current.month).padStart(2, '0')}-${String(current.day).padStart(2, '0')}`,
    });
  }

  const monthKey = kstMonthKeyFromYM(current.year, current.month);

  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    const results = [];
    for (const user of users) {
      try {
        results.push({
          userId: user.id,
          ok: true,
          snapshot: await upsertMonthlyAssetSnapshot(user.id, monthKey, force ? 'manual' : 'cron'),
        });
      } catch (error) {
        logger.error(`[cron/assets-monthly] snapshot failed for user ${user.id}`, error as Error);
        results.push({ userId: user.id, ok: false, error: 'snapshot failed' });
      }
    }

    return NextResponse.json({
      success: true,
      month: `${current.year}-${String(current.month).padStart(2, '0')}`,
      users: users.length,
      results,
    });
  } catch (error) {
    logger.error('Monthly asset cron failed', error as Error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
