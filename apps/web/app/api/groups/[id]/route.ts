import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validateUserId, apiHandlerWithParams } from '@/lib/api-utils';
import { findGroup, findDuplicateGroup, updateGroup, deleteGroup, getGroupDetail } from '@/lib/services/group.service';

// GET /api/groups/[id] - 그룹 상세 조회
export const GET = apiHandlerWithParams<{ id: string }>('fetch group detail', async (request: NextRequest, { id }) => {
  const userId = request.nextUrl.searchParams.get('userId');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const detail = await getGroupDetail(id, userId!);
  if (!detail) {
    return errorResponse('Group not found', 404);
  }

  return successResponse(detail);
});

// PATCH /api/groups/[id] - 그룹 수정
export const PATCH = apiHandlerWithParams<{ id: string }>('update group', async (request: NextRequest, { id }) => {
  const body = await request.json();
  const { userId, name, description, icon, color } = body;

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

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
export const DELETE = apiHandlerWithParams<{ id: string }>('delete group', async (request: NextRequest, { id }) => {
  const userId = request.nextUrl.searchParams.get('userId');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const existingGroup = await findGroup(id, userId!);
  if (!existingGroup) {
    return errorResponse('Group not found', 404);
  }

  await deleteGroup(id);

  return successResponse({ message: 'Group deleted successfully' });
});
