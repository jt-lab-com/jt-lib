namespace OrderTypes {
  export interface Order {
    id?: string;
    error?: string;
    clientOrderId?: string;
    datetime?: string;
    timestamp?: number;
    lastTradeTimestamp?: number;
    status?: 'open' | 'closed' | 'canceled' | string;
    symbol?: string;
    type?: string;
    timeInForce?: string;
    side?: 'buy' | 'sell' | string;
    positionSide?: PositionSideType;
    price?: number;
    average?: number;
    amount?: number;
    filled?: number;
    remaining?: number;
    cost?: number;
    trades?: Trade[];
    fee?: Fee;
    info?: any;
    reduceOnly?: boolean;
    stopType?: string;
    realId?: string;
    emulated?: boolean;
  }

  export type OrderType = 'market' | 'limit';
  export type OrderSide = 'buy' | 'sell';

  interface Fee {
    type?: 'taker' | 'maker' | string;
    currency: string;
    rate?: number;
    cost: number;
  }

  interface Trade {
    amount: number;
    datetime: string;
    id: string;
    info: any;
    order?: string;
    price: number;
    timestamp: number;
    type?: string;
    side: 'buy' | 'sell' | string;
    symbol: string;
    takerOrMaker: 'taker' | 'maker' | string;
    cost: number;
    fee: Fee;
  }

  export type PositionSideType = 'long' | 'short' | 'both';
}
