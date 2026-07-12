import { randomBytes, createHash } from 'crypto';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const SESSION_COOKIE_NAME = 'moneger_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

export interface CreatedSession {
  token: string; // 원본 토큰 — 클라이언트에 1회만 전달, DB에는 저장하지 않음
  expiresAt: Date;
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(
  userId: string,
  meta?: { userAgent?: string | null; ipAddress?: string | null }
): Promise<CreatedSession> {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: meta?.userAgent ?? null,
      ipAddress: meta?.ipAddress ?? null,
    },
  });

  return { token, expiresAt };
}

export async function verifySessionToken(
  token: string | null | undefined
): Promise<{ userId: string } | null> {
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({ where: { tokenHash } });
  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return { userId: session.userId };
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7).trim();

  return null;
}

export async function deleteSessionByToken(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function deleteAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

// 비밀번호 변경 시: 지금 쓰고 있는 세션(currentToken)은 남기고 나머지 전부 무효화
export async function deleteOtherSessionsForUser(userId: string, currentToken: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId, NOT: { tokenHash: hashToken(currentToken) } },
  });
}

interface SessionCookieOptions {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  expires?: Date;
  maxAge?: number;
}

export function buildSessionCookie(token: string, expiresAt: Date): SessionCookieOptions {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  };
}

export function buildClearedSessionCookie(): SessionCookieOptions {
  return {
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  };
}

// 테스트 전용 훅. jest.mock('@/lib/session')이 apps/web/lib/__mocks__/session.ts로
// 치환하므로 실제 런타임에서는 호출되지 않는다 — tsc가 테스트 파일의 import를
// 검증할 수 있도록 실제 모듈에도 동일한 시그니처를 둔다.
export function __setMockSessionUserId(_userId: string | null): void {}
