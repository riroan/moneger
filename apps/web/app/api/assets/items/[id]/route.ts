import {
  errorResponse,
  successResponse,
} from '@/lib/api-utils';
import { authenticatedHandlerWithParams } from '@/lib/auth-handler';
import { requireFeature } from '@/lib/entitlements-server';
import {
  softDeleteAssetItem,
  updateAssetItem,
} from '@/lib/services/asset.service';

export const PATCH = authenticatedHandlerWithParams<{ id: string }>(
  'update asset item',
  async (request, { id }, { userId }) => {
    const body = await request.json();
    const { name, icon, order } = body ?? {};

    const featureError = await requireFeature(userId, 'ASSETS');
    if (featureError) return featureError;

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

export const DELETE = authenticatedHandlerWithParams<{ id: string }>(
  'delete asset item',
  async (request, { id }, { userId }) => {
    const featureError = await requireFeature(userId, 'ASSETS');
    if (featureError) return featureError;

    try {
      await softDeleteAssetItem(id, userId);
      return successResponse({ id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'failed to delete';
      const status = message === 'not found' ? 404 : 400;
      return errorResponse(message, status);
    }
  }
);
