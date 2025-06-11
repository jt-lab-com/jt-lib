namespace CandleTypes {
  export interface Candle {
    timestamp: number;
    high: number;
    low: number;
    open: number;
    close: number;
    volume: number;
  }

  export type OHLC = [number, number, number, number, number, number];
}
