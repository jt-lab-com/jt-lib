import { roundTimeByTimeframe, convertTimeframeToString, convertTimeframeToNumber } from '../utils/timeframe';
import { error, log, trace, warning, warningOnce } from '../core/log';
import { globals } from '../core/globals';
import { currentTime, timeCurrent, timeToString } from '../utils/date-time';
import { BaseObject } from '../core/base-object';
import { abs, isRealNumber, round, validateNumbersInObject } from '../utils/numbers';
import { BaseError } from '../core/errors';

export interface CandlesBufferOptions {
  symbol: string;
  timeframe: string | number;
  maxBufferLength?: number;
  preloadCandlesCount?: number;
  autoUpdate?: boolean;
}

export class CandlesBuffer extends BaseObject {
  private MAX_CANDLES_REQUEST = 1000;
  private readonly timeframeString: TimeFrame;
  private readonly timeframeNumber: number;
  private readonly symbol: string;
  private readonly preloadCandlesCount: number;
  private readonly maxBufferLength: number;
  private isInitialized = false;
  private buffer: Candle[] = [];
  private lastTimeUpdated = null;
  private currentCandle: Candle = null;
  private readonly autoUpdate: boolean;

  constructor(options: CandlesBufferOptions) {
    super();
    const { timeframe, maxBufferLength = 1000, symbol, preloadCandlesCount = 250 } = options;
    this.timeframeString = convertTimeframeToString(timeframe);
    this.timeframeNumber = convertTimeframeToNumber(timeframe);

    this.symbol = symbol;
    this.maxBufferLength = maxBufferLength;
    this.preloadCandlesCount = preloadCandlesCount;
    this.autoUpdate = options.autoUpdate ?? globals.indicators.autoUpdate;
  }

  getCandles() {
    return this.buffer;
  }

  get length() {
    return this.buffer.length;
  }

  getInfo() {
    return {
      symbol: this.symbol,
      timeframe: this.timeframeString,
      timeframeNumber: this.timeframeNumber,
      isInitialized: this.isInitialized,
      bufferLength: this.buffer.length,
      maxBufferLength: this.maxBufferLength,
      preloadCandlesCount: this.preloadCandlesCount,
      autoUpdate: this.autoUpdate,
      lastTimeUpdated: this.lastTimeUpdated,
      bufferStartDate: timeToString(this.buffer[0]?.timestamp) ?? 'no data',
      bufferEndDate: timeToString(this.buffer[this.buffer.length - 1]?.timestamp) ?? 'no data',
    };
  }

  getShiftByTimestamp(timestamp: number) {
    timestamp = roundTimeByTimeframe(timestamp, this.timeframeNumber);
    const lastCandle = this.buffer[this.buffer.length - 1];

    if (!lastCandle) {
      error('CandlesBuffer:getShiftByTimestamp', `No values in buffer for ${this.symbol} `, {
        info: this.getInfo(),
        timestamp,
        humanTime: timeToString(timestamp),
      });
      return null;
    }

    const shift = Math.round((lastCandle.timestamp - timestamp) / (this.timeframeNumber * 1000 * 60));

    if (shift < 0 || shift >= this.buffer.length) {
      warning('CandlesBuffer:getShiftByTimestamp', `Value not found by timestamp ${this.symbol}`, {
        shift,
        timestamp,
        humanTime: timeToString(timestamp),
        info: this.getInfo(),
      });
      return null;
    }

    return shift;
  }

  getCandleByTimestamp(timestamp: number): Candle | null {
    timestamp = roundTimeByTimeframe(timestamp, this.timeframeNumber);
    const lastCandle = this.buffer[this.buffer.length - 1];

    if (!lastCandle) {
      warningOnce(
        'CandlesBuffer:getCandleByTimestamp',
        `No candles in buffer for ${this.symbol} ${this.timeframeString}`,
        this.getInfo(),
        60 * 1000,
      );
      return null;
    }

    const shift = round((lastCandle.timestamp - timestamp) / (this.timeframeNumber * 1000 * 60), 0, true);

    if (shift < 0 || shift >= this.buffer.length) {
      warningOnce(
        'CandlesBuffer:getCandleByTimestamp',
        `Candle not found by timestamp ${timeToString(timestamp)}`,
        this.getInfo(),
        60 * 1000,
      );
      return null;
    }

    const candle = this.getCandle(shift);
    if (!candle) {
      warningOnce(
        'CandlesBuffer:getCandleByTimestamp',
        `Candle not found by timestamp ${timeToString(timestamp)}`,
        { info: this.getInfo(), shift, candle, timestamp, humanTime: timeToString(timestamp) },
        60 * 1000,
      );
      return null;
    }

    if (candle.timestamp !== timestamp) {
      warningOnce(
        'CandlesBuffer:getCandleByTimestamp',
        `Candle timestamp mismatch requested ${timeToString(timestamp)} but got ${timeToString(candle.timestamp)}`,
        {
          info: this.getInfo(),
          shift,
          candle,
          timestamp,
          humanTime: timeToString(timestamp),
          diffSec: abs(candle.timestamp - timestamp) / 1000,
        },
        60 * 1000,
      );
    }

    // warningOnce('CandlesBuffer:getCandleByTimestamp', `Candle found by timestamp ${timeToString(timestamp)}`, {
    //   shift,
    //   candle,
    //   timestamp,
    //   humanTime: timeToString(timestamp),
    // });
    return candle;
  }
  clear() {
    this.buffer = [];
  }

  normalizeCandles() {
    //find first valide candle
    let lastValidCandle: Candle = null;
    let wrongCandlesCount = 0;
    let holesTimes = [];

    //b
    lastValidCandle = this.buffer[0];
    for (let i = 1; i < this.buffer.length; i++) {
      const { timestamp, open, high, low, close, volume } = this.buffer[i];

      const candlesDiff = timestamp - lastValidCandle.timestamp;
      if (candlesDiff !== this.timeframeNumber * 1000 * 60) {
        holesTimes.push({ time: timeToString(timestamp), diffSec: abs(timestamp - lastValidCandle.timestamp) / 1000 });
      }
      if (candlesDiff === 0) {
        continue; //same candle
      }
      if (
        !isRealNumber(timestamp) ||
        !isRealNumber(open) ||
        !isRealNumber(high) ||
        !isRealNumber(low) ||
        !isRealNumber(close) ||
        !isRealNumber(volume)
      ) {
        if (i === 0) {
          throw new BaseError(`First candle is invalid for ${this.symbol} ${this.timeframeString}`);
        }
        wrongCandlesCount++;
        this.buffer[i] = lastValidCandle;
        this.buffer[i].timestamp = timestamp;
      }

      lastValidCandle = this.buffer[i];
    }

    if (wrongCandlesCount > 0) {
      warning(
        'CandlesBuffer:normalizeCandles',
        `Found and fixed ${wrongCandlesCount} wrong candles for ${this.symbol} ${this.timeframeString}`,
      );
    }

    if (holesTimes.length > 0) {
      warning(
        'CandlesBuffer:normalizeCandles',
        `Found ${holesTimes.length} holes in candles for ${this.symbol} ${this.timeframeString}`,
        { holesTimes: holesTimes.slice(-5), ...this.getInfo() },
      );
    }
  }

  async loadMoreHistory(count: number, direction: 'back' | 'forward' = 'forward') {
    if (!this.isInitialized) {
      throw new BaseError('CandlesBuffer:loadMoreHistory Buffer is not initialized');
    }
  }

  async loadHistory(startTime: number, count: number) {
    const loops = round(count / this.MAX_CANDLES_REQUEST, 0, true) + 1;

    log('CandlesBuffer:loadHistory', '', {
      startTime: startTime,
      startTimeHuman: timeToString(startTime),
      count: count,
      loops: loops,
      info: this.getInfo(),
    });

    for (let i = 0; i < loops; i++) {
      count = loops === 1 ? count : this.MAX_CANDLES_REQUEST;

      // log(
      //   'CandlesBuffer:loadHistory',
      //   `Loading loop ${i + 1}/${loops}`,
      //   {
      //     startTime: startTime,
      //     humanStartTime: timeToString(startTime),
      //     i,
      //     count,
      //   },
      //   true,
      // );
      await this.loadHistoryA(startTime, count);
      startTime = startTime + count * this.timeframeNumber * 1000 * 60;
    }
  }
  async loadHistoryA(startTime: number, count: number, direction: 'back' | 'forward' = 'forward') {
    const startInit = currentTime();

    try {
      const history = await getHistory(this.symbol, this.timeframeString, startTime, count + 1);
      trace('CandlesBuffer:loadHistoryA', `Loaded ${history.length} candles for ${this.symbol}`, {
        history: history.slice(-5),
      });
      if (history.length > 0) {
        // this.buffer = history.map(([timestamp, open, high, low, close, volume]) => ({
        //   timestamp,
        //   open,
        //   high,
        //   low,
        //   close,
        //   volume,
        // }));

        if (direction === 'forward') {
          history.forEach(([timestamp, open, high, low, close, volume]) => {
            this.buffer.push({
              timestamp,
              open,
              high,
              low,
              close,
              volume,
            });
          });
        } else {
          const tempBuffer = [];
          history.forEach(([timestamp, open, high, low, close, volume]) => {
            tempBuffer.push({
              timestamp,
              open,
              high,
              low,
              close,
              volume,
            });
          });
          this.buffer = [...tempBuffer, ...this.buffer];
        }

        //this.buffer[6].open = undefined; //
        this.normalizeCandles();

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
      error(e, {
        count,
        startTime,
        humanStartTime: timeToString(startTime),
        timeframe: this.timeframeString,
        symbol: this.symbol,
      });
    }
  }

  async initialize() {
    if (this.isInitialized) return;

    if (this.autoUpdate) {
      globals.events.subscribe('onTick', this.updateBuffer, this);
    }

    const startInit = currentTime();
    const startTime = startInit - this.preloadCandlesCount * this.timeframeNumber * 1000 * 60;

    await this.loadHistory(startTime, this.preloadCandlesCount);
    //
    // try {
    //   const history = await getHistory(this.symbol, this.timeframeString, startTime, this.preloadCandlesCount + 1);
    //   trace('CandlesBuffer:initialize', `Loaded ${history.length} candles for ${this.symbol}`, {
    //     history: history.slice(-5),
    //   });
    //   if (history.length > 0) {
    //     this.buffer = history.map(([timestamp, open, high, low, close, volume]) => ({
    //       timestamp,
    //       open,
    //       high,
    //       low,
    //       close,
    //       volume,
    //     }));
    //
    //     //this.buffer[6].open = undefined; //
    //     this.normalizeCandles();
    //
    //     this.lastTimeUpdated = this.buffer[this.buffer.length - 1].timestamp;
    //
    //     this.isInitialized = true;
    //
    //     log('CandlesBuffer:init', `${this.timeframeString} ${this.symbol}`, {
    //       count: history.length,
    //       startTime: startTime,
    //       startTimeHuman: timeToString(startTime),
    //       startTimestamp: startInit,
    //       startInitHuman: timeToString(startInit),
    //       timeframe: this.timeframeString,
    //
    //       preloadCandlesCount: this.preloadCandlesCount,
    //       candlesCount: this.buffer.length,
    //       bufferStartDate: timeToString(this.buffer[0]['timestamp']) ?? 'no data',
    //       bufferEndDate: timeToString(this.buffer[this.buffer.length - 1]['timestamp']) ?? 'no data',
    //       maxBufferLength: this.maxBufferLength,
    //     });
    //   } else {
    //     warning('CandlesBuffer:init', `No candles loaded for symbol ${this.symbol}`, {
    //       timeframe: this.timeframeString,
    //       startDate: timeToString(startTime),
    //       endDate: timeToString(startInit),
    //       preloadCandlesCount: this.preloadCandlesCount,
    //     });
    //   }
    // } catch (e) {
    //   error(e);
    // }
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
