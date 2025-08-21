import { globals } from '../lib/core/globals';
import { error, log, trace } from '../lib/core/log';
import { timeCurrent, timeToStrHms } from '../lib/utils/date-time';
import { getArgNumber } from '../lib/core/base';
import { OrdersBasket } from '../lib/exchange';
import { BaseScript } from '../lib/script';
import { sleep } from '../lib/utils/misc';

/*
This script is an example of using API calls in the strategy.
After running this script, go to the report, and you will see the buttons with the names of the API calls.
You can click on the button to see the result of the API call.
The results will be displayed in the table below the buttons.
 */

class Script extends BaseScript {
  static definedArgs = [
    {
      key: 'symbols',
      defaultValue: 'XRP/USDT:USDT',
    },
    {
      key: 'sizeUsd',
      defaultValue: 5,
    },
    {
      key: 'isDebug',
      defaultValue: 'True',
    },
  ];

  hedgeMode = true;
  /*
   * Size in USD for market & limit orders.
   */
  sizeUsd: any;
  symbol: string;
  ob: OrdersBasket;
  constructor(params: GlobalARGS) {
    super(params);

    this.symbol = this.symbols[0];
    this.sizeUsd = getArgNumber('sizeUsd', 2);
  }

  onInit = async () => {
    //Create a new OrdersBasket instance
    this.ob = new OrdersBasket({
      hedgeMode: this.hedgeMode,
      symbol: this.symbols[0],
      connectionName: this.connectionName,
      triggerType: 'exchange',
    });
    await this.ob.init();

    globals.report.setTitle('Trading API Example');
    globals.report.createText(
      'info1',
      `Exchange: ${this.connectionName}, Symbol: ${this.symbol}, Hedge Mode: ${this.hedgeMode}`,
      { align: 'center', variant: 'h4' },
    );
    await this.createButtons();

    await globals.report.updateReport();
  };

  async onOrderChange(order: Order): Promise<void> {
    globals.report.tableUpdate('onOrderChange', { ...order, info: undefined }, 'uid');
    // log('onOrderChange', 'Order Changed ' + order.status, order, true);
  }

  async onReportAction(action: string, data: any) {
    log('onReportAction', 'action', { action: action, data: data }, true);

    let result: any;
    try {
      switch (action) {
        case 'symbolInfo':
          result = await this.ob.getSymbolInfo();
          break;
        case 'tms':
          result = timeCurrent();
          break;
        case 'price':
          result = this.ob.price();
          break;
        case 'volume':
          result = this.ob.volume();
          break;
        case 'ask':
          result = { ask: this.ob.ask(), askVolume: this.ob.askVolume() };
          break;
        case 'bid':
          result = { bid: this.ob.bid(), bidVolume: this.ob.bidVolume() };
          break;
        case 'getPositions':
          result = await this.ob.getPositions();
          break;
        case 'getOrders':
          result = this.ob.getOrders();
          break;
        case 'getBalance':
          result = await getBalance();
          break;
        case 'getProfit':
          result = await getProfit();
          break;
        case 'getHistory':
          const timeFrom = tms() - 1000 * 60 * 60 * 24 * 7; // 7 days
          result = await getHistory(this.symbol, '1m', timeFrom, 10);
          log('getHistory', '', result);
          break;
        case 'buyMarket': {
          const amount = this.ob.getContractsAmount(this.sizeUsd);
          result = await this.ob.buyMarket(amount);
          break;
        }
        case 'createOrder': {
          const amount = this.ob.getContractsAmount(this.sizeUsd);
          const limitPrice = this.ob.close() * 0.7;
          result = await this.ob.createOrder('limit', 'buy', amount, limitPrice, {});
          break;
        }
        case 'buyLimit': {
          const amount = this.ob.getContractsAmount(this.sizeUsd);
          const limitPrice = this.ob.close() * 0.7;
          result = await this.ob.buyLimit(amount, limitPrice);
          break;
        }
        case 'modifyOrder': {
          const amount = this.ob.getContractsAmount(this.sizeUsd);
          const limitPrice = this.ob.close() * 0.7;

          await sleep(1000); // wait for the order to be created

          const order = await this.ob.buyLimit(amount, limitPrice);
          result = await this.ob.modifyOrder(order.id, 'limit', 'buy', amount, limitPrice * 1.05);
          break;
        }
        case 'cancelOrder': {
          const amount = this.ob.getContractsAmount(this.sizeUsd);
          const limitPrice = this.ob.close() * 0.7;
          const order = await this.ob.buyLimit(amount, limitPrice);

          result = await this.ob.cancelOrder(order.id);
          break;
        }
        case 'getOpenOrders':
          result = await getOpenOrders(this.symbol);
          break;
        case 'getClosedOrders':
          result = await getClosedOrders(this.symbol);
          break;
        case 'BuySlTp': {
          const amount = this.ob.getContractsAmount(this.sizeUsd);
          const percent = 0.05; // 1%
          const sl = this.ob.price() * (1 - percent);
          const tp = this.ob.price() * (1 + percent);
          result = await this.ob.buyMarket(amount, tp, sl);
        }
      }

      globals.report.tableUpdate('API Call Results', { method: action, result });
    } catch (e) {
      result = 'Error:' + e.message;
      globals.report.tableUpdate('API Call Results', { method: action, result });
      error(e, { action, result });
    }

    await globals.report.updateReport();
  }
  createButtons = async () => {
    globals.report.createActionButton('Open SL TP', 'BuySlTp', this.symbol);
    globals.report.createActionButton('symbolInfo', 'symbolInfo', this.symbol);
    globals.report.createActionButton('tms', 'tms', '1');
    globals.report.createActionButton('volume', 'volume', this.symbol);
    globals.report.createActionButton('ask', 'ask', this.symbol);
    globals.report.createActionButton('bid', 'bid', this.symbol);
    globals.report.createActionButton('price', 'close', this.symbol);
    globals.report.createActionButton('getPositions', 'getPositions', `[${this.symbol}]`);
    globals.report.createActionButton('getHistory', 'getHistory', this.symbol);
    globals.report.createActionButton('buyLimit', 'buyLimit', this.symbol);
    globals.report.createActionButton('buyMarket', 'buyMarket', this.symbol);
    globals.report.createActionButton('modifyOrder', 'modifyOrder', this.symbol);
    globals.report.createActionButton('cancelOrder', 'cancelOrder', this.symbol);
    globals.report.createActionButton('getOpenOrders', 'getOpenOrders', this.symbol);
    globals.report.createActionButton('getClosedOrders', 'getClosedOrders', this.symbol);
    globals.report.createActionButton('getBalance', 'getBalance', '');

    log('createButtons', 'Buttons Created', {}, true);
  };

  onCallback = async (...args) => {
    trace('onCallback', 'onCallback', { args: args });
    await globals.report.updateReport();
  };

  async onEvent(event: string, data: any): Promise<void> {
    globals.report.tableUpdate('onEvent', { event, data }, 'uid');

    await globals.report.updateReport();
  }

  async onTick(data) {
    globals.report.cardSetValue('Close', this.ob.close());
    globals.report.cardSetValue('Bid', this.ob.bid());
    globals.report.cardSetValue('Ask', this.ob.ask());
    globals.report.cardSetValue('Time', timeToStrHms(tms()));

    if (this.iterator % 5 === 0) {
      await globals.report.updateReport();
    }
  }

  onStop = async () => {
    await globals.report.updateReport();
  };
}
