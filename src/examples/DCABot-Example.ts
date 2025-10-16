import { globals } from '../lib/core/globals';
import { log } from '../lib/core/log';
import { currentTime, timeToStrHms } from '../lib/utils/date-time';
import { BaseScript } from '../lib/script/base-script';
import { OrdersBasket } from '../lib/exchange';
import { getArgNumber } from '../lib/core/base';
import { StandardReportLayout } from '../lib/report/layouts/standart.report.layout';
import { round } from '../lib/utils/numbers';

/*
DCA Bot - Dollar Cost Averaging Strategy

WHAT IS IT:
DCA (Dollar Cost Averaging) - a strategy of regular purchases for a fixed amount.
Instead of trying to guess the optimal entry moment, the bot buys assets at regular intervals.

HOW IT WORKS:
1. Registers 'dcaPurchase' handler for executing purchases
2. Creates a periodic task that triggers every intervalHours hours
3. On each trigger, buys assets for sizeUsd amount in dollars
4. Uses market orders for guaranteed execution

PARAMETERS:
- symbols: trading pair (default: 'BTC/USDT:USDT')
- sizeUsd: purchase amount in dollars (default: 100$)
- intervalDays : purchase interval in days (default: 7 days)

ADVANTAGES:
- Removes emotions from trading
- Smooths out price volatility
- Simple and reliable strategy
- Suitable for long-term accumulation

IMPLEMENTATION FEATURES:
- Uses OrdersBasket for order management
- Task restores after restart (canReStore: true)
- Logs every purchase with details
- Integrated with reporting system
*/

class Script extends BaseScript {
  static definedArgs = [
    { key: 'symbols', defaultValue: 'BTC/USDT:USDT' },
    { key: 'sizeUsd', defaultValue: 100 },
    { key: 'intervalDays', defaultValue: 7 },
  ];

  dcaBasket: OrdersBasket;
  sizeUsd = getArgNumber('sizeUsd', 100);
  intervalDays = getArgNumber('intervalDays', 7); // 168 hours = 1 week
  private reportLayout: StandardReportLayout;

  async onInit() {
    // Initialize standard report
    this.reportLayout = new StandardReportLayout();

    // Create basket
    this.dcaBasket = new OrdersBasket({
      symbol: this.symbols[0],
    });
    await this.dcaBasket.init();

    // Register purchase trigger
    globals.triggers.registerTimeHandler('dcaPurchase', this.buyDCA, this);

    // Start regular purchases
    globals.triggers.addTaskByTime({
      name: 'dcaPurchase',
      triggerTime: currentTime() + 60 * 1000, // After 1 minute
      interval: round(this.intervalDays * 60 * 60 * 1000, 0),
    });

    globals.report.setTitle('DCA Bot');
  }

  // Purchase function
  async buyDCA() {
    const amount = this.dcaBasket.getContractsAmount(this.sizeUsd);
    await this.dcaBasket.buyMarket(amount);
    log('DCA purchase completed', `amount: ${amount}, price: ${this.dcaBasket.close()}`);
  }
}
