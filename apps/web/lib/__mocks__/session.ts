export const SESSION_COOKIE_NAME = 'moneger_session';

let mockSessionUserId: string | null = 'user-1';

export function __setMockSessionUserId(userId: string | null) {
  mockSessionUserId = userId;
}

export const generateSessionToken = jest.fn(() => 'mock-token');
export const hashToken = jest.fn((token: string) => `hashed-${token}`);

export const createSession = jest.fn(async () => ({
  token: 'mock-token',
  expiresAt: new Date('2099-01-01T00:00:00.000Z'),
}));

export const verifySessionToken = jest.fn(async () =>
  mockSessionUserId ? { userId: mockSessionUserId } : null
);

export const getTokenFromRequest = jest.fn(() => 'mock-token');

export const deleteSessionByToken = jest.fn(async () => {});
export const deleteAllSessionsForUser = jest.fn(async () => {});
export const deleteOtherSessionsForUser = jest.fn(async () => {});

export const buildSessionCookie = jest.fn(() => ({
  name: SESSION_COOKIE_NAME,
  value: 'mock-token',
  httpOnly: true,
  secure: false,
  sameSite: 'lax' as const,
  path: '/',
}));

export const buildClearedSessionCookie = jest.fn(() => ({
  name: SESSION_COOKIE_NAME,
  value: '',
  httpOnly: true,
  secure: false,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 0,
}));
