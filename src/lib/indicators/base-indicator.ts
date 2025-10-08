import { BaseObject } from '../core/base-object';
import { error, trace } from '../core/log';
import { BufferIndicatorItem } from './types';
import type { CandlesBuffer } from '../candles';
import { timeToString } from '../utils/date-time';

export class BaseIndicator extends BaseObject {
  protected readonly symbol: string;
  protected readonly timeframe: string;
  protected candlesBuffer: CandlesBuffer;
  protected buffer: BufferIndicatorItem[] = [];

  notForDestroy = ['candlesBuffer'];

  constructor(symbol: string, timeframe: TimeFrame, buffer: CandlesBuffer) {
    super();
    this.candlesBuffer = buffer;
    const className = this.constructor?.name || 'BaseIndicator';

    this.symbol = symbol;
    this.timeframe = timeframe;

    trace('Indicator:constructor', className, this.getInfo());
  }

  getCandlesBuffer() {
    return this.candlesBuffer;
  }
  protected onCalculate(): any {}
  get length() {
    this.onCalculate();
    return this.buffer.length;
  }
  clear() {
    this.buffer = [];
  }

  getValue(shift = 0) {
    return this.buffer[this.buffer.length - shift]?.value;
  }
  getTimestamp(shift = 0) {
    return this.buffer[this.buffer.length - shift]?.timestamp;
  }

  getIndicatorValues() {
    return this.buffer;
  }

  getInfo() {
    const length = this.candlesBuffer.length;
    return {
      symbol: this.symbol,
      timeframe: this.timeframe,
      candlesBufferLength: this.candlesBuffer.getCandles().length,
      lastValue: this.getValue(),
      lastTimestamp: this.buffer[this.buffer.length - 1]?.timestamp,
      class: this.candlesBuffer?.constructor?.name + ' ',
      buffId: this.candlesBuffer?.id + ' ',
      startTime: timeToString(this.candlesBuffer.getCandle(length - 1)?.timestamp) || 'no data',
      ednTime: timeToString(this.candlesBuffer.getCandle(0)?.timestamp) || 'no data',
    };
  }
}
