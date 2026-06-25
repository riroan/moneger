import { BaseBrokerageClient } from './BaseBrokerageClient';
import { logger } from '@/lib/logger';
import {
  type Broker,
  type BrokerageAccountRef,
  type NormalizedPosition,
  type NormalizedSnapshot,
  BrokerageError,
} from './types';

/**
 * 한국투자증권(KIS) OpenAPI 클라이언트 — 국내 + 미국 주식 잔고(읽기 전용).
 * 문서: https://apiportal.koreainvestment.com
 *  - 국내: 주식잔고조회 TTTC8434R (/uapi/domestic-stock/v1/trading/inquire-balance)
 *  - 해외: 해외주식 잔고 TTTS3012R (/uapi/overseas-stock/v1/trading/inquire-balance)
 *  - 환율: 해외주식 체결기준현재잔고 CTRP6504R (output2 frst_bltn_exrt)
 *
 * 해외 응답 필드명은 공식/커뮤니티 문서 기준. 실계좌 첫 동기화로 검증·보정 가능하도록
 * 매핑을 한곳에 모았고, 해외는 best-effort(실패해도 국내 스냅샷은 반환).
 */

export interface KISCredentials {
  appKey: string;
  appSecret: string;
  accountNo: string; // "CANO-PRDT" (예: "12345678-01")
  paper?: boolean;
}

const REAL_BASE = 'https://openapi.koreainvestment.com:9443';
const PAPER_BASE = 'https://openapivts.koreainvestment.com:29443';
const US_EXCHANGES = ['NASD', 'NYSE', 'AMEX'];

interface KISTokenResponse {
  access_token: string;
  expires_in: number;
}

interface DomesticBalanceResponse {
  rt_cd: string;
  output1?: Array<{
    pdno: string;
    prdt_name: string;
    hldg_qty: string;
    pchs_avg_pric: string;
    prpr: string;
    evlu_amt: string;
    evlu_pfls_amt: string;
  }>;
  output2?: Array<{
    dnca_tot_amt: string;
    scts_evlu_amt: string;
    tot_evlu_amt: string;
  }>;
}

interface OverseasBalanceResponse {
  rt_cd: string;
  output1?: Array<{
    ovrs_pdno: string;
    ovrs_item_name: string;
    ovrs_cblc_qty: string;
    pchs_avg_pric: string;
    now_pric2: string;
    ovrs_stck_evlu_amt: string;
    frcr_evlu_pfls_amt: string;
    ovrs_excg_cd?: string;
  }>;
}

interface PresentBalanceResponse {
  rt_cd: string;
  output2?: Array<Record<string, string | undefined> & { crcy_cd: string; frst_bltn_exrt: string }>;
}

export class KISClient extends BaseBrokerageClient {
  readonly broker: Broker = 'KIS';
  private readonly baseUrl: string;

  constructor(private readonly creds: KISCredentials) {
    super();
    this.baseUrl = process.env.KIS_API_BASE_URL ?? (creds.paper ? PAPER_BASE : REAL_BASE);
  }

  protected tokenCacheKey(): string {
    return `KIS:${this.baseUrl}:${this.creds.appKey}`;
  }

  protected async fetchToken() {
    const data = await this.httpJson<KISTokenResponse>(
      `${this.baseUrl}/oauth2/tokenP`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          appkey: this.creds.appKey,
          appsecret: this.creds.appSecret,
        }),
      },
      { retries: 1 }
    );
    if (!data.access_token) {
      throw new BrokerageError('token issuance failed', 'auth', this.broker);
    }
    return { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 86400) * 1000 };
  }

  private trId(real: string, paper: string): string {
    return this.creds.paper ? paper : real;
  }

  private headers(token: string, trId: string): Record<string, string> {
    return {
      'content-type': 'application/json; charset=utf-8',
      authorization: `Bearer ${token}`,
      appkey: this.creds.appKey,
      appsecret: this.creds.appSecret,
      tr_id: trId,
      custtype: 'P',
    };
  }

  async listAccounts(): Promise<BrokerageAccountRef[]> {
    return [
      {
        broker: this.broker,
        externalAccountId: this.creds.accountNo,
        displayName: this.creds.accountNo,
        accountType: 'unknown', // 국내+해외 통합
        baseCurrency: 'KRW',
      },
    ];
  }

  async getAccountSnapshot(account: BrokerageAccountRef): Promise<NormalizedSnapshot> {
    const [cano, prdt] = splitAccountNo(account.externalAccountId);

    // 1) 국내 (필수)
    const dom = await this.fetchDomestic(cano, prdt);

    // 2) 해외 (best-effort — 실패해도 국내는 반환)
    let overseas: NormalizedPosition[] = [];
    try {
      const usd = await this.fetchUsdBalance(cano, prdt);
      overseas = await this.fetchOverseasUS(cano, prdt, usd.fxRateToKrw);
      const overseasKrw = overseas.reduce((s, p) => s + Number(p.marketValueKrw), 0);
      const usdCashKrw = Math.round(usd.cashUsd * usd.fxRateToKrw);
      const domesticCashKrw = Number(dom.cashKrw);
      const domesticTotalKrw = Number(dom.totalEquityKrw);
      const domesticPositionsKrw = Number(dom.positionsValueKrw);
      const cashBalances = [
        {
          amount: dom.cashKrw,
          currency: 'KRW',
          amountKrw: dom.cashKrw,
        },
        ...(usd.cashUsd > 0
          ? [{
              amount: trimDecimal(usd.cashUsd),
              currency: 'USD',
              amountKrw: String(usdCashKrw),
              fxRateToKrw: String(usd.fxRateToKrw),
            }]
          : []),
      ];
      return {
        broker: this.broker,
        externalAccountId: account.externalAccountId,
        asOf: new Date(),
        cashKrw: String(Math.round(domesticCashKrw + usdCashKrw)),
        cashBalances,
        totalEquityKrw: String(Math.round(domesticTotalKrw + overseasKrw + usdCashKrw)),
        positionsValueKrw: String(Math.round(domesticPositionsKrw + overseasKrw)),
        positions: [...dom.positions, ...overseas],
      };
    } catch (err) {
      logger.warn('[brokerage:KIS] overseas fetch failed (domestic snapshot returned only)', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
    }

    return {
      broker: this.broker,
      externalAccountId: account.externalAccountId,
      asOf: new Date(),
      cashKrw: dom.cashKrw,
      cashBalances: [{ amount: dom.cashKrw, currency: 'KRW', amountKrw: dom.cashKrw }],
      totalEquityKrw: dom.totalEquityKrw,
      positionsValueKrw: dom.positionsValueKrw,
      positions: dom.positions,
    };
  }

  private async fetchDomestic(cano: string, prdt: string) {
    const query = new URLSearchParams({
      CANO: cano,
      ACNT_PRDT_CD: prdt,
      AFHR_FLPR_YN: 'N',
      OFL_YN: '',
      INQR_DVSN: '02',
      UNPR_DVSN: '01',
      FUND_STTL_ICLD_YN: 'N',
      FNCG_AMT_AUTO_RDPT_YN: 'N',
      PRCS_DVSN: '00',
      CTX_AREA_FK100: '',
      CTX_AREA_NK100: '',
    });
    const data = await this.authedJson<DomesticBalanceResponse>((token) => ({
      url: `${this.baseUrl}/uapi/domestic-stock/v1/trading/inquire-balance?${query}`,
      init: { method: 'GET', headers: this.headers(token, this.trId('TTTC8434R', 'VTTC8434R')) },
    }));
    if (data.rt_cd !== '0') {
      throw new BrokerageError('domestic balance inquiry rejected', 'upstream', this.broker);
    }
    const positions: NormalizedPosition[] = (data.output1 ?? [])
      .filter((h) => Number(h.hldg_qty) > 0)
      .map((h) => ({
        symbol: h.pdno,
        name: h.prdt_name,
        market: 'KRX',
        currency: 'KRW',
        quantity: h.hldg_qty,
        avgCost: h.pchs_avg_pric,
        lastPrice: h.prpr,
        marketValue: h.evlu_amt,
        marketValueKrw: h.evlu_amt,
        unrealizedPnl: h.evlu_pfls_amt,
      }));
    const s = data.output2?.[0];
    return {
      positions,
      cashKrw: s?.dnca_tot_amt ?? '0',
      totalEquityKrw: s?.tot_evlu_amt ?? '0',
      positionsValueKrw: s?.scts_evlu_amt ?? '0',
    };
  }

  /** USD 예수금 + USD→KRW 환율 (체결기준현재잔고 output2). */
  private async fetchUsdBalance(
    cano: string,
    prdt: string
  ): Promise<{ cashUsd: number; fxRateToKrw: number }> {
    const query = new URLSearchParams({
      CANO: cano,
      ACNT_PRDT_CD: prdt,
      WCRC_FRCR_DVSN_CD: '02', // 외화
      NATN_CD: '840', // 미국
      TR_MKET_CD: '00',
      INQR_DVSN_CD: '00',
    });
    const data = await this.authedJson<PresentBalanceResponse>((token) => ({
      url: `${this.baseUrl}/uapi/overseas-stock/v1/trading/inquire-present-balance?${query}`,
      init: { method: 'GET', headers: this.headers(token, this.trId('CTRP6504R', 'VTRP6504R')) },
    }));
    if (data.rt_cd !== '0') {
      throw new BrokerageError('present balance inquiry rejected', 'upstream', this.broker);
    }
    const usd = data.output2?.find((o) => o.crcy_cd === 'USD');
    const rate = Number(usd?.frst_bltn_exrt);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new BrokerageError('USD exchange rate unavailable', 'parse', this.broker);
    }
    return { cashUsd: pickUsdCash(usd), fxRateToKrw: rate };
  }

  /** 미국 거래소(NASD/NYSE/AMEX) 잔고를 합쳐 KRW 환산 포지션으로. */
  private async fetchOverseasUS(
    cano: string,
    prdt: string,
    fx: number
  ): Promise<NormalizedPosition[]> {
    const bySymbol = new Map<string, NormalizedPosition>();
    for (const excg of US_EXCHANGES) {
      const query = new URLSearchParams({
        CANO: cano,
        ACNT_PRDT_CD: prdt,
        OVRS_EXCG_CD: excg,
        TR_CRCY_CD: 'USD',
        CTX_AREA_FK200: '',
        CTX_AREA_NK200: '',
      });
      const data = await this.authedJson<OverseasBalanceResponse>((token) => ({
        url: `${this.baseUrl}/uapi/overseas-stock/v1/trading/inquire-balance?${query}`,
        init: { method: 'GET', headers: this.headers(token, this.trId('TTTS3012R', 'VTTS3012R')) },
      }));
      if (data.rt_cd !== '0') continue;
      for (const h of data.output1 ?? []) {
        if (Number(h.ovrs_cblc_qty) <= 0) continue;
        const evalUsd = Number(h.ovrs_stck_evlu_amt);
        const pnlUsd = Number(h.frcr_evlu_pfls_amt);
        if (!Number.isFinite(evalUsd) || !Number.isFinite(pnlUsd)) {
          throw new BrokerageError('overseas holdings response invalid', 'parse', this.broker);
        }
        bySymbol.set(h.ovrs_pdno, {
          symbol: h.ovrs_pdno,
          name: h.ovrs_item_name,
          market: h.ovrs_excg_cd ?? excg,
          currency: 'USD',
          quantity: h.ovrs_cblc_qty,
          avgCost: h.pchs_avg_pric,
          lastPrice: h.now_pric2,
          marketValue: h.ovrs_stck_evlu_amt,
          marketValueKrw: String(Math.round(evalUsd * fx)),
          unrealizedPnl: String(Math.round(pnlUsd * fx)),
          fxRateToKrw: String(fx),
        });
      }
    }
    return [...bySymbol.values()];
  }
}

function splitAccountNo(accountNo: string): [string, string] {
  if (accountNo.includes('-')) {
    const [cano, prdt] = accountNo.split('-');
    return [cano, prdt || '01'];
  }
  if (accountNo.length >= 10) return [accountNo.slice(0, 8), accountNo.slice(8, 10)];
  return [accountNo, '01'];
}

function pickUsdCash(row: (Record<string, string | undefined> & { crcy_cd: string }) | undefined): number {
  if (!row) return 0;
  const candidates = [
    'frcr_dncl_amt',
    'frcr_dncl_amt_2',
    'frcr_dnca',
    'frcr_cash',
    'frcr_buy_psbl_amt',
    'frcr_drwg_psbl_amt',
  ];
  for (const key of candidates) {
    const value = Number(row[key] ?? 0);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function trimDecimal(value: number): string {
  return value.toFixed(8).replace(/\.?0+$/, '');
}
