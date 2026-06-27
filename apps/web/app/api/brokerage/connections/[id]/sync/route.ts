import { NextRequest } from 'next/server';
import {
  apiHandlerWithParams,
  errorResponse,
  successResponse,
  validateUserId,
} from '@/lib/api-utils';
import { requireFeature } from '@/lib/entitlements-server';
import { syncConnection } from '@/lib/services/brokerage-snapshot.service';
import { BrokerageError } from '@/lib/services/brokerage/types';

// POST /api/brokerage/connections/[id]/sync — 수동 "지금 동기화"
export const POST = apiHandlerWithParams<{ id: string }>(
  'sync brokerage connection',
  async (request: NextRequest, { id }) => {
    const body = await request.json().catch(() => ({}));
    const userId = body?.userId ?? request.nextUrl.searchParams.get('userId');
    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;
    const featureError = await requireFeature(userId!, 'BROKERAGE');
    if (featureError) return featureError;

    try {
      const result = await syncConnection(userId, id);
      if (!result) return errorResponse('connection not found', 404);
      return successResponse(result);
    } catch (err) {
      if (err instanceof BrokerageError) {
        return errorResponse(
          err.kind === 'auth' ? '자격증명이 올바르지 않습니다' : '동기화에 실패했습니다',
          400
        );
      }
      return errorResponse('동기화에 실패했습니다', 500);
    }
  }
);
