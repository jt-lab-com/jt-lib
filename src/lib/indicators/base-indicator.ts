import { BaseObject } from '../core/base-object';
import { trace } from '../core/log';
import { BufferIndicatorItem } from './types';
import type { CandlesBuffer } from '../candles';

export class BaseIndicator extends BaseObject {
  protected readonly symbol: string;
  protected readonly timeframe: string;
  protected candlesBuffer: CandlesBuffer;
  protected buffer: BufferIndicatorItem[] = [];

  notForDestroy = ['candlesBuffer'];

  constructor(symbol: string, timeframe: TimeFrame, buffer: CandlesBuffer) {
    super();
    this.candlesBuffer = buffer;

    trace('Indicator:constructor', '', {
      class: this.candlesBuffer?.constructor?.name + ' ',
      buffId: this.candlesBuffer?.id + ' ',
      symbol: symbol,
      timeframe: timeframe,
    });

    this.symbol = symbol;
    this.timeframe = timeframe;
  }

  clear() {
    this.buffer = [];
  }

  getValue(shift = 0) {
    return this.buffer[this.buffer.length - shift]?.value;
  }

  getIndicatorValues() {
    return this.buffer;
  }

  getInfo() {
    return {
      symbol: this.symbol,
      timeframe: this.timeframe,
      bufferLength: this.buffer.length,
      candlesBufferLength: this.candlesBuffer.getCandles().length,
      lastValue: this.getValue(),
      lastTimestamp: this.buffer[this.buffer.length - 1]?.timestamp,
    };
  }
}
