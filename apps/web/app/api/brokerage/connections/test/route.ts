import { NextRequest } from 'next/server';
import { apiHandler, errorResponse, successResponse, validateUserId } from '@/lib/api-utils';
import { requireFeature } from '@/lib/entitlements-server';
import { testCredentials } from '@/lib/services/brokerage.service';
import { BrokerageError, type Broker } from '@/lib/services/brokerage/types';

const VALID_BROKERS: Broker[] = ['KIS', 'TOSS'];

// POST /api/brokerage/connections/test — 저장 전 "연결 테스트"
export const POST = apiHandler('test brokerage credentials', async (request: NextRequest) => {
  const body = await request.json();
  const { userId, broker, credentials } = body ?? {};

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;
  const featureError = await requireFeature(userId!, 'BROKERAGE');
  if (featureError) return featureError;
  if (!VALID_BROKERS.includes(broker)) {
    return errorResponse('broker must be KIS or TOSS', 400);
  }
  if (!credentials || typeof credentials !== 'object') {
    return errorResponse('credentials are required', 400);
  }

  try {
    await testCredentials(broker, credentials);
    return successResponse({ ok: true });
  } catch (err) {
    if (err instanceof BrokerageError && err.kind === 'auth') {
      return errorResponse('자격증명이 올바르지 않습니다', 400);
    }
    return errorResponse('증권사 연결 확인에 실패했습니다', 400);
  }
});
