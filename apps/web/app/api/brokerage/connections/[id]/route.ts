import { NextRequest } from 'next/server';
import {
  apiHandlerWithParams,
  errorResponse,
  successResponse,
  validateUserId,
} from '@/lib/api-utils';
import { requireFeature } from '@/lib/entitlements-server';
import { deleteConnection } from '@/lib/services/brokerage.service';

// DELETE /api/brokerage/connections/[id] — 소프트 삭제 + 자격증명 wipe
export const DELETE = apiHandlerWithParams<{ id: string }>(
  'delete brokerage connection',
  async (request: NextRequest, { id }) => {
    const userId = request.nextUrl.searchParams.get('userId');
    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;
    const featureError = await requireFeature(userId!, 'BROKERAGE');
    if (featureError) return featureError;

    const result = await deleteConnection(userId!, id);
    if (!result) return errorResponse('connection not found', 404);
    return successResponse(result);
  }
);
