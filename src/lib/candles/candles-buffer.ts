import { roundTimeByTimeframe, convertTimeframeToString, convertTimeframeToNumber } from '../utils/timeframe';
import { error, log, trace, warning } from '../core/log';
import { globals } from '../core/globals';
import { currentTime, timeCurrent, timeToString } from '../utils/date-time';
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
  private buffer: Candle[] = [];
  private lastTimeUpdated = null;
  private currentCandle: Candle = null;

  constructor(options: CandlesBufferOptions) {
    super();
    const { timeframe, maxBufferLength = 1000, symbol, preloadCandlesCount = 250 } = options;
    this.timeframeString = convertTimeframeToString(timeframe);
    this.timeframeNumber = convertTimeframeToNumber(timeframe);

    this.symbol = symbol;
    this.maxBufferLength = maxBufferLength;
    this.preloadCandlesCount = preloadCandlesCount;
  }

  getCandles() {
    return this.buffer;
  }

  get length() {
    return this.buffer.length;
  }

  clear() {
    this.buffer = [];
  }

  async initialize() {
    if (this.isInitialized) return;

    globals.events.subscribe('onTick', this.updateBuffer, this);

    const startInit = currentTime();
    const startTime = startInit - this.preloadCandlesCount * this.timeframeNumber * 1000 * 60;

    try {
      const history = await getHistory(this.symbol, this.timeframeString, startTime, this.preloadCandlesCount + 1);

      if (history.length > 0) {
        this.buffer = history.map(([timestamp, open, high, low, close]) => ({
          timestamp,
          open,
          high,
          low,
          close,
        }));

        this.lastTimeUpdated = this.buffer[this.buffer.length - 1].timestamp;

        this.isInitialized = true;

        log('CandlesBuffer:init', `${this.timeframeString} ${this.symbol}`, {
          count: history.length,
          startTime: startTime,
          startTimeHuman: timeToString(startTime),
          startTimestamp: startInit,
          startInitHuman: timeToString(startInit),
          timeframe: this.timeframeString,

          preloadCandlesCount: this.preloadCandlesCount,
          candlesCount: this.buffer.length,
          bufferStartDate: timeToString(this.buffer[0]['timestamp']) ?? 'no data',
          bufferEndDate: timeToString(this.buffer[this.buffer.length - 1]['timestamp']) ?? 'no data',
          maxBufferLength: this.maxBufferLength,
        });
      } else {
        warning('CandlesBuffer:init', `No candles loaded for symbol ${this.symbol}`, {
          timeframe: this.timeframeString,
          startDate: timeToString(startTime),
          endDate: timeToString(startInit),
          preloadCandlesCount: this.preloadCandlesCount,
        });
      }
    } catch (e) {
      error(e);
    }
  }

  private async updateBuffer() {
    //TODO change timeCurrent to tms(this.symbol) but after tms() will be return time in onInit in tester
    this.lastTimeUpdated = timeCurrent();

    const candleTimestamp = roundTimeByTimeframe(timeCurrent(), this.timeframeNumber);
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

  close(index = 0) {
    return this.buffer[this.buffer.length - 1 - index].close;
  }
  high(index = 0) {
    return this.buffer[this.buffer.length - 1 - index]?.high;
  }
  low(index = 0) {
    return this.buffer[this.buffer.length - 1 - index]?.low;
  }
  open(index = 0) {
    return this.buffer[this.buffer.length - 1 - index]?.open;
  }
  volume(index = 0) {
    return this.buffer[this.buffer.length - 1 - index]?.volume;
  }
  tms(index = 0) {
    return this.buffer[this.buffer.length - 1 - index]?.timestamp;
  }
}
