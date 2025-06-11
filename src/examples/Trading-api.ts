import { globals } from '../lib/core/globals';
import { error, log, trace } from '../lib/core/log';
import { timeToStrHms } from '../lib/utils/date-time';
import { getArgNumber } from '../lib/core/base';
import { Script } from '../lib/script';
import { OrdersBasket } from '../lib/exchange';

/*
This script is example of using API calls in the strategy.
After running this script go to the report and you will see the buttons with the names of the API calls.
You can click on the button to see the result of the API call.
The results will be displayed in the table below the buttons.
 */

class Strategy extends Script {
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

  hedgeMode = true;
  sizeUsd: any;
  symbol: string;
  ordersBasket: OrdersBasket;
  constructor(params: GlobalARGS) {
    super(params);

    this.symbol = this.symbols[0];
    this.sizeUsd = getArgNumber('sizeUsd', 2);
    this.interval = 1000;
  }

  async onOrderChange(order: Order): Promise<void> {
    globals.report.tableUpdate('onOrderChange', order, 'uid');
  }

  onInit = async () => {
    this.ordersBasket = new OrdersBasket({
      hedgeMode: this.hedgeMode,
      symbol: this.symbols[0],
      connectionName: this.connectionName,
    });

    await this.createButtons();

    await this.ordersBasket.init();

    await globals.report.updateReport();
    log('onInit', 'Open Report To Test API Calls', {}, true);
  };

  createButtons = async () => {
    globals.report.createActionButton('symbolInfo', 'symbolInfo', this.symbol);
    globals.report.createActionButton('tms', 'tms', '1');
    globals.report.createActionButton('volume', 'volume', this.symbol);
    globals.report.createActionButton('ask', 'ask', this.symbol);
    globals.report.createActionButton('bid', 'bid', this.symbol);
    globals.report.createActionButton('close', 'close', this.symbol);
    globals.report.createActionButton('getPositions', 'getPositions', `[${this.symbol}]`);
    globals.report.createActionButton('getHistory', 'getHistory', this.symbol);
    globals.report.createActionButton('createOrder', 'createOrder', this.symbol);
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

  onTick = async () => {
    globals.report.cardSetValue('Close', this.ordersBasket.close());
    globals.report.cardSetValue('Bid', this.ordersBasket.bid());
    globals.report.cardSetValue('Ask', this.ordersBasket.ask());
    globals.report.cardSetValue('Time', timeToStrHms(tms()));

    if (this.iterator % 5 === 0) {
      await globals.report.updateReport();
    }
  };

  log = async () => {
    const error = new Error();
    console.log(error.stack);
  };

  async onReportAction(action: string, data: any) {
    log('onReportAction', 'action', { action: action, data: data }, true);

    let result: any;
    try {
      switch (action) {
        case 'symbolInfo':
          result = await symbolInfo(this.symbol);
          break;
        case 'tms':
          result = tms();
          break;
        case 'close':
          result = close(this.symbol);
          break;
        case 'volume':
          result = volume(this.symbol);
          break;
        case 'ask':
          result = { ask: this.ordersBasket.ask(), askVolume: this.ordersBasket.askVolume() };
          break;
        case 'bid':
          result = bid();
          break;
        case 'getPositions':
          result = await getPositions();
          break;
        case 'getOrders':
          result = await getOrders(this.symbol);
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
          const amount = this.ordersBasket.getContractsAmount(this.sizeUsd);
          result = await this.ordersBasket.buyMarket(amount);
          break;
        }
        case 'createOrder': {
          const amount = this.ordersBasket.getContractsAmount(this.sizeUsd);
          const limitPrice = this.ordersBasket.close() * 0.7;
          result = await this.ordersBasket.createOrder('limit', 'buy', amount, limitPrice, {});
          break;
        }
        case 'buyLimit': {
          const amount = this.ordersBasket.getContractsAmount(this.sizeUsd);
          const limitPrice = this.ordersBasket.close() * 0.7;
          result = await this.ordersBasket.buyLimit(amount, limitPrice);
          break;
        }
        case 'modifyOrder': {
          let amount = this.ordersBasket.getContractsAmount(this.sizeUsd);
          const order = await createOrder(this.symbol, 'limit', 'buy', amount, this.ordersBasket.close(), {
            clientOrderId: 'modifyOrder',
          });
          result = await modifyOrder(order.id, this.symbol, 'limit', 'buy', 0.02, close() - (close() / 100) * 40, {
            clientOrderId: 'modifyOrder',
          });
          break;
        }
        case 'cancelOrder': {
          const amount = this.ordersBasket.getContractsAmount(this.sizeUsd);
          const limitPrice = this.ordersBasket.close() * 0.7;
          const order = await this.ordersBasket.buyLimit(amount, limitPrice);

          result = await this.ordersBasket.cancelOrder(order.id);
          break;
        }
        case 'getOpenOrders':
          result = await getOpenOrders(this.symbol);
          break;
        case 'getClosedOrders':
          result = await getClosedOrders(this.symbol);
          break;
      }

      globals.report.tableUpdate('API Call Results', { method: action, result });
    } catch (e) {
      result = 'Error:' + e.message;
      globals.report.tableUpdate('API Call Results', { method: action, result });
      error(e, { action, result });
    }

    await globals.report.updateReport();
  }

  onStop = async () => {
    await globals.report.updateReport();
  };
}
