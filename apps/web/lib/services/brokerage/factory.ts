import { KISClient, type KISCredentials } from './KISClient';
import type { Broker, BrokerageClient } from './types';

/** 증권사별 클라이언트 생성. PR1a는 KIS만, Toss는 드롭인 추가 예정. */
export function createBrokerageClient(broker: Broker, credentials: unknown): BrokerageClient {
  switch (broker) {
    case 'KIS':
      return new KISClient(credentials as KISCredentials);
    case 'TOSS':
      throw new Error('TOSS client not implemented yet');
    default:
      throw new Error(`unknown broker: ${broker as string}`);
  }
}
