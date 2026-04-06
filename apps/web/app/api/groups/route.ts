import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validateUserId, apiHandler } from '@/lib/api-utils';
import { getGroupsWithSummary, createGroup, findDuplicateGroup } from '@/lib/services/group.service';

// GET /api/groups - 그룹 목록 조회
export const GET = apiHandler('fetch groups', async (request: NextRequest) => {
  const userId = request.nextUrl.searchParams.get('userId');

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

  const groups = await getGroupsWithSummary(userId!);
  return successResponse(groups);
});

// POST /api/groups - 그룹 생성
export const POST = apiHandler('create group', async (request: NextRequest) => {
  const body = await request.json();
  const { userId, name, description, icon, color } = body;

  const userIdError = validateUserId(userId);
  if (userIdError) return userIdError;

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
