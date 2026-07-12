import {
  errorResponse,
  successResponse,
} from '@/lib/api-utils';
import { authenticatedHandlerWithParams } from '@/lib/auth-handler';
import { requireFeature } from '@/lib/entitlements-server';
import { deleteConnection } from '@/lib/services/brokerage.service';

// DELETE /api/brokerage/connections/[id] — 소프트 삭제 + 자격증명 wipe
export const DELETE = authenticatedHandlerWithParams<{ id: string }>(
  'delete brokerage connection',
  async (request, { id }, { userId }) => {
    const featureError = await requireFeature(userId, 'BROKERAGE');
    if (featureError) return featureError;

    const result = await deleteConnection(userId, id);
    if (!result) return errorResponse('connection not found', 404);
    return successResponse(result);
  }
);
