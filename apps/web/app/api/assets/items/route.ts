import { NextRequest } from 'next/server';
import {
  apiHandler,
  errorResponse,
  successResponse,
  validateUserId,
} from '@/lib/api-utils';
import { createAssetItem, listAssetItems } from '@/lib/services/asset.service';

export const GET = apiHandler('list asset items', async (request: NextRequest) => {
  const userId = request.nextUrl.searchParams.get('userId');
  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const items = await listAssetItems(userId!);
  return successResponse(items);
});

export const POST = apiHandler('create asset item', async (request: NextRequest) => {
  const body = await request.json();
  const { userId, name, icon, order } = body ?? {};

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;
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
