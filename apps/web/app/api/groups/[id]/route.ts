import { successResponse, errorResponse } from '@/lib/api-utils';
import { authenticatedHandlerWithParams } from '@/lib/auth-handler';
import { requireFeature } from '@/lib/entitlements-server';
import { findGroup, findDuplicateGroup, updateGroup, deleteGroup, getGroupDetail } from '@/lib/services/group.service';

// GET /api/groups/[id] - 그룹 상세 조회
export const GET = authenticatedHandlerWithParams<{ id: string }>('fetch group detail', async (request, { id }, { userId }) => {
  const featureError = await requireFeature(userId, 'GROUPS');
  if (featureError) return featureError;

  const detail = await getGroupDetail(id, userId);
  if (!detail) {
    return errorResponse('Group not found', 404);
  }

  return successResponse(detail);
});

// PATCH /api/groups/[id] - 그룹 수정
export const PATCH = authenticatedHandlerWithParams<{ id: string }>('update group', async (request, { id }, { userId }) => {
  const body = await request.json();
  const { name, description, icon, color } = body;

  const featureError = await requireFeature(userId, 'GROUPS');
  if (featureError) return featureError;

  const existingGroup = await findGroup(id, userId);
  if (!existingGroup) {
    return errorResponse('Group not found', 404);
  }

  if (name) {
    const duplicate = await findDuplicateGroup(userId, name.trim(), id);
    if (duplicate) {
      return errorResponse('이미 존재하는 그룹 이름입니다', 409);
    }
  }

  const updatedGroup = await updateGroup(id, {
    ...(name && { name: name.trim() }),
    ...(description !== undefined && { description }),
    ...(icon !== undefined && { icon }),
    ...(color !== undefined && { color }),
  });

  return successResponse(updatedGroup);
});

// DELETE /api/groups/[id] - 그룹 삭제
export const DELETE = authenticatedHandlerWithParams<{ id: string }>('delete group', async (request, { id }, { userId }) => {
  const featureError = await requireFeature(userId, 'GROUPS');
  if (featureError) return featureError;

  const existingGroup = await findGroup(id, userId);
  if (!existingGroup) {
    return errorResponse('Group not found', 404);
  }

  await deleteGroup(id);

  return successResponse({ message: 'Group deleted successfully' });
});
