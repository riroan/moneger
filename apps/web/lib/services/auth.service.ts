import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * 이메일로 사용자 조회 (soft delete 제외)
 */
export async function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email, deletedAt: null },
  });
}

/**
 * ID로 사용자 조회 (soft delete 제외)
 */
export async function findUserById(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
}

/**
 * 비밀번호 검증
 */
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * 비밀번호 해싱
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * 사용자 객체에서 비밀번호 제외
 */
export function excludePassword<T extends { password: string }>(user: T): Omit<T, 'password'> {
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
