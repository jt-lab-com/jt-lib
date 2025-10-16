import { BaseObject } from '../../core/base-object';
import { globals } from '../../core/globals';
import { error, log } from '../../core/log';
import { BaseError } from '../../core/errors';
import { isRealNumber } from '../../utils/numbers';

export class MaBuffer extends BaseObject {
  MAX_BUFFER_LENGTH = 500;

  period = 0;
  buffer: number[] = [];
  maValues: number[] = [];
  sum = 0;
  cnt = 0;

  constructor(period: number, buffer: number[] = []) {
    super();

    this.buffer = [...buffer]; // создаем копию буфера
    this.period = period;

    // Если в буфере уже есть данные, рассчитываем сумму и первое значение
    if (this.buffer.length >= this.period) {
      for (let i = 0; i < buffer.length; i++) {
        this.onCalculate(this.buffer[i]);
      }
    }
  }

  getInfo(): any {
    return {
      period: this.period,
      bufferLength: this.buffer.length,
      valuesLength: this.maValues.length,
      sum: this.sum,
      buffer: this.buffer.slice(-10),
    };
  }
  onCalculate(value): void {
    this.buffer.push(value);
    // Если буфер еще не заполнен до периода, просто накапливаем сумму
    if (this.buffer.length <= this.period) {
      this.sum += this.buffer[this.buffer.length - 1];
      if (this.buffer.length === this.period) {
        this.maValues.push(this.sum / this.period);
      } else {
        this.maValues.push(undefined);
      }
    } else {
      const prevValue = this.buffer[this.buffer.length - 1 - this.period];
      const newValue = this.buffer[this.buffer.length - 1];
      this.sum = this.sum - prevValue + newValue;
      this.maValues.push(this.sum / this.period);
    }
    if (!isRealNumber(this.sum)) {
      //debugger;
      throw new BaseError('AvgBuffer: sum is NaN', this.getInfo());
    }
    // if (this.sum < 0) {
    //   error('AvgBuffer: sum is negative', '', this.getInfo());
    //   //globals.script.forceStop('AvgBuffer: sum is negative');
    //   debugger;
    // }

    if (this.buffer.length >= this.MAX_BUFFER_LENGTH) {
      this.buffer.splice(0, this.buffer.length - Math.floor(this.MAX_BUFFER_LENGTH / 2));
      this.maValues.splice(0, this.maValues.length - Math.floor(this.MAX_BUFFER_LENGTH / 2));
    }
  }
  getValues(): number[] {
    return this.maValues;
  }
  addValue(value: number): void {
    if (!isRealNumber(value)) {
      error('MaBuffer:addValue value is not a real number', '', { ...this.getInfo(), value });
      return;
    }
    this.onCalculate(value);
  }

  getValue(shift = 0): number {
    return this.maValues[this.maValues.length - 1 - shift];
  }
}
