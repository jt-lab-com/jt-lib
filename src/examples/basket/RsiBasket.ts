import { OrdersBasket } from '../../lib/exchange';
import { globals } from '../../lib/core/globals';
import { RelativeStrengthIndex } from '../../lib/indicators';
import { getArgNumber } from '../../lib/core/base';
import { log } from '../../lib/core/log';

export class RsiBasket extends OrdersBasket {
  private rsi14: RelativeStrengthIndex;
  usdSize: number = getArgNumber('usdSize', 100);
  tpPercent: number = getArgNumber('tpPercent', 5) / 100;
  slPercent: number = getArgNumber('slPercent', 10) / 100;
  isPositionOpened: boolean = false;

  async init() {
    await super.init();
    this.rsi14 = await globals.indicators.rsi(this.symbol, '1h', 11);

    log('RsiBasket', 'onInit', { keys: Object.keys(this.rsi14) }, true);
  }

  async onTick() {
    if (this.isPositionOpened) return;
    let signal = this.signal();
    if (signal === 0) return;

    if (signal === 1) {
      let amount = this.getContractsAmount(this.usdSize);
      let takeProfit = this.close() * (1 + this.tpPercent);
      let stopLoss = this.close() * (1 - this.slPercent);

      await this.buyMarket(amount, takeProfit, stopLoss);
      this.isPositionOpened = true;
    }

    if (signal === -1) {
      let amount = this.getContractsAmount(this.usdSize);
      let takeProfit = this.close() * (1 - this.tpPercent);
      let stopLoss = this.close() * (1 + this.slPercent);

      await this.sellMarket(amount, takeProfit, stopLoss);
      this.isPositionOpened = true;
    }
  }

  async onOrderChange(order: Order) {
    if (order.status === 'closed' && order.reduceOnly === true) {
      this.isPositionOpened = false;
    }
  }

  signal() {
    let rsi = this.rsi14.getValue();
    if (rsi < 30) return -1;
    if (rsi > 70) return 1;

    return 0;
  }
}
