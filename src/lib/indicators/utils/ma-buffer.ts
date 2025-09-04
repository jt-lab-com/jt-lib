import { BaseObject } from '../../core/base-object';
import { globals } from '../../core/globals';
import { log } from '../../core/log';

export class MaBuffer extends BaseObject {
  MAX_BUFFER_LENGTH = 500;

  period = 0;
  buffer: number[] = [];
  values: number[] = [];
  sum = 0;
  cnt = 0;

  constructor(period: number, buffer: number[] = []) {
    super();

    this.buffer = buffer;
    this.period = period;
    this.calcFirstValue();
  }

  calcFirstValue(): any {
    if (this.buffer.length < this.period) {
      return { msg: 'Not enough data to calculate' };
    }
    for (let i = 0; i < this.buffer.length; i++) {
      if (i > this.period - 1) {
        this.values.push(this.sum / this.period);
        this.sum += -this.buffer[i - this.period + 1] + this.buffer[i];
      } else {
        this.sum += this.buffer[i];
      }
    }
  }
  addValue(value: number): void {
    if (this.buffer.length >= this.MAX_BUFFER_LENGTH) {
      this.buffer.splice(0, this.buffer.length - Math.floor(this.MAX_BUFFER_LENGTH / 2));
    }

    if (this.values.length >= this.MAX_BUFFER_LENGTH) {
      this.values.splice(0, this.values.length - Math.floor(this.MAX_BUFFER_LENGTH / 2));
    }
    this.buffer.push(value);

    if (this.buffer.length < this.period) {
      return;
    }

    if (this.buffer.length === this.period) {
      this.calcFirstValue();
    } else {
      this.sum += value - this.buffer[this.buffer.length - this.period - 1];

      this.values.push(this.sum / this.period);
    }

    if (this.sum < 0) {
      log(
        'AvgBuffer: sum is negative',
        '',
        {
          sum: this.sum,
          period: this.period,
          bufferLength: this.buffer.length,
          valuesLength: this.values.length,
          buffer: this.buffer,
        },
        true,
      );
      globals.script.forceStop('AvgBuffer: sum is negative');
    }
  }

  getValue(shift = 0): number {
    if (this.buffer.length === 0) return undefined;

    return this.values[this.values.length - 1 - shift];
  }
}
