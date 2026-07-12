import { successResponse, errorResponse } from '@/lib/api-utils';
import { authenticatedHandler } from '@/lib/auth-handler';
import { requireFeature } from '@/lib/entitlements-server';
import { getGroupsWithSummary, createGroup, findDuplicateGroup } from '@/lib/services/group.service';

// GET /api/groups - 그룹 목록 조회
export const GET = authenticatedHandler('fetch groups', async (request, { userId }) => {
  const featureError = await requireFeature(userId, 'GROUPS');
  if (featureError) return featureError;

  const groups = await getGroupsWithSummary(userId);
  return successResponse(groups);
});

// POST /api/groups - 그룹 생성
export const POST = authenticatedHandler('create group', async (request, { userId }) => {
  const body = await request.json();
  const { name, description, icon, color } = body;

  const featureError = await requireFeature(userId, 'GROUPS');
  if (featureError) return featureError;

  if (!name || !name.trim()) {
    return errorResponse('그룹 이름을 입력해주세요', 400);
  }

  const duplicate = await findDuplicateGroup(userId, name.trim());
  if (duplicate) {
    return errorResponse('이미 존재하는 그룹 이름입니다', 409);
  }

  const group = await createGroup(userId, { name: name.trim(), description, icon, color });
  return successResponse(group, 201);
});
