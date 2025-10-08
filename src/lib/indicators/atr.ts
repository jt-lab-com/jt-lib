import { BaseIndicator } from './base-indicator';
import { abs, validateNumbersInObject } from '../utils/numbers';
import { CandlesBuffer } from '../candles';
import { globals } from '../core/globals';

import { MaBuffer } from './utils/ma-buffer';
import { BaseError } from '../core/errors';
import { timeCurrent, timeToString } from '../utils/date-time';
import { roundTimeByTimeframe } from '../utils/timeframe';
import { error, warning, warningOnce } from '../core/log';

interface AverageTrueRangeOptions {
  symbol: string;
  timeframe: TimeFrame;
  period: number;
}

export class AverageTrueRange extends BaseIndicator {
  private readonly period: number;
  private lastIndex = 0;

  private lastTimeUpdated = 0;
  private trSum = 0;
  private firstTRInWindow = 0;

  avg: MaBuffer;

  constructor(buffer: CandlesBuffer, options: AverageTrueRangeOptions) {
    super(options.symbol, options.timeframe, buffer);

    if (!options.period || options.period < 1) {
      throw new BaseError('ATR: period must be >1', { buffer, options });
    }
    this.period = options.period;
    this.avg = new MaBuffer(this.period);
  }

  private trueRange(c: Candle) {
    // const hl = c.high - c.low;
    // const hc = abs(c.high - prevClose);
    // const lc = abs(c.low - prevClose);
    return abs(c.high - c.low);
  }

  onCalculate() {
    const candles = this.candlesBuffer.getCandles();
    if (candles.length < this.period + 1) {
      warningOnce('ATR: Not enough candles to calculate ATR', '', {
        candlesLength: candles.length,
        period: this.period,
      });
      return { msg: 'Not enough candles to calculate' };
    }

    if (this.lastTimeUpdated >= this.candlesBuffer.getLastTimeUpdated()) return;
    if (candles.length <= this.period) return;

    try {
      for (let i = this.lastIndex; i < candles.length - 1; i++) {
        // ! candles.length -1 because calculate only on full candles
        const tr = this.trueRange(candles[i]);
        this.avg.addValue(tr);
        if (i >= this.period) {
          this.buffer.push({ timestamp: candles[i].timestamp, value: this.avg.getValue() });
          //globals.report.chartAddPointXY('ART debug', 'atr', candles[i].timestamp, this.avg.getValue());
        }
      }
      this.lastIndex = candles.length - 1;
      this.lastTimeUpdated = candles[candles.length - 1].timestamp;
    } catch (e) {
      throw new BaseError(e, {
        candlesLength: candles.length,
        period: this.period,
        lastIndex: this.lastIndex,
        lastTimeUpdated: this.lastTimeUpdated,
      });
    }
  }

  getIndicatorValues() {
    if (!this.buffer.length) this.onCalculate();
    return this.buffer;
  }

  getValue(shift = 0): number {
    this.onCalculate();
    const idx = this.buffer.length - 1 - shift;
    return idx >= 0 ? this.buffer[idx]?.value : undefined;
  }
}
