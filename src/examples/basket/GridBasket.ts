import { OrdersBasket } from '../../lib/exchange';
import { getArgNumber } from '../../lib/core/base';
import { percentDifference } from '../../lib/utils/numbers';

export class GridBasket extends OrdersBasket {
  usdSize: number = getArgNumber('usdSize', 100);
  gridStepPercent = getArgNumber('gridStepPercent', 10);
  minProfitPercent = getArgNumber('minProfitPercent', 2); // 10%

  async init() {
    await super.init();

    if (this.isInit) {
      const orders = await this.getOpenOrders();

      //if no position, that means new round is starting
      if ((await this.getPositionBySide('long')).contracts === 0) {
        await this.newRound();
      }
    }
  }

  async newRound() {
    await this.buyMarket(this.getContractsAmount(this.usdSize));

    await this.createLimitByStep();
  }

  closeRound = async () => {
    await this.closePosition('long');
    //clear all limits orders
    await this.cancelAllOrders();

    // start new round
    await this.newRound();
  };

  async onTick() {
    const position = await this.getPositionBySide('long');

    // check fix profit condition
    if (position.entryPrice && percentDifference(this.close(), position.entryPrice) > this.minProfitPercent) {
      // trace('GribBasket:onTick', 'Close position', {
      //   position,
      //   close: this.close(),
      //   posPrice: position.entryPrice,
      //   s: this.close() - position.entryPrice,
      //   diff: percentDifference(this.close(), position.entryPrice),
      // });
      await this.closeRound();
    }
  }

  async onOrderChange(order: Order) {
    if (order.status === 'closed' && order.reduceOnly === false && order.type === 'limit') {
      //warning('createLimitByStep', '', { order });
      await this.createLimitByStep();
    }
  }

  lastOrder: Order | null = null;
  async createLimitByStep() {
    const triggerPrice = this.close() * (1 - this.gridStepPercent / 100);

    const position = await this.getPositionBySide('long');
    const amount = position.contracts;

    const order = await this.buyLimit(amount, triggerPrice);
  }
}
