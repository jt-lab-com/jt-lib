import { BaseIndicator } from './base-indicator';
import { CandlesBuffer } from '../candles';

interface SimpleMovingAverageIndicatorOptions {
  symbol: string;
  timeframe: TimeFrame;
  period: number;
}

export class SimpleMovingAverageIndicator extends BaseIndicator {
  private readonly period: number;
  private firstValue = 0;
  private lastIndex = 0;
  private sum = 0;
  private lastTimeUpdated = 0;

  constructor(buffer: CandlesBuffer, options: SimpleMovingAverageIndicatorOptions) {
    super(options.symbol, options.timeframe, buffer);
    this.period = options.period;
  }

  protected onCalculate() {
    const candles = this.candlesBuffer.getCandles();

    if (this.lastTimeUpdated >= this.candlesBuffer.getLastTimeUpdated()) return;
    if (candles.length < this.period) return;

    if (this.lastIndex === 0) {
      this.firstValue = candles[0].close;

      for (let i = 0; i < this.period; i++) {
        this.sum += candles[i].open;
      }

      this.lastIndex = this.period - 1;
      const avg = this.sum / this.period;
      this.buffer.push({ timestamp: candles[this.period - 1].timestamp, value: avg });
    }

    const startIndex = this.lastIndex + 1;

    for (let i = startIndex; i < candles.length; i++) {
      this.sum = this.sum - this.firstValue + candles[i].close;
      this.firstValue = candles[i - this.period + 1].close;
      const avg = this.sum / this.period;
      this.buffer.push({ timestamp: candles[i].timestamp, value: avg });
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

  getValue(shift: number = 0): number {
    this.onCalculate();
    return this.buffer[this.lastIndex - this.period - 1 - shift]?.value;
  }
}
