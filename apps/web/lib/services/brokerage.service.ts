import { prisma } from '@/lib/prisma';
import { BROKERAGE_CONNECTION_SELECT } from '@/lib/prisma-selects';
import { encryptCredentialObject } from './crypto.service';
import { createBrokerageClient } from './brokerage/factory';
import type { Broker } from './brokerage/types';

interface CreateConnectionInput {
  broker: Broker;
  label?: string | null;
  credentials: unknown; // 증권사별 자격증명 객체 (KIS: {appKey, appSecret, accountNo, paper?})
}

export class DuplicateBrokerageConnectionError extends Error {
  constructor(readonly broker: Broker) {
    super('brokerage connection already exists');
    this.name = 'DuplicateBrokerageConnectionError';
  }
}

export async function ensureBrokerageSlotAvailable(userId: string, broker: Broker): Promise<void> {
  const existing = await prisma.brokerageConnection.findFirst({
    where: { userId, broker, deletedAt: null },
    select: { id: true },
  });
  if (existing) {
    throw new DuplicateBrokerageConnectionError(broker);
  }
}

/** 사용자의 연결 목록 (자격증명 제외). */
export function listConnections(userId: string) {
  return prisma.brokerageConnection.findMany({
    where: { userId, deletedAt: null },
    select: BROKERAGE_CONNECTION_SELECT,
    orderBy: { createdAt: 'asc' },
  });
}

/** 자격증명을 검증한 뒤 암호화 저장. 평문은 저장하지 않는다. */
export async function createConnection(userId: string, input: CreateConnectionInput) {
  const { broker, label, credentials } = input;
  await ensureBrokerageSlotAvailable(userId, broker);

  const blob = encryptCredentialObject(credentials, { userId, broker });
  return prisma.brokerageConnection.create({
    data: {
      userId,
      broker,
      label: label ?? null,
      // Prisma Bytes는 Uint8Array<ArrayBuffer>를 기대 — Buffer를 복사 변환
      ciphertext: new Uint8Array(blob.ciphertext),
      iv: new Uint8Array(blob.iv),
      authTag: new Uint8Array(blob.authTag),
    },
    select: BROKERAGE_CONNECTION_SELECT,
  });
}

/** 소프트 삭제 + 자격증명 wipe(스냅샷은 과거 리포트를 위해 보존). 소유자만. */
export async function deleteConnection(userId: string, id: string) {
  const conn = await prisma.brokerageConnection.findFirst({
    where: { id, userId, deletedAt: null },
    select: { id: true },
  });
  if (!conn) return null;

  await prisma.brokerageConnection.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      status: 'DISABLED',
      // 자격증명 wipe — 평문 복구 불가
      ciphertext: new Uint8Array(0),
      iv: new Uint8Array(0),
      authTag: new Uint8Array(0),
      failureReason: null,
    },
  });
  return { id };
}

/** 저장 전 "연결 테스트": 자격증명으로 클라이언트를 만들어 토큰 발급을 시도. 실패 시 throw. */
export async function testCredentials(broker: Broker, credentials: unknown): Promise<void> {
  const client = createBrokerageClient(broker, credentials);
  await client.validateCredentials();
}
