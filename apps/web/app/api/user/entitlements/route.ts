import { successResponse, errorResponse } from '@/lib/api-utils';
import { authenticatedHandler } from '@/lib/auth-handler';
import { prisma } from '@/lib/prisma';
import { effectivePlan, planFeatures } from '@/lib/entitlements';

// GET /api/user/entitlements - 유저의 (만료 반영된) plan과 사용 가능 기능 목록
export const GET = authenticatedHandler('get user entitlements', async (request, { userId }) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true },
  });

  if (!user) {
    return errorResponse('User not found', 404);
  }

  return successResponse({
    plan: effectivePlan(user),
    features: planFeatures(user),
  });
});
