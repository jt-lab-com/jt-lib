import { BaseTestLib } from '../BaseTestLib';
import { OrdersBasket } from '../../exchange';
import { log } from '../../core/log';
import { globals } from '../../core/globals';
import { stopTests, testLog, testReport } from '../helpers/testsReport';

export class TestBuyMarket extends BaseTestLib {
  name = 'Test Buy Market Order';
  private orderBasket: TestOrderBasket;

  async onInit() {
    await super.onInit();

    this.orderBasket = new TestOrderBasket({ symbol: this.symbols[0] });
    await this.orderBasket.init();
  }
}

class TestOrderBasket extends OrdersBasket {
  iterator = 0;
  order: Order;
  sizeUsd = 100;
  private orderStates: Array<{ status: string; timestamp: number; order: Order }> = [];
  private testPassed = false;
  private testFailed = false;

  async onTick(): Promise<void> {
    const amount = this.getContractsAmount(this.sizeUsd);
    this.iterator++;

    switch (this.iterator) {
      case 1:
        this.order = await this.buyMarket(amount);
        testLog('Placed market buy order', true, { order: this.order });
        break;

      case 2:
        this.checkTestLogic();
        break;
      case 3:
        stopTests();
    }
  }

  async onOrderChange(order: Order): Promise<void> {
    // Записываем состояние ордера
    this.orderStates.push({
      status: order.status,
      timestamp: Date.now(),
      order: { ...order },
    });
    globals.report.tableUpdate('onOrderChange', { ...order }, '_id');
  }

  private checkTestLogic() {
    // Тест должен пройти, если:
    // 1. Первый ордер имеет статус 'open'
    // 2. Второй ордер имеет статус 'closed' с тем же ID
    if (this.orderStates.length >= 2) {
      const firstOrder = this.orderStates[0];
      const secondOrder = this.orderStates[1];

      const testPassed =
        firstOrder.status === 'open' && secondOrder.status === 'closed' && firstOrder.order.id === secondOrder.order.id;

      testLog('Market buy order opened and closed successfully', testPassed, {
        firstOrder: firstOrder,
        secondOrder: secondOrder,
        totalStates: this.orderStates.length,
      });
    }

    // Проверяем на ошибки
    const hasError = this.orderStates.some((state) => state.order.error);
    if (hasError && !this.testFailed) {
      this.testFailed = true;
      const errorOrder = this.orderStates.find((state) => state.order.error);

      testLog('Order error occurred', false, {
        error: errorOrder?.order.error,
        order: errorOrder?.order,
      });
    }
  }
}
