import { logger } from '@/lib/logger';
import {
  type Broker,
  type BrokerageAccountRef,
  type BrokerageClient,
  type NormalizedSnapshot,
  BrokerageError,
} from './types';

interface CachedToken {
  token: string;
  /** epoch ms */
  expiresAt: number;
}

/**
 * 모듈 스코프 토큰 캐시. standalone server.js가 떠 있는 동안 요청 간 토큰을 재사용한다
 * (KIS access token ~24h, 과다발급 시 스로틀). 단일 컨테이너 가정 — 수평 확장 시 DB 영속화로
 * 업그레이드(설계 문서 참고). key = `${broker}:${appKey}` 등 구현체가 정한 캐시 키.
 */
const tokenCache = new Map<string, CachedToken>();

/** 만료 60초 전부터는 재발급 (네트워크 지연 마진). */
const EXPIRY_MARGIN_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 2;

export abstract class BaseBrokerageClient implements BrokerageClient {
  abstract readonly broker: Broker;

  /** 토큰 캐시 키. 시크릿은 넣지 않는다(appKey 등 식별자만). */
  protected abstract tokenCacheKey(): string;

  /** 증권사별 토큰 발급. 만료 시각(epoch ms) 포함. */
  protected abstract fetchToken(): Promise<CachedToken>;

  abstract listAccounts(): Promise<BrokerageAccountRef[]>;
  abstract getAccountSnapshot(account: BrokerageAccountRef): Promise<NormalizedSnapshot>;

  /**
   * 자격증명 유효성 = 유효한 토큰을 얻을 수 있는지. 실패 시 throw.
   * 캐시된 토큰이 있으면 재사용한다 — KIS는 토큰을 1분당 1회만 발급하므로,
   * "연결 테스트" 직후 "저장"이 토큰을 강제 재발급하면 throttle(403)에 걸린다.
   */
  async validateCredentials(): Promise<void> {
    await this.getToken();
  }

  /** 캐시된 토큰을 반환하거나 발급. forceRefresh=true면 무시하고 새로 발급. */
  protected async getToken(forceRefresh = false): Promise<string> {
    const key = this.tokenCacheKey();
    const cached = tokenCache.get(key);
    if (!forceRefresh && cached && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()) {
      return cached.token;
    }
    const fresh = await this.fetchToken();
    tokenCache.set(key, fresh);
    return fresh.token;
  }

  /**
   * JSON HTTP 호출 + 타임아웃 + 백오프 재시도(네트워크/5xx). 4xx는 즉시 실패.
   * 시크릿 누출 방지를 위해 응답 본문은 에러 메시지에 넣지 않는다.
   */
  protected async httpJson<T>(
    url: string,
    init: RequestInit,
    opts: { timeoutMs?: number; retries?: number } = {}
  ): Promise<T> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const retries = opts.retries ?? DEFAULT_RETRIES;

    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        clearTimeout(timer);

        if (res.status === 429) {
          throw new BrokerageError('rate limited', 'rate_limit', this.broker);
        }
        if (res.status >= 500) {
          // 5xx는 재시도 대상
          throw new BrokerageError(`upstream ${res.status}`, 'upstream', this.broker);
        }
        if (res.status === 401 || res.status === 403) {
          throw new BrokerageError('unauthorized', 'auth', this.broker);
        }
        if (!res.ok) {
          throw new BrokerageError(`http ${res.status}`, 'upstream', this.broker);
        }
        try {
          return (await res.json()) as T;
        } catch {
          throw new BrokerageError('invalid json response', 'parse', this.broker);
        }
      } catch (err) {
        clearTimeout(timer);
        lastErr = err;
        const retriable =
          err instanceof BrokerageError
            ? err.kind === 'upstream' || err.kind === 'rate_limit'
            : true; // 네트워크/abort 등
        if (err instanceof BrokerageError && err.kind === 'auth') {
          throw err; // 인증 실패는 재시도 무의미
        }
        if (attempt < retries && retriable) {
          await sleep(backoffMs(attempt));
          continue;
        }
        break;
      }
    }
    logger.error(`[brokerage:${this.broker}] http call failed`, lastErr as Error);
    if (lastErr instanceof BrokerageError) throw lastErr;
    throw new BrokerageError('request failed', 'network', this.broker);
  }
}

function backoffMs(attempt: number): number {
  return Math.min(2000, 250 * 2 ** attempt);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 테스트용 토큰 캐시 초기화. */
export function __clearTokenCache(): void {
  tokenCache.clear();
}
