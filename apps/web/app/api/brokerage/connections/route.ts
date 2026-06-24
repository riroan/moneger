import { NextRequest } from 'next/server';
import { apiHandler, errorResponse, successResponse, validateUserId } from '@/lib/api-utils';
import {
  listConnections,
  createConnection,
  testCredentials,
  DuplicateBrokerageConnectionError,
  ensureBrokerageSlotAvailable,
} from '@/lib/services/brokerage.service';
import { BrokerageError, type Broker } from '@/lib/services/brokerage/types';

const VALID_BROKERS: Broker[] = ['KIS', 'TOSS'];

export const GET = apiHandler('list brokerage connections', async (request: NextRequest) => {
  const userId = request.nextUrl.searchParams.get('userId');
  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  return successResponse(await listConnections(userId!));
});

export const POST = apiHandler('create brokerage connection', async (request: NextRequest) => {
  const body = await request.json();
  const { userId, broker, label, credentials } = body ?? {};

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;
  if (!VALID_BROKERS.includes(broker)) {
    return errorResponse('broker must be KIS or TOSS', 400);
  }
  if (!credentials || typeof credentials !== 'object') {
    return errorResponse('credentials are required', 400);
  }

  try {
    await ensureBrokerageSlotAvailable(userId, broker);
    // 저장 전 검증 — 유효하지 않은 자격증명은 저장하지 않는다.
    await testCredentials(broker, credentials);
    const conn = await createConnection(userId, { broker, label, credentials });
    return successResponse(conn, 201);
  } catch (err) {
    if (err instanceof BrokerageError) {
      return errorResponse(
        err.kind === 'auth' ? '자격증명이 올바르지 않습니다' : '증권사 연결 확인에 실패했습니다',
        400
      );
    }
    if (err instanceof DuplicateBrokerageConnectionError) {
      return errorResponse('이미 연결된 증권사입니다', 409);
    }
    // prisma unique 충돌 등 — 내부 메시지/시크릿 노출 금지
    return errorResponse('연결을 생성하지 못했습니다', 400);
  }
});
