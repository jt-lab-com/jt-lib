import { StandardReportLayout } from '../lib/report/layouts/standart.report.layout';
import { globals } from '../lib/core/globals';
import { currentTime } from '../lib/utils/date-time';
import { BaseScript } from '../lib/script/base-script';
import { OrdersBasket } from '../lib/exchange';
import { getArgNumber } from '../lib/core/base';
import { percentDifference } from '../lib/utils/numbers';
import { BaseError } from '../lib/core/errors';

/*
Multi-coin grid strategy example.
Strategy logic is based in the GridBasket class.

Parameters:
 sizeUsd - size of first opening order in USD.
 gridStepPercent - step between orders in percent.
 minProfitPercent - profit percent to fix profit and close position all.

Strategy:

1. Create a basket for each symbol.
2. Start new round -> open long position with market order with sizeUsd.
3. Create limit orders with gridStepPercent.

After that, we have 2 ways
  a. - Price goes up and we have profit and close round.
  b. - Price goes down and we open new orders with gridStepPercent and wait for price to go up again and close round.

*/

class Script extends BaseScript {
  // Define script parameters with default values
  static definedArgs = [
    {
      key: 'symbols',
      defaultValue: 'BCH/USDT,BTC/USDT,ADA/USDT,ETH/USDT,XRP/USDT,TRX/USDT,SOL/USDT,LTC/USDT,BNB/USDT,DOGE/USDT',
    },
    {
      key: 'sizeUsd',
      defaultValue: 100,
    },
    {
      key: 'gridStepPercent',
      defaultValue: 5,
    },
    {
      key: 'tpPercent',
      defaultValue: 2,
    },
  ];

  // Script metadata
  name = 'Grid Bot Example';
  description = 'Multi-coin grid strategy example. Strategy logic is based in the GridBasket class.';
  version = 11;

  // Store baskets for each trading symbol
  baskets: Record<string, GridBasket> = {};
  private reportLayout: StandardReportLayout;

  async onInit() {
    // Initialize standard report layout for displaying results
    this.reportLayout = new StandardReportLayout();

    // Create baskets with delay execution immediately after script starts
    // This prevents issues with exchange connection during initialization
    globals.triggers.addTaskByTime({
      callback: this.createBaskets,
      triggerTime: currentTime() + 60 * 1000, // 1 minute delay
      name: 'createBaskets',
    });
  }

  /**
   * Create a basket for each symbol
   * Each basket manages its own grid strategy independently
   */
  createBaskets = async () => {
    for (const symbol of this.symbols) {
      // Create new GridBasket instance for each symbol
      this.baskets[symbol] = new GridBasket({
        symbol,
        connectionName: this.connectionName,
      });

      // Initialize the basket (connects to exchange, loads position data)
      await this.baskets[symbol].init();
    }
  };
}

/**
 * GridBasket - Implements grid trading strategy
 *
 * Grid strategy works by:
 * 1. Opening a long position at market price
 * 2. Placing limit buy orders below current price at regular intervals
 * 3. When price moves up, closing position for profit
 * 4. When price moves down, limit orders execute, increasing position size
 * 5. When price recovers, closing larger position for profit
 */
export class GridBasket extends OrdersBasket {
  // Strategy parameters
  sizeUsd: number = getArgNumber('sizeUsd', 100); // Initial position size in USD
  gridStepPercent = getArgNumber('gridStepPercent', 10); // Grid step size in percentage
  tpPercent = getArgNumber('tpPercent', 2); // Take profit percentage

  async init() {
    // Initialize parent OrdersBasket
    await super.init();

    if (this.isInit) {
      // If no position exists, start a new trading round
      if ((await this.getPositionBySide('long')).contracts === 0) {
        await this.newRound();
      }
    } else {
      throw new BaseError('init error - super.init() failed');
    }
  }

  /**
   * Start a new trading round
   * Opens initial long position and sets up grid orders
   */
  async newRound() {
    // Open initial long position at market price
    await this.buyMarket(this.getContractsAmount(this.sizeUsd));

    // Create first grid order below current price
    await this.createLimitByStep();
  }

  /**
   * Close current round and start a new one
   * Closes position, cancels all orders, and starts fresh
   */
  closeRound = async () => {
    // Close the long position
    await this.closePosition('long');

    // Clear all pending limit orders
    await this.cancelAllOrders();

    // Start a new trading round
    await this.newRound();
  };

  /**
   * Called on every price tick
   * Checks if take profit condition is met
   */
  async onTick() {
    const position = await this.getPositionBySide('long');

    // Check if current price is above take profit level
    if (position.entryPrice && percentDifference(position.entryPrice, this.close()) > this.tpPercent) {
      await this.closeRound();
    }
  }

  /**
   * Called when order status changes
   * Creates new grid orders when limit orders are filled
   */
  async onOrderChange(order: Order) {
    // When a limit buy order is filled (not a reduce-only order)
    if (order.status === 'closed' && order.reduceOnly === false && order.type === 'limit') {
      // Create next grid order at lower price
      await this.createLimitByStep();
    }
  }

  /**
   * Create a limit buy order at grid step below current price
   * This order will execute if price drops, increasing position size
   */
  async createLimitByStep() {
    // Calculate trigger price (grid step below current price)
    const triggerPrice = this.close() * (1 - this.gridStepPercent / 100);

    // Get current position size
    const position = await this.getPositionBySide('long');
    const amount = position.contracts;

    // Place limit buy order
    await this.buyLimit(amount, triggerPrice);
  }
}
