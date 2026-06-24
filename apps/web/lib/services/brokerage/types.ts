/**
 * 증권사 공통 인터페이스. KIS/Toss가 같은 기능(잔고·보유종목)만 쓰므로 하나의
 * 읽기 전용 인터페이스로 추상화하고 증권사별로 구현한다.
 *
 * 금액/수량은 정밀도 손실을 막기 위해 decimal **문자열**로 다룬다. 증권사 API 응답도
 * 문자열이고, Prisma Decimal 컬럼에 문자열을 그대로 넣을 수 있어 float 드리프트가 없다.
 */

export type Broker = 'KIS' | 'TOSS';

export interface Money {
  amount: string; // decimal string
  currency: string; // 'KRW' | 'USD' ...
  amountKrw?: string; // KRW 환산액. currency === KRW면 amount와 동일
  fxRateToKrw?: string; // currency !== KRW일 때
}

export interface BrokerageAccountRef {
  broker: Broker;
  externalAccountId: string;
  displayName: string;
  accountType: 'domestic' | 'overseas' | 'isa' | 'unknown';
  baseCurrency: string;
}

export interface NormalizedPosition {
  symbol: string;
  name: string;
  market?: string; // KRX, NASDAQ ...
  currency: string;
  quantity: string;
  avgCost?: string; // 원통화
  lastPrice?: string; // 원통화
  marketValue: string; // 원통화 평가액
  marketValueKrw: string; // 환산 평가액
  unrealizedPnl?: string; // KRW 환산 평가손익(UI/집계 표시 기준)
  fxRateToKrw?: string; // currency !== KRW일 때
}

export interface NormalizedSnapshot {
  broker: Broker;
  externalAccountId: string;
  asOf: Date; // 증권사 평가 기준시각
  cashKrw: string;
  cashBalances?: Money[];
  totalEquityKrw: string;
  positionsValueKrw: string;
  positions: NormalizedPosition[];
}

export interface BrokerageClient {
  readonly broker: Broker;
  /** 자격증명 유효성 확인 (설정의 "연결 테스트"). 실패 시 throw. */
  validateCredentials(): Promise<void>;
  /** 이 연결이 가진 계좌 목록. */
  listAccounts(): Promise<BrokerageAccountRef[]>;
  /** 계좌의 현재 스냅샷(현금·평가액·보유종목). */
  getAccountSnapshot(account: BrokerageAccountRef): Promise<NormalizedSnapshot>;
}

/** 증권사 에러를 정규화. 자격증명/응답 본문은 메시지에 넣지 않는다(시크릿 누출 방지). */
export class BrokerageError extends Error {
  constructor(
    message: string,
    readonly kind: 'auth' | 'rate_limit' | 'network' | 'upstream' | 'parse',
    readonly broker: Broker
  ) {
    super(message);
    this.name = 'BrokerageError';
  }
}
