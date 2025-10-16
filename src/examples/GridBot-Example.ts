import { StandardReportLayout } from '../lib/report/layouts/standart.report.layout';
import { globals } from '../lib/core/globals';
import { currentTime } from '../lib/utils/date-time';
import { BaseScript } from '../lib/script/base-script';
import { OrdersBasket } from '../lib/exchange';
import { getArgNumber } from '../lib/core/base';
import { percentDifference } from '../lib/utils/numbers';
import { BaseError } from '../lib/core/errors';

/*
Grid Bot - Multi-Symbol Grid Trading Strategy

WHAT IT DOES:
Creates a "grid" of buy orders below current price. When price drops, orders execute and increase position size.
When price goes back up, sells everything for profit and starts over.

HOW IT WORKS:
1. Buy at market price
2. Place limit buy orders every 5% down (gridStepPercent)
3. If price drops: limit orders fill, position gets bigger
4. If price rises 2% (tpPercent): sell everything for profit
5. Start new round

PARAMETERS:
- symbols: trading pairs (default: 10 major coins)
- sizeUsd: position size in dollars (default: 100$)
- gridStepPercent: grid spacing in % (default: 5%)
- tpPercent: profit target in % (default: 2%)

EXAMPLE:
- Buy 0.002 BTC at $50,000
- Place limit order at $47,500 (5% down)
- If price hits $47,500: buy another 0.002 BTC (now 0.004 total)
- If price goes back to $49,000: sell all 0.004 BTC for profit
- Start over
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
      defaultValue: 11,
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
 * GridBasket - Handles grid trading for one symbol
 *
 * SIMPLE WORKFLOW:
 * 1. Buy at market price
 * 2. Place limit buy order 5% below current price
 * 3. If price drops: limit order fills, position doubles
 * 4. Place new limit order 5% below new price
 * 5. If price rises 2%: sell everything for profit
 * 6. Start over
 */
class GridBasket extends OrdersBasket {
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
   * Buy at market price and place first limit order below
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
   * Check if we made enough profit to close position
   */
  async onTick() {
    const position = await this.getPositionBySide('long');

    // Check if current price is above take profit level
    if (position.entryPrice && percentDifference(position.entryPrice, this.close()) > this.tpPercent) {
      await this.closeRound();
    }
  }

  /**
   * When limit order fills, place next grid order below
   */
  async onOrderChange(order: Order) {
    // When a limit buy order is filled (not a reduce-only order)
    if (order.status === 'closed' && order.reduceOnly === false && order.type === 'limit') {
      // Create next grid order at lower price
      await this.createLimitByStep();
    }
  }

  /**
   * Place limit buy order 5% below current price
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
