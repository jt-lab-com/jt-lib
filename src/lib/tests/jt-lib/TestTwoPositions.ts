import { BaseTestLib } from '../BaseTestLib';
import { OrdersBasket } from '../../exchange';
import { log } from '../../core/log';
import { globals } from '../../core/globals';
import { stopTests, testLog, testReport } from '../helpers/testsReport';

export class TestTwoPositions extends BaseTestLib {
  name = 'Test Two Positions (Buy and Sell)';
  private orderBasket: TestTwoPositionsBasket;

  async onInit() {
    await super.onInit();

    this.orderBasket = new TestTwoPositionsBasket({ symbol: this.symbols[0] });
    await this.orderBasket.init();
  }
}

class TestTwoPositionsBasket extends OrdersBasket {
  iterator = 0;
  buyOrder: Order;
  sellOrder: Order;
  sizeUsd = 100;
  private orderStates: Array<{ status: string; timestamp: number; order: Order; side: string }> = [];
  private testPassed = false;
  private testFailed = false;
  private buyAmount = 0;
  private sellAmount = 0;

  async onTick(): Promise<void> {
    const amount = this.getContractsAmount(this.sizeUsd);
    this.iterator++;

    switch (this.iterator) {
      case 1:
        // Открываем buy позицию
        this.buyAmount = amount;
        this.buyOrder = await this.buyMarket(amount);

        // Проверяем что ордер размещен успешно
        const buyOrderResult = this.buyOrder && this.buyOrder.id && this.buyOrder.status === 'closed';
        testLog('Checking if buy order was placed successfully', buyOrderResult, {
          order: this.buyOrder,
          amount,
          orderId: this.buyOrder?.id,
          status: this.buyOrder?.status,
        });
        break;

      case 2:
        // Открываем sell позицию
        this.sellAmount = amount;
        this.sellOrder = await this.sellMarket(amount);

        // Проверяем что ордер размещен успешно
        const sellOrderResult = this.sellOrder && this.sellOrder.id && this.sellOrder.status === 'closed';
        testLog('Checking if sell order was placed successfully', sellOrderResult, {
          order: this.sellOrder,
          amount,
          orderId: this.sellOrder?.id,
          status: this.sellOrder?.status,
        });
        break;

      case 3:
        // Ждем выполнения ордеров и проверяем позиции
        await this.checkPositions();
        break;

      case 4:
        stopTests();
    }
  }

  async onOrderChange(order: Order): Promise<void> {
    // Записываем состояние ордера
    this.orderStates.push({
      status: order.status,
      timestamp: Date.now(),
      order: { ...order },
      side: order.side,
    });
    globals.report.tableUpdate('onOrderChange', { ...order }, '_id');

    // Проверяем статус ордера
    const statusResult = order.status === 'closed';
    testLog(`Checking if ${order.side} order status is closed`, statusResult, {
      orderId: order.id,
      status: order.status,
      side: order.side,
      amount: order.amount,
      filled: order.filled,
    });

    // Проверяем заполненность ордера
    const filledResult = Math.abs(order.filled - order.amount) < 0.0001;
    testLog(`Checking if ${order.side} order is fully filled`, filledResult, {
      orderId: order.id,
      expectedAmount: order.amount,
      actualFilled: order.filled,
      difference: Math.abs(order.filled - order.amount),
      tolerance: 0.0001,
    });
  }

  private async checkPositions() {
    try {
      // Получаем актуальные позиции
      const positions = await this.getPositions();
      const longPosition = positions.find((pos) => pos.side === 'long');
      const shortPosition = positions.find((pos) => pos.side === 'short');

      testLog('Retrieving positions from exchange', true, {
        totalPositions: positions.length,
        longPosition: longPosition
          ? {
              side: longPosition.side,
              contracts: longPosition.contracts,
              entryPrice: longPosition.entryPrice,
            }
          : null,
        shortPosition: shortPosition
          ? {
              side: shortPosition.side,
              contracts: shortPosition.contracts,
              entryPrice: shortPosition.entryPrice,
            }
          : null,
      });

      // Проверяем что есть обе позиции
      const hasLongPosition = longPosition && longPosition.contracts > 0;
      const hasShortPosition = shortPosition && shortPosition.contracts > 0;

      // Проверяем наличие обеих позиций
      const bothPositionsExist = hasLongPosition && hasShortPosition;
      testLog('Checking if both positions exist', bothPositionsExist, {
        hasLongPosition,
        hasShortPosition,
        longContracts: longPosition?.contracts || 0,
        shortContracts: shortPosition?.contracts || 0,
      });

      if (!bothPositionsExist) {
        return;
      }

      // Проверяем соответствие размеров позиций размерам ордеров
      const longAmountMatch = Math.abs(longPosition.contracts - this.buyAmount) < 0.0001;
      const shortAmountMatch = Math.abs(shortPosition.contracts - this.sellAmount) < 0.0001;

      testLog('Checking if position amounts match order amounts', longAmountMatch, {
        expectedBuyAmount: this.buyAmount,
        actualLongContracts: longPosition.contracts,
        difference: Math.abs(longPosition.contracts - this.buyAmount),
        tolerance: 0.0001,
      });

      testLog('Checking if position amounts match order amounts', shortAmountMatch, {
        expectedSellAmount: this.sellAmount,
        actualShortContracts: shortPosition.contracts,
        difference: Math.abs(shortPosition.contracts - this.sellAmount),
        tolerance: 0.0001,
      });

      const testPassed = longAmountMatch && shortAmountMatch;

      testLog('Final test result - both positions opened with correct amounts', testPassed, {
        buyOrderAmount: this.buyAmount,
        longPositionContracts: longPosition.contracts,
        longAmountMatch,
        sellOrderAmount: this.sellAmount,
        shortPositionContracts: shortPosition.contracts,
        shortAmountMatch,
        longEntryPrice: longPosition.entryPrice,
        shortEntryPrice: shortPosition.entryPrice,
      });
    } catch (error) {
      testLog('Error occurred while checking positions', false, { error: error.message });
    }
  }
}
