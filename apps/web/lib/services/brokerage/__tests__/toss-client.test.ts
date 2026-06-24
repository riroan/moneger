import { TossClient } from '../TossClient';
import { __clearTokenCache } from '../BaseBrokerageClient';

const creds = { clientId: 'cid', clientSecret: 'secret' };

function jsonRes(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const tokenBody = { access_token: 'tok-toss', expires_in: 86400, token_type: 'Bearer' };

describe('TossClient', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    __clearTokenCache();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('validateCredentials: OAuth 토큰 발급 성공 시 통과', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes(tokenBody));
    const client = new TossClient(creds);

    await expect(client.validateCredentials()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/oauth2/token');
    expect(fetchMock.mock.calls[0][1].body.toString()).toContain('grant_type=client_credentials');
  });

  it('listAccounts: 계좌 목록을 공통 계좌 ref로 정규화한다', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonRes(tokenBody))
      .mockResolvedValueOnce(
        jsonRes({
          result: [
            { accountNo: '12345678901', accountSeq: 7, accountType: 'BROKERAGE' },
            { accountNo: '98765432109', accountSeq: 9, accountType: 'BROKERAGE' },
          ],
        })
      );
    const client = new TossClient(creds);

    await expect(client.listAccounts()).resolves.toEqual([
      {
        broker: 'TOSS',
        externalAccountId: '7',
        displayName: '12345678901',
        accountType: 'unknown',
        baseCurrency: 'KRW',
      },
    ]);
  });

  it('getAccountSnapshot: KR/US 보유 종목을 KRW 기준 스냅샷으로 환산한다', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonRes(tokenBody))
      .mockResolvedValueOnce(
        jsonRes({
          result: {
            marketValue: {
              amount: { krw: '7200000', usd: '1785' },
              amountAfterCost: { krw: '7050000', usd: '1771.43' },
            },
            profitLoss: {
              amount: { krw: '700000', usd: '232' },
              amountAfterCost: { krw: '550000', usd: '218.43' },
              rate: '0.1179',
              rateAfterCost: '0.0983',
            },
            items: [
              {
                symbol: '005930',
                name: '삼성전자',
                marketCountry: 'KR',
                currency: 'KRW',
                quantity: '100',
                lastPrice: '72000',
                averagePurchasePrice: '65000',
                marketValue: { purchaseAmount: '6500000', amount: '7200000', amountAfterCost: '7050000' },
                profitLoss: { amount: '700000', amountAfterCost: '550000', rate: '0.1077', rateAfterCost: '0.0846' },
              },
              {
                symbol: 'AAPL',
                name: 'Apple Inc.',
                marketCountry: 'US',
                currency: 'USD',
                quantity: '10',
                lastPrice: '178.5',
                averagePurchasePrice: '155.3',
                marketValue: { purchaseAmount: '1553', amount: '1785', amountAfterCost: '1771.43' },
                profitLoss: { amount: '232', amountAfterCost: '218.43', rate: '0.1494', rateAfterCost: '0.1406' },
              },
            ],
          },
        })
      )
      .mockResolvedValueOnce(jsonRes({ result: { rate: '1300' } }));

    const client = new TossClient(creds);
    const snap = await client.getAccountSnapshot({
      broker: 'TOSS',
      externalAccountId: '7',
      displayName: '12345678901',
      accountType: 'unknown',
      baseCurrency: 'KRW',
    });

    expect(snap.cashKrw).toBe('0');
    expect(snap.positionsValueKrw).toBe('9520500');
    expect(snap.totalEquityKrw).toBe('9520500');
    expect(snap.positions).toHaveLength(2);
    expect(snap.positions.find((p) => p.symbol === 'AAPL')).toMatchObject({
      currency: 'USD',
      marketValue: '1785',
      marketValueKrw: '2320500',
      unrealizedPnl: '301600',
      fxRateToKrw: '1300',
    });

    const holdingsCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('/api/v1/holdings'))!;
    expect(holdingsCall[1].headers['X-Tossinvest-Account']).toBe('7');
  });
});
