import { BaseObject } from '../core/base-object';
import { CandlesBuffer, CandlesBufferOptions } from './candles-buffer';

export class CandlesBufferService extends BaseObject {
  private readonly bufferMap: Record<string, CandlesBuffer> = {};

  async getBuffer(options: CandlesBufferOptions): Promise<CandlesBuffer> {
    const { symbol, timeframe } = options;
    const key = `${symbol}-${timeframe}`;

    if (this.bufferMap[key]) return this.bufferMap[key];

    const buffer = new CandlesBuffer(options);
    await buffer.initialize();

    this.bufferMap[key] = buffer;

    return buffer;
  }
}
