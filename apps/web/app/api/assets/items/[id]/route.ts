import { NextRequest } from 'next/server';
import {
  apiHandlerWithParams,
  errorResponse,
  successResponse,
  validateUserId,
} from '@/lib/api-utils';
import {
  softDeleteAssetItem,
  updateAssetItem,
} from '@/lib/services/asset.service';

export const PATCH = apiHandlerWithParams<{ id: string }>(
  'update asset item',
  async (request: NextRequest, { id }) => {
    const body = await request.json();
    const { userId, name, icon, order } = body ?? {};

    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    try {
      const item = await updateAssetItem(id, userId, {
        name: typeof name === 'string' ? name : undefined,
        icon: icon === null || typeof icon === 'string' ? icon : undefined,
        order: typeof order === 'number' ? order : undefined,
      });
      return successResponse(item);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'failed to update';
      const status = message === 'not found' ? 404 : 400;
      return errorResponse(message, status);
    }
  }
);

export const DELETE = apiHandlerWithParams<{ id: string }>(
  'delete asset item',
  async (request: NextRequest, { id }) => {
    const userId = request.nextUrl.searchParams.get('userId');
    const userIdError = validateUserId(userId);
    if (userIdError) return userIdError;

    try {
      await softDeleteAssetItem(id, userId!);
      return successResponse({ id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'failed to delete';
      const status = message === 'not found' ? 404 : 400;
      return errorResponse(message, status);
    }
  }
);
