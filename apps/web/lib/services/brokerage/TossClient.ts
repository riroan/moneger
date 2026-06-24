import { BaseBrokerageClient } from './BaseBrokerageClient';
import {
  type Broker,
  type BrokerageAccountRef,
  type NormalizedPosition,
  type NormalizedSnapshot,
  BrokerageError,
} from './types';

/**
 * 토스증권 Open API 클라이언트 — 계좌 목록 + 보유 주식(읽기 전용).
 * 공식 스펙: https://developers.tossinvest.com/docs
 *  - 토큰: POST /oauth2/token (client_credentials)
 *  - 계좌: GET /api/v1/accounts
 *  - 보유: GET /api/v1/holdings (X-Tossinvest-Account 필요)
 *  - 환율: GET /api/v1/exchange-rate?baseCurrency=USD&quoteCurrency=KRW
 */

export interface TossCredentials {
  clientId: string;
  clientSecret: string;
  /** 선택. 지정하면 해당 accountSeq만 동기화한다. */
  accountSeq?: string | number;
}

const TOSS_BASE = 'https://openapi.tossinvest.com';

interface TossTokenResponse {
  access_token: string;
  expires_in: number;
}

interface TossApiResponse<T> {
  result?: T;
}

interface TossAccount {
  accountNo: string;
  accountSeq: number;
  accountType: string;
}

interface TossPrice {
  krw: string;
  usd?: string | null;
}

interface TossHoldingsOverview {
  marketValue: { amount: TossPrice; amountAfterCost: TossPrice };
  profitLoss: {
    amount: TossPrice;
    amountAfterCost: TossPrice;
    rate: string;
    rateAfterCost: string;
  };
  items: Array<{
    symbol: string;
    name: string;
    marketCountry: string;
    currency: string;
    quantity: string;
    lastPrice: string;
    averagePurchasePrice: string;
    marketValue: { purchaseAmount: string; amount: string; amountAfterCost: string };
    profitLoss: { amount: string; amountAfterCost: string; rate: string; rateAfterCost: string };
  }>;
}

interface TossExchangeRateResponse {
  rate: string;
}

export class TossClient extends BaseBrokerageClient {
  readonly broker: Broker = 'TOSS';
  private readonly baseUrl: string;

  constructor(private readonly creds: TossCredentials) {
    super();
    this.baseUrl = process.env.TOSS_API_BASE_URL ?? TOSS_BASE;
  }

  protected tokenCacheKey(): string {
    return `TOSS:${this.baseUrl}:${this.creds.clientId}`;
  }

  protected async fetchToken() {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.creds.clientId,
      client_secret: this.creds.clientSecret,
    });

    const data = await this.httpJson<TossTokenResponse>(
      `${this.baseUrl}/oauth2/token`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      },
      { retries: 1 }
    );
    if (!data.access_token) {
      throw new BrokerageError('token issuance failed', 'auth', this.broker);
    }
    return { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 86400) * 1000 };
  }

  private headers(token: string, accountSeq?: string): Record<string, string> {
    return {
      authorization: `Bearer ${token}`,
      ...(accountSeq ? { 'X-Tossinvest-Account': accountSeq } : {}),
    };
  }

  async listAccounts(): Promise<BrokerageAccountRef[]> {
    const token = await this.getToken();
    const data = await this.httpJson<TossApiResponse<TossAccount[]>>(
      `${this.baseUrl}/api/v1/accounts`,
      { method: 'GET', headers: this.headers(token) }
    );
    if (!Array.isArray(data.result)) {
      throw new BrokerageError('accounts response invalid', 'parse', this.broker);
    }

    const requested = this.creds.accountSeq == null ? null : String(this.creds.accountSeq);
    const accounts = requested
      ? data.result.filter((a) => String(a.accountSeq) === requested)
      : data.result.slice(0, 1);
    if (requested && accounts.length === 0) {
      throw new BrokerageError('account not found', 'auth', this.broker);
    }

    return accounts.map((a) => ({
      broker: this.broker,
      externalAccountId: String(a.accountSeq),
      displayName: a.accountNo,
      accountType: 'unknown',
      baseCurrency: 'KRW',
    }));
  }

  async getAccountSnapshot(account: BrokerageAccountRef): Promise<NormalizedSnapshot> {
    const token = await this.getToken();
    const data = await this.httpJson<TossApiResponse<TossHoldingsOverview>>(
      `${this.baseUrl}/api/v1/holdings`,
      { method: 'GET', headers: this.headers(token, account.externalAccountId) }
    );
    if (!data.result) {
      throw new BrokerageError('holdings response invalid', 'parse', this.broker);
    }

    const holdings = data.result;
    const hasUsd =
      moneyPart(holdings.marketValue.amount.usd) > 0 ||
      holdings.items.some((item) => item.currency === 'USD');
    const usdKrw = hasUsd ? await this.fetchUsdKrwRate(token) : 1;
    const positions = holdings.items
      .filter((item) => Number(item.quantity) > 0)
      .map((item): NormalizedPosition => {
        const isUsd = item.currency === 'USD';
        const marketValueKrw = isUsd
          ? toKrwString(item.marketValue.amount, usdKrw)
          : toKrwString(item.marketValue.amount, 1);
        const pnlKrw = isUsd
          ? toKrwString(item.profitLoss.amount, usdKrw)
          : toKrwString(item.profitLoss.amount, 1);
        return {
          symbol: item.symbol,
          name: item.name,
          market: item.marketCountry === 'KR' ? 'KRX' : item.marketCountry,
          currency: item.currency,
          quantity: item.quantity,
          avgCost: item.averagePurchasePrice,
          lastPrice: item.lastPrice,
          marketValue: item.marketValue.amount,
          marketValueKrw,
          unrealizedPnl: pnlKrw,
          ...(isUsd ? { fxRateToKrw: String(usdKrw) } : {}),
        };
      });

    const positionsValueKrw = sumKrw(holdings.marketValue.amount, usdKrw);
    return {
      broker: this.broker,
      externalAccountId: account.externalAccountId,
      asOf: new Date(),
      cashKrw: '0',
      totalEquityKrw: positionsValueKrw,
      positionsValueKrw,
      positions,
    };
  }

  private async fetchUsdKrwRate(token: string): Promise<number> {
    const query = new URLSearchParams({ baseCurrency: 'USD', quoteCurrency: 'KRW' });
    const data = await this.httpJson<TossApiResponse<TossExchangeRateResponse>>(
      `${this.baseUrl}/api/v1/exchange-rate?${query}`,
      { method: 'GET', headers: this.headers(token) }
    );
    const rate = Number(data.result?.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new BrokerageError('USD exchange rate unavailable', 'parse', this.broker);
    }
    return rate;
  }
}

function moneyPart(value: string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function toKrwString(amount: string | null | undefined, fx: number): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n) || !Number.isFinite(fx)) return '0';
  return String(Math.round(n * fx));
}

function sumKrw(price: TossPrice, usdKrw: number): string {
  const krw = moneyPart(price.krw);
  const usd = moneyPart(price.usd);
  return String(Math.round(krw + usd * usdKrw));
}
