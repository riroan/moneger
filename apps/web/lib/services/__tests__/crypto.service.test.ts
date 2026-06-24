import { randomBytes } from 'crypto';
import {
  encryptCredentials,
  decryptCredentials,
  encryptCredentialObject,
  decryptCredentialObject,
  type CredentialContext,
} from '../crypto.service';

const ctx: CredentialContext = { userId: 'user-1', broker: 'KIS' };

describe('crypto.service', () => {
  const originalKey = process.env.BROKERAGE_ENC_KEY;

  beforeAll(() => {
    process.env.BROKERAGE_ENC_KEY = randomBytes(32).toString('base64');
  });

  afterAll(() => {
    process.env.BROKERAGE_ENC_KEY = originalKey;
  });

  it('암복호화 왕복: 평문이 그대로 복원된다', () => {
    const plaintext = 'appkey=abc&appsecret=def';
    const blob = encryptCredentials(plaintext, ctx);
    expect(blob.ciphertext.toString('utf8')).not.toContain('appkey'); // 평문 노출 안 됨
    expect(decryptCredentials(blob, ctx)).toBe(plaintext);
  });

  it('객체 왕복: JSON 자격증명이 복원된다', () => {
    const creds = { appKey: 'K', appSecret: 'S', accountNo: '12345678-01' };
    const blob = encryptCredentialObject(creds, ctx);
    expect(decryptCredentialObject<typeof creds>(blob, ctx)).toEqual(creds);
  });

  it('매 호출마다 IV가 달라 같은 평문도 다른 ciphertext가 된다', () => {
    const a = encryptCredentials('same', ctx);
    const b = encryptCredentials('same', ctx);
    expect(a.iv.equals(b.iv)).toBe(false);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
  });

  it('authTag 변조 시 복호화가 throw', () => {
    const blob = encryptCredentials('secret', ctx);
    const tampered = { ...blob, authTag: Buffer.from(blob.authTag) };
    tampered.authTag[0] ^= 0xff;
    expect(() => decryptCredentials(tampered, ctx)).toThrow();
  });

  it('ciphertext 변조 시 복호화가 throw', () => {
    const blob = encryptCredentials('secret', ctx);
    const tampered = { ...blob, ciphertext: Buffer.from(blob.ciphertext) };
    tampered.ciphertext[0] ^= 0xff;
    expect(() => decryptCredentials(tampered, ctx)).toThrow();
  });

  it('교차 사용자 스왑 방지: 다른 userId로는 복호화 불가', () => {
    const blob = encryptCredentials('secret', { userId: 'user-1', broker: 'KIS' });
    expect(() => decryptCredentials(blob, { userId: 'user-2', broker: 'KIS' })).toThrow();
  });

  it('교차 증권사 스왑 방지: 다른 broker로는 복호화 불가', () => {
    const blob = encryptCredentials('secret', { userId: 'user-1', broker: 'KIS' });
    expect(() => decryptCredentials(blob, { userId: 'user-1', broker: 'TOSS' })).toThrow();
  });

  it('키 미설정 시 throw', () => {
    const saved = process.env.BROKERAGE_ENC_KEY;
    delete process.env.BROKERAGE_ENC_KEY;
    expect(() => encryptCredentials('x', ctx)).toThrow(/not set/);
    process.env.BROKERAGE_ENC_KEY = saved;
  });

  it('키 길이가 32바이트가 아니면 throw', () => {
    const saved = process.env.BROKERAGE_ENC_KEY;
    process.env.BROKERAGE_ENC_KEY = randomBytes(16).toString('base64');
    expect(() => encryptCredentials('x', ctx)).toThrow(/32 bytes/);
    process.env.BROKERAGE_ENC_KEY = saved;
  });
});
