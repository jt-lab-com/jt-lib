import { BaseIndicator } from './base-indicator';
import { abs, normalize } from '../utils/numbers';
import { CandlesBuffer } from '../candles';
import { BaseError } from '../core/errors';
import { MaBuffer } from './utils/ma-buffer';

interface NormalizedAverageTrueRangeOptions {
  symbol: string;
  timeframe: TimeFrame;
  period: number;
}

export class NormalizedAverageTrueRange extends BaseIndicator {
  private readonly period: number;
  private lastIndex = 0;
  private lastTimeUpdated = 0;

  avg: MaBuffer;

  constructor(buffer: CandlesBuffer, options: NormalizedAverageTrueRangeOptions) {
    super(options.symbol, options.timeframe, buffer);

    if (!options.period || options.period < 1) {
      throw new BaseError('NATR: period must be >1', { buffer, options });
    }

    this.period = options.period;
    this.avg = new MaBuffer(this.period, []);
  }

  private trueRange(candle: Candle, prevClose?: number): number {
    return candle.high - candle.low;
  }

  protected onCalculate() {
    const candles = this.candlesBuffer.getCandles();

    if (this.lastTimeUpdated >= this.candlesBuffer.getLastTimeUpdated()) return;
    if (candles.length <= this.period) return;

    try {
      for (let i = this.lastIndex; i < candles.length; i++) {
        // Calculate only on full candles
        const prevClose = i > 0 ? candles[i - 1].close : undefined;
        const tr = this.trueRange(candles[i], prevClose);

        this.avg.addValue(tr);

        // Only calculate NATR when we have enough data for the period
        if (i >= this.period - 1) {
          const atr = this.avg.getValue();
          if (atr !== undefined) {
            const closePrice = candles[i].close;

            // Calculate NATR as percentage: (ATR / Close Price) * 100
            const natr = closePrice > 0 ? (atr / closePrice) * 100 : 0;

            this.buffer.push({
              timestamp: candles[i].timestamp,
              value: natr,
            });
          }
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
    if (!this.buffer.length) {
      this.onCalculate();
    }
    return this.buffer;
  }

  getValue(shift = 0): number {
    this.onCalculate();
    const idx = this.buffer.length - 1 - shift;
    return this.buffer[idx]?.value;
  }

  getInfo() {
    const baseInfo = super.getInfo();
    return {
      ...baseInfo,
      period: this.period,
      indicatorType: 'NATR',
      description: 'Normalized Average True Range - ATR as percentage of close price',
    };
  }
}

