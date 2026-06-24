import { KISClient } from '../KISClient';
import { __clearTokenCache } from '../BaseBrokerageClient';
import { BrokerageError } from '../types';

const creds = { appKey: 'AK', appSecret: 'AS', accountNo: '12345678-01' };
let fetchMock: jest.Mock;

function jsonRes(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const tokenBody = { access_token: 'tok-123', expires_in: 86400, token_type: 'Bearer' };

const balanceBody = {
  rt_cd: '0',
  msg1: '정상처리',
  output1: [
    {
      pdno: '005930',
      prdt_name: '삼성전자',
      hldg_qty: '10',
      pchs_avg_pric: '70000',
      prpr: '80000',
      evlu_amt: '800000',
      evlu_pfls_amt: '100000',
    },
    {
      pdno: '000660',
      prdt_name: 'SK하이닉스',
      hldg_qty: '0', // 보유 0 → 필터링
      pchs_avg_pric: '0',
      prpr: '0',
      evlu_amt: '0',
      evlu_pfls_amt: '0',
    },
  ],
  output2: [
    {
      dnca_tot_amt: '500000',
      scts_evlu_amt: '800000',
      tot_evlu_amt: '1300000',
      nass_amt: '1300000',
    },
  ],
};

const fxBody = {
  rt_cd: '0',
  output2: [{ crcy_cd: 'USD', frst_bltn_exrt: '1300' }],
};

const emptyOverseasBody = { rt_cd: '0', output1: [] };

function mockSnapshotResponses() {
  fetchMock
    .mockResolvedValueOnce(jsonRes(balanceBody))
    .mockResolvedValueOnce(jsonRes(fxBody))
    .mockResolvedValueOnce(jsonRes(emptyOverseasBody))
    .mockResolvedValueOnce(jsonRes(emptyOverseasBody))
    .mockResolvedValueOnce(jsonRes(emptyOverseasBody));
}

describe('KISClient', () => {
  beforeEach(() => {
    __clearTokenCache();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('validateCredentials: 토큰 발급 성공 시 통과', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes(tokenBody));
    const client = new KISClient(creds);
    await expect(client.validateCredentials()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/oauth2/tokenP');
  });

  it('토큰 캐시: 두 번째 호출은 토큰을 재발급하지 않는다', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes(tokenBody)); // token
    mockSnapshotResponses();
    mockSnapshotResponses();
    const client = new KISClient(creds);
    const [acct] = await client.listAccounts();
    await client.getAccountSnapshot(acct);
    await client.getAccountSnapshot(acct);
    // token 1회 + (domestic + fx + overseas 3개 거래소) * 2
    expect(fetchMock).toHaveBeenCalledTimes(11);
    const tokenCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/oauth2/tokenP'));
    expect(tokenCalls).toHaveLength(1);
  });

  it('getAccountSnapshot: 보유종목/요약을 정규화하고 0수량을 거른다', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes(tokenBody));
    mockSnapshotResponses();
    const client = new KISClient(creds);
    const [acct] = await client.listAccounts();
    const snap = await client.getAccountSnapshot(acct);

    expect(snap.cashKrw).toBe('500000');
    expect(snap.totalEquityKrw).toBe('1300000');
    expect(snap.positionsValueKrw).toBe('800000');
    expect(snap.positions).toHaveLength(1); // 0수량 제외
    expect(snap.positions[0]).toMatchObject({
      symbol: '005930',
      name: '삼성전자',
      currency: 'KRW',
      quantity: '10',
      marketValue: '800000',
      marketValueKrw: '800000',
      unrealizedPnl: '100000',
    });
  });

  it('balance 호출에 올바른 헤더(tr_id, appkey)와 계좌 분리가 적용된다', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes(tokenBody));
    mockSnapshotResponses();
    const client = new KISClient(creds);
    const [acct] = await client.listAccounts();
    await client.getAccountSnapshot(acct);
    const balCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('inquire-balance'))!;
    expect(String(balCall[0])).toContain('CANO=12345678');
    expect(String(balCall[0])).toContain('ACNT_PRDT_CD=01');
    expect(balCall[1].headers.tr_id).toBe('TTTC8434R');
    expect(balCall[1].headers.authorization).toBe('Bearer tok-123');
  });

  it('해외 주식은 USD 평가액과 손익을 KRW로 환산해 합산한다', async () => {
    const overseasNasdBody = {
      rt_cd: '0',
      output1: [
        {
          ovrs_pdno: 'AAPL',
          ovrs_item_name: 'Apple Inc.',
          ovrs_cblc_qty: '2',
          pchs_avg_pric: '100',
          now_pric2: '150',
          ovrs_stck_evlu_amt: '300',
          frcr_evlu_pfls_amt: '100',
          ovrs_excg_cd: 'NASD',
        },
      ],
    };
    fetchMock
      .mockResolvedValueOnce(jsonRes(tokenBody))
      .mockResolvedValueOnce(jsonRes(balanceBody))
      .mockResolvedValueOnce(jsonRes(fxBody))
      .mockResolvedValueOnce(jsonRes(overseasNasdBody))
      .mockResolvedValueOnce(jsonRes(emptyOverseasBody))
      .mockResolvedValueOnce(jsonRes(emptyOverseasBody));

    const client = new KISClient(creds);
    const [acct] = await client.listAccounts();
    const snap = await client.getAccountSnapshot(acct);

    expect(snap.totalEquityKrw).toBe('1690000');
    expect(snap.positionsValueKrw).toBe('1190000');
    expect(snap.positions).toHaveLength(2);
    expect(snap.positions.find((p) => p.symbol === 'AAPL')).toMatchObject({
      currency: 'USD',
      marketValue: '300',
      marketValueKrw: '390000',
      unrealizedPnl: '130000',
      fxRateToKrw: '1300',
    });
  });

  it('rt_cd가 0이 아니면 throw', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonRes(tokenBody))
      .mockResolvedValueOnce(jsonRes({ rt_cd: '1', msg1: '오류' }));
    const client = new KISClient(creds);
    const [acct] = await client.listAccounts();
    await expect(client.getAccountSnapshot(acct)).rejects.toBeInstanceOf(BrokerageError);
  });

  it('토큰 발급 401이면 auth 에러로 정규화', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes({ error: 'unauthorized' }, 401));
    const client = new KISClient(creds);
    await expect(client.validateCredentials()).rejects.toMatchObject({ kind: 'auth' });
  });
});
