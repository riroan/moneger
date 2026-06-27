import { NextRequest } from 'next/server';
import { apiHandler, successResponse, errorResponse, validateUserId } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import { effectivePlan, planFeatures } from '@/lib/entitlements';

// GET /api/user/entitlements?userId= - 유저의 (만료 반영된) plan과 사용 가능 기능 목록
export const GET = apiHandler('get user entitlements', async (request: NextRequest) => {
  const userId = request.nextUrl.searchParams.get('userId');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const user = await prisma.user.findUnique({
    where: { id: userId! },
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
