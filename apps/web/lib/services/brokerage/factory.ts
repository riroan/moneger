import { KISClient, type KISCredentials } from './KISClient';
import { TossClient, type TossCredentials } from './TossClient';
import type { Broker, BrokerageClient } from './types';

/** 증권사별 클라이언트 생성. */
export function createBrokerageClient(broker: Broker, credentials: unknown): BrokerageClient {
  switch (broker) {
    case 'KIS':
      return new KISClient(credentials as KISCredentials);
    case 'TOSS':
      return new TossClient(credentials as TossCredentials);
    default:
      throw new Error(`unknown broker: ${broker as string}`);
  }
}
