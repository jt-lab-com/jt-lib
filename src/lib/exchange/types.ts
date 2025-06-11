export interface ExchangeParams {
  symbol: string;
  connectionName?: string;
  hedgeMode?: boolean;
  prefix?: string;
  leverage?: number;
  triggerType?: TriggerType;
}

export type TriggerType = 'exchange' | 'script';

export interface StopOrderData {
  ownerOrderClientId: string;
  slClientOrderId?: string;
  slOrderId?: string;
  tpClientOrderId?: string;
  tpOrderId?: string;
}

export interface CreateTriggerOrderByTaskParams {
  type: OrderType;
  side: OrderSide;
  amount: number;
  price: number;
  params: Record<string, unknown>;
}

export interface StopOrderQueueItem {
  ownerOrderId: string;
  sl?: number;
  tp?: number;
  prefix: string;
}

export interface ExchangeOrder {
  id: string;
  clientOrderId: string;
  side: 'buy' | 'sell';
  openPrice: number;
  closePrice: number;
  amount: number;
  status: string;
  profit: number;
  reduceOnly: boolean;
  dateOpen: string;
  dateClose: string;
  shortClientId: string;
}

export type MarketInfoShort = {
  symbol: string;
  close: number;
  buyContracts: number;
  buySizeUsd: number;
  BuyEntryPrice: number;
  sellContracts: number;
  sellSizeUsd: number;
  sellEntryPrice: number;
  leverage: number;
};
