namespace TickTypes {
  export interface Tick {
    symbol: string;
    info: any;
    timestamp: number;
    datetime: string;
    high: number;
    low: number;
    bid: number;
    bidVolume?: number;
    ask: number;
    askVolume?: number;
    vwap?: number;
    open: number;
    close: number;
    last?: number;
    previousClose?: number;
    change?: number;
    percentage?: number;
    average?: number;
    quoteVolume?: number;
    baseVolume?: number;
    volume: number;
  }
}
