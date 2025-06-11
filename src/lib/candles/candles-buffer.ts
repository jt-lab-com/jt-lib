import { roundTimeByTimeframe, convertTimeframeToString, convertTimeframeToNumber } from '../utils/timeframe';
import { error, log, trace, warning } from '../core/log';
import { globals } from '../core/globals';
import { currentTime, timeToString } from '../utils/date-time';
import { BaseObject } from '../core/base-object';

export interface CandlesBufferOptions {
  symbol: string;
  timeframe: string | number;
  maxBufferLength?: number;
  preloadCandlesCount?: number;
}

export class CandlesBuffer extends BaseObject {
  private readonly timeframeString: TimeFrame;
  private readonly timeframeNumber: number;
  private readonly symbol: string;
  private readonly preloadCandlesCount: number;
  private readonly maxBufferLength: number;
  private isInitialized = false;
  private buffer = [];
  private lastTimeUpdated = null;
  private currentCandle: Candle = null;

  constructor(options: CandlesBufferOptions) {
    super();
    const { timeframe, maxBufferLength = 1000, symbol, preloadCandlesCount = 200 } = options;
    this.timeframeString = convertTimeframeToString(timeframe);
    this.timeframeNumber = convertTimeframeToNumber(timeframe);

    this.symbol = symbol;
    this.maxBufferLength = maxBufferLength;
    this.preloadCandlesCount = preloadCandlesCount;
  }

  getCandles() {
    return this.buffer;
  }

  clear() {
    this.buffer = [];
  }

  async initialize() {
    if (this.isInitialized) return;

    globals.events.subscribe('onTick', this.updateBuffer, this);

    const startTimestamp = currentTime();
    const startTime = startTimestamp - this.preloadCandlesCount * this.timeframeNumber * 1000 * 60;

    try {
      const history = await getHistory(this.symbol, this.timeframeString, startTime, this.preloadCandlesCount);

      trace('CandlesBuffer:init', 'history', {
        count: history.length,
        startTime: startTime,
        startTimestamp: startTimestamp,
        timeframe: this.timeframeString,
        startTimeHuman: timeToString(startTime),
        preloadCandlesCount: this.preloadCandlesCount,
      });

      if (this.buffer.length > 0) {
        this.buffer = history.map(([timestamp, open, high, low, close]) => ({
          timestamp,
          open,
          high,
          low,
          close,
        }));

        this.isInitialized = true;
        log('CandlesBuffer:init', `Candles buffer initialized for symbol ${this.symbol}`, {
          candlesCount: this.buffer.length,
          timeframe: this.timeframeString,
          startDate: timeToString(this.buffer[0]['timestamp']) ?? 'no data',
          endDate: timeToString(this.buffer[this.buffer.length - 1]['timestamp']) ?? 'no data',
          maxBufferLength: this.maxBufferLength,
          preloadCandlesCount: this.preloadCandlesCount,
        });
      } else {
        warning('CandlesBuffer:init', `No candles loaded for symbol ${this.symbol}`, {
          timeframe: this.timeframeString,
          startDate: timeToString(startTime),
          endDate: timeToString(startTimestamp),
          preloadCandlesCount: this.preloadCandlesCount,
        });
      }
    } catch (e) {
      error(e);
    }
  }

  private async updateBuffer() {
    this.lastTimeUpdated = tms();

    const candleTimestamp = roundTimeByTimeframe(tms(this.symbol), this.timeframeNumber);
    const currentPrice = close(this.symbol);

    if (!this.currentCandle) {
      const prevCandle = this.buffer[this.buffer.length - 1];
      this.currentCandle = {
        timestamp: candleTimestamp,
        open: prevCandle?.close ?? currentPrice,
        high: !!prevCandle ? Math.max(prevCandle.close, currentPrice) : currentPrice,
        low: !!prevCandle ? Math.min(prevCandle.close, currentPrice) : currentPrice,
        close: currentPrice,
        volume: 0,
      };
      return;
    }

    if (this.currentCandle.timestamp < candleTimestamp) {
      this.addCandle({
        timestamp: candleTimestamp,
        open: this.currentCandle.close,
        high: currentPrice,
        low: currentPrice,
        close: currentPrice,
        volume: 0,
      });
    } else {
      this.updateCurrentCandle(currentPrice);
    }
  }

  private addCandle(candle: Candle) {
    this.buffer.push(candle);
    this.currentCandle = candle;
  }

  getCandle(shift: number): Candle {
    return this.buffer[this.buffer.length - 1 - shift];
  }
  private updateCurrentCandle(currentPrice: number) {
    this.currentCandle.high = Math.max(currentPrice, this.currentCandle.high);
    this.currentCandle.low = Math.min(currentPrice, this.currentCandle.low);
    this.currentCandle.close = currentPrice;
  }

  getLastTimeUpdated() {
    return this.lastTimeUpdated;
  }
}
