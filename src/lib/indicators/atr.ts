import { BaseIndicator } from './base-indicator';
import { abs, validateNumbersInObject } from '../utils/numbers';
import { CandlesBuffer } from '../candles';
import { globals } from '../core/globals';
import { log } from '../core/log';

interface AverageTrueRangeOptions {
  symbol: string;
  timeframe: TimeFrame;
  period: number;
}

export class AverageTrueRange extends BaseIndicator {
  private readonly period: number;
  private firstValue = 0;
  private lastIndex = 0;

  private lastTimeUpdated = 0;
  private trSum = 0;
  private firstTR = 0;

  constructor(buffer: CandlesBuffer, options: AverageTrueRangeOptions) {
    super(options.symbol, options.timeframe, buffer);
    this.period = options.period;
  }

  protected onCalculate() {
    const candles = this.candlesBuffer.getCandles();

    if (this.lastTimeUpdated >= this.candlesBuffer.getLastTimeUpdated()) return;
    if (candles.length < this.period) return;

    if (this.lastIndex === 0) {
      this.firstTR = abs(candles[0].close - candles[1].close);

      for (let i = 1; i < this.period; i++) {
        //validateNumbersInObject({ close: candles[i - 1].close, close2: candles[i].close });
        this.trSum += abs(candles[i - 1].close - candles[i].close);
      }

      this.lastIndex = this.period - 1;
      const atr = this.trSum / this.period;

      validateNumbersInObject({ atr, trSum: this.trSum });
      this.buffer.push({ timestamp: candles[this.period - 1].timestamp, value: atr });
      log(
        'calculate ',
        'pre calc values',
        { atr, lastIndex: this.lastIndex, period: this.period, trSum: this.trSum },
        true,
      );
    }
    const startIndex = this.lastIndex + 1;

    for (let i = startIndex; i < candles.length; i++) {
      const tr = abs(candles[i - 1].close - candles[i].close);
      this.trSum = this.trSum - this.firstTR + tr;
      this.firstTR = abs(candles[i - this.period].close - candles[i - this.period + 1].close);

      const atr = this.trSum / this.period;

      this.buffer.push({ timestamp: candles[i].timestamp, value: atr });
      this.lastTimeUpdated = candles[i].timestamp;
      this.lastIndex = i;
      globals.report.chartAddPointAgg('Chart+', 'TR', tr, 'max');
    }

    globals.report.chartAddPointAgg('Chart+', 'SumTR', this.trSum);
    globals.report.chartAddPointAgg('Chart+', 'FirsTr', this.firstTR, 'max');
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
