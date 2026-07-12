import {
  errorResponse,
  successResponse,
} from '@/lib/api-utils';
import { authenticatedHandlerWithParams } from '@/lib/auth-handler';
import { requireFeature } from '@/lib/entitlements-server';
import { syncConnection } from '@/lib/services/brokerage-snapshot.service';
import { BrokerageError } from '@/lib/services/brokerage/types';

// POST /api/brokerage/connections/[id]/sync — 수동 "지금 동기화"
export const POST = authenticatedHandlerWithParams<{ id: string }>(
  'sync brokerage connection',
  async (request, { id }, { userId }) => {
    const featureError = await requireFeature(userId, 'BROKERAGE');
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
