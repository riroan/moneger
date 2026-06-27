import type { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse } from '@/lib/api-utils';
import { hasFeature, type Feature } from '@/lib/entitlements';

// API 라우트용 요금제 게이트. features 중 하나라도 가지고 있으면 통과(null),
// 없으면 403 응답을 반환한다. 유저가 없으면 404.
export async function requireFeature(
  userId: string,
  ...features: Feature[]
): Promise<NextResponse | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true },
  });

  if (!user) {
    return errorResponse('User not found', 404);
  }

  const allowed = features.some((feature) => hasFeature(user, feature));
  if (!allowed) {
    return errorResponse('이 기능은 현재 요금제에서 사용할 수 없습니다', 403);
  }

  return null;
}
