import { NextRequest } from 'next/server';
import { GET } from '../route';
import { prisma } from '@/lib/prisma';
import { __setMockSessionUserId } from '@/lib/session';

jest.mock('@/lib/session');

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const mockFindUnique = prisma.user.findUnique as jest.Mock;

function makeRequest() {
  const url = new URL('http://localhost:3000/api/user/entitlements');
  return new NextRequest(url);
}

describe('GET /api/user/entitlements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __setMockSessionUserId('user-1');
  });

  it('FREE 유저는 features가 비어있다', async () => {
    mockFindUnique.mockResolvedValue({ plan: 'FREE', planExpiresAt: null });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.plan).toBe('FREE');
    expect(data.data.features).toEqual([]);
  });

  it('PRO 유저는 AI_SUMMARY를 가지지 않는다', async () => {
    mockFindUnique.mockResolvedValue({ plan: 'PRO', planExpiresAt: null });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.plan).toBe('PRO');
    expect(data.data.features).not.toContain('AI_SUMMARY');
  });

  it('만료된 PRO 유저는 FREE로 취급된다', async () => {
    mockFindUnique.mockResolvedValue({
      plan: 'PRO',
      planExpiresAt: new Date(Date.now() - 1000),
    });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.plan).toBe('FREE');
    expect(data.data.features).toEqual([]);
  });

  it('ULTIMATE 유저는 모든 기능을 가지며 만료되지 않는다', async () => {
    mockFindUnique.mockResolvedValue({
      plan: 'ULTIMATE',
      planExpiresAt: new Date(Date.now() - 1000),
    });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.plan).toBe('ULTIMATE');
    expect(data.data.features).toContain('AI_SUMMARY');
  });

  it('존재하지 않는 유저는 404', async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await GET(makeRequest());

    expect(response.status).toBe(404);
  });

  it('세션이 없으면 401', async () => {
    __setMockSessionUserId(null);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
