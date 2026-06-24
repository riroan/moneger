import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncAllConnections } from '@/lib/services/brokerage-snapshot.service';
import { logger } from '@/lib/logger';

// POST /api/cron/brokerage - 외부 스케줄러(1분 주기)가 호출.
// 활성 증권사 연결을 가진 모든 사용자의 스냅샷을 동기화한다.
// 저장은 syncAllConnections 안에서 기존 BrokerageSnapshot의 "오늘 행"을 멱등 upsert(덮어쓰기)로 수행.
export async function POST(request: NextRequest) {
  // CRON_SECRET 인증 (다른 cron과 동일)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 동기화 대상 사용자 = 활성 연결을 가진 userId (cron엔 세션이 없으므로 직접 enumerate)
    const users = await prisma.brokerageConnection.findMany({
      where: { deletedAt: null, status: { not: 'DISABLED' } },
      select: { userId: true },
      distinct: ['userId'],
    });

    const results = [];
    for (const { userId } of users) {
      try {
        results.push({ userId, ...(await syncAllConnections(userId)) });
      } catch (error) {
        logger.error(`[cron/brokerage] sync failed for user ${userId}`, error as Error);
        results.push({ userId, error: 'sync failed' });
      }
    }

    return NextResponse.json({ success: true, users: users.length, results });
  } catch (error) {
    logger.error('Cron job failed', error as Error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
