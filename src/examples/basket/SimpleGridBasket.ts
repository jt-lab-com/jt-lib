import { OrdersBasket } from '../../lib/exchange';
import { ExchangeParams } from '../../lib/exchange/types';
import { getArgNumber } from '../../lib/core/base';
import { BaseError } from '../../lib/core/errors';

export class SimpleGridBasket extends OrdersBasket {
  version = '1.0.4';

  gridPercent = 10;
  takeProfitPercent = 10;
  rbFactor = 2;
  sizeUsd = 100;

  nextOpenPrice = 0;
  takeProfitPrice = 0;
  isStopped = false;

  constructor(params: ExchangeParams) {
    super(params);
  }

  getExternalParams() {
    this.gridPercent = getArgNumber('gridPercent', this.gridPercent);
  }

  async init() {
    await super.init();

    this.getExternalParams();
  }

  async onTick() {
    if (this.isStopped) {
      return;
    }

    if (this.nextOpenPrice == 0) {
      this.nextOpenPrice = this.price() * (1 - this.gridPercent / 100);
      let amount = this.getContractsAmount(this.sizeUsd);
      let order = await this.buyMarket(amount);

      if (order) {
        this.nextOpenPrice = order.price * (1 + this.gridPercent / 100);
        await this.calculateTakeProfit();
      } else {
        this.error('Failed to place buy market order', { order });
      }
    }

    if (this.price() > this.nextOpenPrice) {
      let amount = (await this.getPositionBySide('long')).contracts;
      amount = amount * this.rbFactor; // increase amount by rbFactor

      let order = await this.buyMarket(amount);

      if (order) {
        this.nextOpenPrice = order.price * (1 + this.gridPercent / 100);
        await this.calculateTakeProfit();
      } else {
        this.error('Failed to place buy  order', { order });
      }
    }

    if (this.price() > this.takeProfitPrice) {
      await this.closePosition('long');

      let position = await this.getPositionBySide('long', true);
      if (position.contracts > 0) {
        this.error('Failed to close position', { position });
      } else {
        this.takeProfitPrice = 0;
        this.nextOpenPrice = 0;
      }
    }
  }

  /**
   * Calculate take profit for the current position.
   */
  async calculateTakeProfit() {
    let position = await this.getPositionBySide('long', true);

    if (position.contracts > 0) {
      this.takeProfitPrice = position.entryPrice * (1 + this.takeProfitPercent / 100);
      // trace('calculateTakeProfit()', 'Take profit price:' + this.takeProfitPrice, { price: this.price(), position });
    } else {
      this.error('No position to calculate take profit');
    }
  }

  onError(e: BaseError, context: any = {}) {
    this.isStopped = true;
  }
}
