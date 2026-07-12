import {
  errorResponse,
  successResponse,
} from '@/lib/api-utils';
import { authenticatedHandler } from '@/lib/auth-handler';
import { requireFeature } from '@/lib/entitlements-server';
import { createAssetItem, listAssetItems } from '@/lib/services/asset.service';

export const GET = authenticatedHandler('list asset items', async (request, { userId }) => {
  const featureError = await requireFeature(userId, 'ASSETS');
  if (featureError) return featureError;

  const items = await listAssetItems(userId);
  return successResponse(items);
});

export const POST = authenticatedHandler('create asset item', async (request, { userId }) => {
  const body = await request.json();
  const { name, icon, order } = body ?? {};

  const featureError = await requireFeature(userId, 'ASSETS');
  if (featureError) return featureError;
  if (typeof name !== 'string' || !name.trim()) {
    return errorResponse('name is required', 400);
  }

  try {
    const item = await createAssetItem(userId, {
      name,
      icon: typeof icon === 'string' ? icon : null,
      order: typeof order === 'number' ? order : undefined,
    });
    return successResponse(item, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to create';
    return errorResponse(message, 400);
  }
});
