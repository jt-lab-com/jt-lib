import { BaseIndicator } from './base-indicator';
import { normalize } from '../utils/numbers';
import { CandlesBuffer } from '../candles';

interface CommodityChannelIndexOptions {
  symbol: string;
  timeframe: TimeFrame;
  period: number;
}

export class CommodityChannelIndex extends BaseIndicator {
  private readonly period: number;

  constructor(buffer: CandlesBuffer, options: CommodityChannelIndexOptions) {
    super(options.symbol, options.timeframe, buffer);

    this.period = options.period;
  }

  private lastIndex = 0;
  private lastTimeUpdated = 0;
  private typicalPriceBuffer: number[] = [];
  private smaBuffer: number[] = [];

  protected onCalculate() {
    const candles = this.candlesBuffer.getCandles();

    if (this.lastTimeUpdated >= this.candlesBuffer.getLastTimeUpdated()) return;
    if (candles.length <= this.period) return;

    // first calc
    if (this.lastIndex === 0) {
      // Initialize buffers for the first period-1 candles with zeros
      for (let i = 0; i < this.period - 1; i++) {
        this.buffer.push({ timestamp: candles[i].timestamp, value: 0 });
      }

      // Calculate typical prices for all candles up to current length
      for (let i = 0; i < candles.length; i++) {
        this.typicalPriceBuffer[i] = (candles[i].high + candles[i].low + candles[i].close) / 3;
      }

      // Calculate first SMA
      let sum = 0;
      for (let i = 0; i < this.period; i++) {
        sum += this.typicalPriceBuffer[i];
      }
      this.smaBuffer[this.period - 1] = sum / this.period;

      // Calculate first CCI
      const meanDeviation = this.calculateMeanDeviation(0, this.period - 1);
      const cci =
        meanDeviation === 0
          ? 0
          : (this.typicalPriceBuffer[this.period - 1] - this.smaBuffer[this.period - 1]) / (0.015 * meanDeviation);

      this.buffer[this.period - 1] = {
        timestamp: candles[this.period - 1].timestamp,
        value: normalize(cci),
      };
      this.lastIndex = this.period - 1;
    }

    const startIndex = this.lastIndex + 1;

    for (let i = startIndex; i < candles.length; i++) {
      // Calculate typical price
      this.typicalPriceBuffer[i] = (candles[i].high + candles[i].low + candles[i].close) / 3;

      // Calculate SMA using rolling average
      if (i === this.period - 1) {
        // First complete SMA calculation
        let sum = 0;
        for (let j = 0; j < this.period; j++) {
          sum += this.typicalPriceBuffer[j];
        }
        this.smaBuffer[i] = sum / this.period;
      } else {
        // Rolling SMA calculation
        this.smaBuffer[i] =
          this.smaBuffer[i - 1] + (this.typicalPriceBuffer[i] - this.typicalPriceBuffer[i - this.period]) / this.period;
      }

      // Calculate CCI
      const meanDeviation = this.calculateMeanDeviation(i - this.period + 1, i);
      const cci = meanDeviation === 0 ? 0 : (this.typicalPriceBuffer[i] - this.smaBuffer[i]) / (0.015 * meanDeviation);

      this.buffer[i] = {
        timestamp: candles[i].timestamp,
        value: normalize(cci),
      };
      this.lastTimeUpdated = candles[i].timestamp;
      this.lastIndex = i;
    }
  }

  private calculateMeanDeviation(startIndex: number, endIndex: number): number {
    if (startIndex < 0 || endIndex >= this.typicalPriceBuffer.length) return 0;

    // Calculate the SMA for the current period
    let smaSum = 0;
    for (let i = startIndex; i <= endIndex; i++) {
      smaSum += this.typicalPriceBuffer[i];
    }
    const currentSMA = smaSum / this.period;

    // Calculate mean deviation
    let sum = 0;
    for (let i = startIndex; i <= endIndex; i++) {
      sum += Math.abs(this.typicalPriceBuffer[i] - currentSMA);
    }
    return sum / this.period;
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
