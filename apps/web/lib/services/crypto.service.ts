import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * 증권사 자격증명 암호화 서비스 (AES-256-GCM).
 *
 * - 마스터 키는 env `BROKERAGE_ENC_KEY`(base64 32바이트) 하나만. 코드/DB에 평문 키 없음.
 * - 평문 자격증명은 절대 저장하지 않는다. 복호화는 서버 호출 시점에만.
 * - AAD(추가 인증 데이터)를 소유자(userId+broker)에 바인딩해, 한 사용자의 ciphertext를
 *   다른 사용자(또는 다른 증권사)로 복호화하는 스왑 공격을 막는다. connection 단위
 *   바인딩은 불필요 — 모든 복호화가 이미 (userId, connectionId)로 스코프된 DB 조회를 거친다.
 * - 키 회전 대비: BrokerageConnection.keyVersion 컬럼이 있으나, 회전 자동화는 TODOS.md.
 */

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM 권장 nonce 길이
const KEY_LENGTH = 32; // AES-256

export interface EncryptedBlob {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

export interface CredentialContext {
  userId: string;
  broker: string;
}

function getMasterKey(): Buffer {
  const raw = process.env.BROKERAGE_ENC_KEY;
  if (!raw) {
    throw new Error('BROKERAGE_ENC_KEY is not set');
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `BROKERAGE_ENC_KEY must decode to ${KEY_LENGTH} bytes (got ${key.length}); generate with: openssl rand -base64 32`
    );
  }
  return key;
}

function aadFor(ctx: CredentialContext): Buffer {
  return Buffer.from(`${ctx.userId}:${ctx.broker}`, 'utf8');
}

/** 평문 문자열을 암호화. */
export function encryptCredentials(plaintext: string, ctx: CredentialContext): EncryptedBlob {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  cipher.setAAD(aadFor(ctx));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, iv, authTag };
}

/** 복호화. authTag/AAD 불일치(변조·소유자 불일치) 시 throw. */
export function decryptCredentials(blob: EncryptedBlob, ctx: CredentialContext): string {
  const key = getMasterKey();
  const decipher = createDecipheriv(ALGO, key, blob.iv);
  decipher.setAAD(aadFor(ctx));
  decipher.setAuthTag(blob.authTag);
  return Buffer.concat([decipher.update(blob.ciphertext), decipher.final()]).toString('utf8');
}

/** 자격증명 객체(JSON 직렬화)를 암호화. */
export function encryptCredentialObject(obj: unknown, ctx: CredentialContext): EncryptedBlob {
  return encryptCredentials(JSON.stringify(obj), ctx);
}

/** 복호화 후 JSON 파싱. */
export function decryptCredentialObject<T>(blob: EncryptedBlob, ctx: CredentialContext): T {
  return JSON.parse(decryptCredentials(blob, ctx)) as T;
}
