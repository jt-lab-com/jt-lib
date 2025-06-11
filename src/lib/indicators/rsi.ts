import { BaseIndicator } from './base-indicator';
import { normalize } from '../utils/numbers';
import { CandlesBuffer } from '../candles';

interface RelativeStrengthIndexOptions {
  symbol: string;
  timeframe: TimeFrame;
  period: number;
}

export class RelativeStrengthIndex extends BaseIndicator {
  private readonly period: number;

  constructor(buffer: CandlesBuffer, options: RelativeStrengthIndexOptions) {
    super(options.symbol, options.timeframe, buffer);

    this.period = options.period;
  }

  private lastIndex = 0;
  private lastTimeUpdated = 0;
  private positiveBuffer = [];
  private negativeBuffer = [];

  protected onCalculate() {
    const candles = this.candlesBuffer.getCandles();

    if (this.lastTimeUpdated >= this.candlesBuffer.getLastTimeUpdated()) return;
    if (candles.length <= this.period) return;

    // first calc
    if (this.lastIndex === 0) {
      this.buffer.push({ timestamp: candles[0].timestamp, value: 0 });
      this.positiveBuffer.push(0);
      this.negativeBuffer.push(0);

      let sumP = 0;
      let sumN = 0;

      for (let i = 1; i < this.period; i++) {
        this.buffer[i] = { timestamp: candles[i].timestamp, value: 0 };
        this.positiveBuffer[i] = 0;
        this.negativeBuffer[i] = 0;
        const diff = candles[i].close - candles[i - 1].close;
        sumP += diff > 0 ? diff : 0;
        sumN += diff < 0 ? -diff : 0;
      }

      this.positiveBuffer[this.period] = sumP / this.period;
      this.negativeBuffer[this.period] = sumN / this.period;
      this.buffer[this.period] = {
        timestamp: candles[this.period].timestamp,
        value: normalize(100 - 100 / (1 + this.positiveBuffer[this.period] / this.negativeBuffer[this.period])),
      };
      this.lastIndex = this.period - 1;
    }

    const startIndex = this.lastIndex + 1;

    for (let i = startIndex; i < candles.length; i++) {
      const diff = candles[i].close - candles[i - 1].close;
      this.positiveBuffer[i] = (this.positiveBuffer[i - 1] * (this.period - 1) + (diff > 0 ? diff : 0)) / this.period;
      this.negativeBuffer[i] = (this.negativeBuffer[i - 1] * (this.period - 1) + (diff < 0 ? -diff : 0)) / this.period;
      this.buffer[i] = {
        timestamp: candles[i].timestamp,
        value: normalize(100 - 100 / (1 + this.positiveBuffer[i] / this.negativeBuffer[i])),
      };
      this.lastTimeUpdated = candles[i].timestamp;
      this.lastIndex = i;
    }
  }

  getIndicatorValues() {
    if (!this.buffer.length) {
      this.onCalculate();
    }

    return this.buffer;
  }

  getValue(shift = 0) {
    this.onCalculate();
    return this.buffer[this.lastIndex - shift]?.value;
  }
}
