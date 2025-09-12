import { getArgNumber } from '../lib/core/base';
import { StandardReportLayout } from '../lib/report/layouts/standart.report.layout';
import { BaseScript } from '../lib/script/base-script';
import { OrdersBasket } from '../lib/exchange';
import { RelativeStrengthIndex } from '../lib/indicators';
import { globals } from '../lib/core/globals';
import { log } from '../lib/core/log';

/*
RSI Bot Example

This example demonstrates how to use RSI (Relative Strength Index) indicator
for trading decisions. RSI is a momentum oscillator that measures the speed
and magnitude of price changes.

Strategy Logic:
- Buy when RSI < 30 (oversold condition)
- Sell when RSI > 70 (overbought condition)
- Use stop-loss and take-profit orders for risk management

Parameters:
- sizeUsd: Position size in USD
- tpPercent: Take profit percentage (default 5%)
- slPercent: Stop loss percentage (default 10%)
*/

class Script extends BaseScript {
  // Define script parameters with default values
  static definedArgs = [
    {
      key: 'symbols',
      defaultValue: 'XRP/USDT:USDT',
    },
    {
      key: 'sizeUsd',
      defaultValue: 5,
    },
  ];

  // Strategy configuration
  hedgeMode = true; // Enable hedge mode for futures trading
  sizeUsd: number; // Position size in USD

  // Script metadata
  name = 'RSI Bot Example';
  description = 'RSI Bot Example. Buys when RSI < 30 and sells when RSI > 70';

  // Store RSI baskets for each trading symbol
  baskets: Record<string, RsiBasket> = {};
  private reportLayout: StandardReportLayout;

  constructor(params: GlobalARGS) {
    super(params);

    // Get position size from arguments
    this.sizeUsd = getArgNumber('sizeUsd', 2);
  }

  async onInit() {
    // Initialize standard report layout
    this.reportLayout = new StandardReportLayout();

    // Create a basket for each symbol
    for (const symbol of this.symbols) {
      this.baskets[symbol] = new RsiBasket({ symbol });
      await this.baskets[symbol].init();
    }
  }
}

/**
 * RsiBasket - Implements RSI-based trading strategy
 *
 * RSI Strategy Logic:
 * - RSI < 30: Oversold condition -> Buy signal (signal = 1)
 * - RSI > 70: Overbought condition -> Sell signal (signal = -1)
 * - 30 <= RSI <= 70: No signal (signal = 0)
 */
class RsiBasket extends OrdersBasket {
  // RSI indicator instance
  private rsi14: RelativeStrengthIndex;

  // Strategy parameters
  sizeUsd: number = getArgNumber('sizeUsd', 100); // Position size in USD
  tpPercent: number = getArgNumber('tpPercent', 5) / 100; // Take profit percentage (5%)
  slPercent: number = getArgNumber('slPercent', 10) / 100; // Stop loss percentage (10%)

  // Position tracking
  isPositionOpened = false; // Prevents multiple positions

  async init() {
    // Initialize parent OrdersBasket
    await super.init();

    // Create RSI indicator with 11-period on 1-hour timeframe
    this.rsi14 = await globals.indicators.rsi(this.symbol, '1h', 11);

    log('RsiBasket', 'onInit', { keys: Object.keys(this.rsi14) }, true);
  }

  /**
   * Called on every price tick
   * Analyzes RSI signal and opens positions accordingly
   */
  async onTick() {
    // Skip if position is already open
    if (this.isPositionOpened) return;

    // Get trading signal from RSI
    const signal = this.signal();
    if (signal === 0) return; // No signal

    if (signal === 1) {
      // Buy signal: RSI < 30 (oversold)
      const amount = this.getContractsAmount(this.sizeUsd);
      const takeProfit = this.close() * (1 + this.tpPercent); // TP above entry
      const stopLoss = this.close() * (1 - this.slPercent); // SL below entry

      await this.buyMarket(amount, takeProfit, stopLoss);
      this.isPositionOpened = true;
    }

    if (signal === -1) {
      // Sell signal: RSI > 70 (overbought)
      const amount = this.getContractsAmount(this.sizeUsd);
      const takeProfit = this.close() * (1 - this.tpPercent); // TP below entry
      const stopLoss = this.close() * (1 + this.slPercent); // SL above entry

      await this.sellMarket(amount, takeProfit, stopLoss);
      this.isPositionOpened = true;
    }
  }

  /**
   * Called when order status changes
   * Resets position flag when stop-loss or take-profit orders are executed
   */
  async onOrderChange(order: Order) {
    // When reduce-only order (SL/TP) is closed, position is closed
    if (order.status === 'closed' && order.reduceOnly === true) {
      this.isPositionOpened = false;
    }
  }

  /**
   * Generate trading signal based on RSI value
   * @returns 1 for buy, -1 for sell, 0 for no signal
   */
  signal() {
    const rsi = this.rsi14.getValue();

    if (rsi < 30) return -1; // Oversold -> Buy signal
    if (rsi > 70) return 1; // Overbought -> Sell signal

    return 0; // No signal
  }
}
