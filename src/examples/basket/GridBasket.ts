import { OrdersBasket } from '../../lib/exchange';
import { getArgNumber } from '../../lib/core/base';
import { percentDifference } from '../../lib/utils/numbers';

export class GridBasket extends OrdersBasket {
  usdSize: number = getArgNumber('usdSize', 100);
  gridStepPercent = getArgNumber('gridStepPercent', 10);
  basketProfit = getArgNumber('basketProfit', 5); // 10%

  async init() {
    await super.init();

    if (this.isInit) {
      let orders = await this.getOpenOrders();

      if ((await this.getPositionBySide('long')).contracts === 0) {
        await this.buyMarket(this.getContractsAmount(this.usdSize));
      }

      if (orders.length === 0) {
        await this.createLimitByStep();
      }
    }
  }

  async onTick() {
    let position = await this.getPositionBySide('long');

    if (position.entryPrice && percentDifference(this.close(), position.entryPrice) > this.basketProfit) {
      // trace('GribBasket:onTick', 'Close position', {
      //   position,
      //   close: this.close(),
      //   posPrice: position.entryPrice,
      //   s: this.close() - position.entryPrice,
      //   diff: percentDifference(this.close(), position.entryPrice),
      // });
      await this.closePosition('long');
      await this.cancelAllOrders();
      await this.buyMarket(this.getContractsAmount(this.usdSize));
      await this.createLimitByStep();
    }
  }

  async onOrderChange(order: Order) {
    if (order.status === 'closed' && order.reduceOnly === false && order.type === 'limit') {
      //warning('createLimitByStep', '', { order });
      await this.createLimitByStep();
    }
  }

  async createLimitByStep() {
    let triggerPrice = this.close() * (1 - this.gridStepPercent / 100);
    let amount = this.getContractsAmount(this.usdSize);
    let order = await this.buyLimit(amount, triggerPrice);
  }
}
