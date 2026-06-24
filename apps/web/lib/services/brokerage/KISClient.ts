import { BaseBrokerageClient } from './BaseBrokerageClient';
import {
  type Broker,
  type BrokerageAccountRef,
  type NormalizedPosition,
  type NormalizedSnapshot,
  BrokerageError,
} from './types';

/**
 * 한국투자증권(KIS) OpenAPI 클라이언트 — 국내 주식 잔고(읽기 전용).
 * 문서: https://apiportal.koreainvestment.com (주식잔고조회 TTTC8434R)
 *
 * PR1a 범위는 국내(domestic)만. 해외/FX는 PR2(T9).
 */

export interface KISCredentials {
  appKey: string;
  appSecret: string;
  /** "CANO-PRDT" 형식 (예: "12345678-01"). */
  accountNo: string;
  /** 모의투자 계좌면 true. 기본 실전. */
  paper?: boolean;
}

const REAL_BASE = 'https://openapi.koreainvestment.com:9443';
const PAPER_BASE = 'https://openapivts.koreainvestment.com:29443';

interface KISTokenResponse {
  access_token: string;
  expires_in: number; // seconds (~86400)
  token_type: string;
}

interface KISBalanceResponse {
  rt_cd: string; // '0' = success
  msg1?: string;
  output1?: KISHolding[];
  output2?: KISSummary[];
}

interface KISHolding {
  pdno: string; // 종목코드
  prdt_name: string; // 종목명
  hldg_qty: string; // 보유수량
  pchs_avg_pric: string; // 매입평균가격
  prpr: string; // 현재가
  evlu_amt: string; // 평가금액
  evlu_pfls_amt: string; // 평가손익금액
}

interface KISSummary {
  dnca_tot_amt: string; // 예수금총금액
  scts_evlu_amt: string; // 유가증권평가금액
  tot_evlu_amt: string; // 총평가금액
  nass_amt: string; // 순자산금액
}

export class KISClient extends BaseBrokerageClient {
  readonly broker: Broker = 'KIS';
  private readonly baseUrl: string;

  constructor(private readonly creds: KISCredentials) {
    super();
    this.baseUrl =
      process.env.KIS_API_BASE_URL ?? (creds.paper ? PAPER_BASE : REAL_BASE);
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
    return {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 86400) * 1000,
    };
  }

  async listAccounts(): Promise<BrokerageAccountRef[]> {
    // KIS는 계좌 목록 API가 없다 — 자격증명의 계좌번호가 곧 단일 계좌.
    return [
      {
        broker: this.broker,
        externalAccountId: this.creds.accountNo,
        displayName: this.creds.accountNo,
        accountType: 'domestic',
        baseCurrency: 'KRW',
      },
    ];
  }

  async getAccountSnapshot(account: BrokerageAccountRef): Promise<NormalizedSnapshot> {
    const [cano, prdt] = splitAccountNo(account.externalAccountId);
    const token = await this.getToken();

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

    const data = await this.httpJson<KISBalanceResponse>(
      `${this.baseUrl}/uapi/domestic-stock/v1/trading/inquire-balance?${query}`,
      {
        method: 'GET',
        headers: {
          'content-type': 'application/json; charset=utf-8',
          authorization: `Bearer ${token}`,
          appkey: this.creds.appKey,
          appsecret: this.creds.appSecret,
          tr_id: this.creds.paper ? 'VTTC8434R' : 'TTTC8434R',
          custtype: 'P',
        },
      }
    );

    if (data.rt_cd !== '0') {
      throw new BrokerageError('balance inquiry rejected', 'upstream', this.broker);
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
        marketValueKrw: h.evlu_amt, // 국내는 원통화 = KRW
        unrealizedPnl: h.evlu_pfls_amt,
      }));

    const summary = data.output2?.[0];
    return {
      broker: this.broker,
      externalAccountId: account.externalAccountId,
      asOf: new Date(), // KIS 잔고조회는 기준시각을 주지 않아 조회 시점 사용
      cashKrw: summary?.dnca_tot_amt ?? '0',
      totalEquityKrw: summary?.tot_evlu_amt ?? '0',
      positionsValueKrw: summary?.scts_evlu_amt ?? '0',
      positions,
    };
  }
}

/** "12345678-01" → ["12345678", "01"]. 구분자 없으면 앞 8 / 뒤 2로 분리. */
function splitAccountNo(accountNo: string): [string, string] {
  if (accountNo.includes('-')) {
    const [cano, prdt] = accountNo.split('-');
    return [cano, prdt || '01'];
  }
  if (accountNo.length >= 10) {
    return [accountNo.slice(0, 8), accountNo.slice(8, 10)];
  }
  return [accountNo, '01'];
}
