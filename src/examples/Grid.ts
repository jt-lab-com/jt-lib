import { StandardReportLayout } from '../lib/report/layouts/standart.report.layout';
import { GridBasket } from './baskets/GridBasket';
import { globals } from '../lib/core/globals';
import { currentTime } from '../lib/utils/date-time';
import { BaseScript } from '../lib/script/base-script';

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
      key: 'minProfitPercent',
      defaultValue: 2,
    },
  ];

  baskets: Record<string, GridBasket> = {};
  private reportLayout: StandardReportLayout;

  async onInit() {
    this.reportLayout = new StandardReportLayout();

    globals.triggers.addTaskByTime({
      callback: this.createBaskets,
      triggerTime: currentTime() + 60 * 1000,
      name: 'createBaskets',
    });
  }

  // Create a basket for each symbol
  createBaskets = async () => {
    for (const symbol of this.symbols) {
      this.baskets[symbol] = new GridBasket({
        symbol,
        connectionName: this.connectionName,
      });

      await this.baskets[symbol].init();
    }
  };
}
