import { BaseObject } from '../core/base-object';
import { RelativeStrengthIndex } from './rsi';
import { SimpleMovingAverageIndicator } from './sma';
import { globals } from '../core/globals';
import { AverageTrueRange } from './atr';
import { CommodityChannelIndex } from './cci';
import { NormalizedAverageTrueRange } from './natr';

//TODO: add indicators to Dictionary and return existing instance if already created for symbol, timeframe and period
export class Indicators extends BaseObject {
  private _autoUpdate = true;
  set autoUpdate(value: boolean) {
    this._autoUpdate = value;
  }
  get autoUpdate() {
    return this._autoUpdate;
  }

  async rsi(symbol: string, timeframe: TimeFrame, period = 14): Promise<RelativeStrengthIndex> {
    const candlesBuffer = await globals.candlesBufferService.getBuffer({ symbol, timeframe });
    return new RelativeStrengthIndex(candlesBuffer, { symbol, timeframe, period });
  }

  async sma(symbol: string, timeframe: TimeFrame, period = 14): Promise<SimpleMovingAverageIndicator> {
    const candlesBuffer = await globals.candlesBufferService.getBuffer({ symbol, timeframe });
    return new SimpleMovingAverageIndicator(candlesBuffer, { symbol, timeframe, period });
  }

  async atr(symbol: string, timeframe: TimeFrame, period = 14): Promise<AverageTrueRange> {
    const candlesBuffer = await globals.candlesBufferService.getBuffer({ symbol, timeframe });
    return new AverageTrueRange(candlesBuffer, { symbol, timeframe, period });
  }

  async cci(symbol: string, timeframe: TimeFrame, period = 20): Promise<CommodityChannelIndex> {
    const candlesBuffer = await globals.candlesBufferService.getBuffer({ symbol, timeframe });
    return new CommodityChannelIndex(candlesBuffer, { symbol, timeframe, period });
  }

  async natr(symbol: string, timeframe: TimeFrame, period = 14): Promise<NormalizedAverageTrueRange> {
    const candlesBuffer = await globals.candlesBufferService.getBuffer({ symbol, timeframe });
    return new NormalizedAverageTrueRange(candlesBuffer, { symbol, timeframe, period });
  }
}
