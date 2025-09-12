import { globals } from '../lib/core/globals';
import { error, log, trace } from '../lib/core/log';
import { timeCurrent, timeToStrHms } from '../lib/utils/date-time';
import { getArgNumber } from '../lib/core/base';
import { OrdersBasket } from '../lib/exchange';
import { BaseScript } from '../lib/script/base-script';
import { sleep } from '../lib/utils/misc';
import { StandardReportLayout } from '../lib/report/layouts';

/*
Trading API Callback Example

This script demonstrates how to use callback functions with action buttons.
Instead of handling actions through onReportAction, buttons directly call callback functions.

Key differences from Trading-api.ts:
- Buttons accept callback functions directly as 4th parameter
- No need for onReportAction method
- More direct and cleaner code structure
- Each button has its own dedicated callback function
- Better separation of concerns - each action is isolated

Usage:
- createActionButton(label, action, payload, callback)
- callback receives { action, value } parameters
- callback is called directly when button is clicked
- No need to handle all actions in one switch statement


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
  sizeUsd: any;
  symbol: string;
  orderBasket: OrdersBasket;
  private reportLayout: StandardReportLayout;

  constructor(params: GlobalARGS) {
    super(params);

    this.symbol = this.symbols[0];
    this.sizeUsd = getArgNumber('sizeUsd', 2);
  }

  onInit = async () => {
    // Create a new OrdersBasket instance
    this.orderBasket = new OrdersBasket({
      hedgeMode: this.hedgeMode,
      symbol: this.symbols[0],
      connectionName: this.connectionName,
      triggerType: 'exchange',
    });
    await this.orderBasket.init();

    globals.report.setTitle('Trading API Callback Example');
    globals.report.createText(
      'info1',
      `Exchange: ${this.connectionName}, Symbol: ${this.symbol}, Hedge Mode: ${this.hedgeMode}`,
      {
        align: 'center',
        variant: 'h4',
      },
    );

    this.reportLayout = new StandardReportLayout();
    await this.createButtonsWithCallbacks();
  };

  async onOrderChange(order: Order): Promise<void> {
    globals.report.tableUpdate('onOrderChange', { ...order, info: undefined }, 'uid');
  }
  createButtonsWithCallbacks = async () => {
    // Market data buttons
    globals.report.createActionButton('Symbol Info', 'symbolInfo', this.symbol, this.symbolInfoCallback);
    globals.report.createActionButton('Current Time', 'tms', '1', this.tmsCallback);
    globals.report.createActionButton('Current Price', 'price', this.symbol, this.priceCallback);
    globals.report.createActionButton('Volume', 'volume', this.symbol, this.volumeCallback);
    globals.report.createActionButton('Ask Price', 'ask', this.symbol, this.askCallback);
    globals.report.createActionButton('Bid Price', 'bid', this.symbol, this.bidCallback);

    // Account data buttons
    globals.report.createActionButton('Get Positions', 'getPositions', `[${this.symbol}]`, this.getPositionsCallback);
    globals.report.createActionButton('Get Orders', 'getOrders', this.symbol, this.getOrdersCallback);
    globals.report.createActionButton('Get Balance', 'getBalance', '', this.getBalanceCallback);
    globals.report.createActionButton('Get Profit', 'getProfit', '', this.getProfitCallback);
    globals.report.createActionButton('Get History', 'getHistory', this.symbol, this.getHistoryCallback);

    // Trading buttons
    globals.report.createActionButton('Buy Market', 'buyMarket', this.symbol, this.buyMarketCallback);
    globals.report.createActionButton('Buy Limit', 'buyLimit', this.symbol, this.buyLimitCallback);
    globals.report.createActionButton('Create Order', 'createOrder', this.symbol, this.createOrderCallback);
    globals.report.createActionButton('Modify Order', 'modifyOrder', this.symbol, this.modifyOrderCallback);
    globals.report.createActionButton('Cancel Order', 'cancelOrder', this.symbol, this.cancelOrderCallback);

    // Order management buttons
    globals.report.createActionButton('Get Open Orders', 'getOpenOrders', this.symbol, this.getOpenOrdersCallback);
    globals.report.createActionButton(
      'Get Closed Orders',
      'getClosedOrders',
      this.symbol,
      this.getClosedOrdersCallback,
    );

    // Advanced trading buttons
    // globals.report.createActionButton('Buy with SL/TP', 'BuySlTp', this.symbol, this.buySlTpCallback);

    log('createButtonsWithCallbacks', 'Buttons with callbacks created', {}, true);
  };
  // Callback functions for each button
  private symbolInfoCallback = async () => {
    try {
      const result = await this.orderBasket.getSymbolInfo();
      globals.report.tableUpdate('API Call Results', { method: 'symbolInfo', result });
      await globals.report.updateReport();
    } catch (e) {
      await this.handleError('symbolInfo', e);
    }
  };

  private tmsCallback = async () => {
    try {
      const result = timeCurrent();
      globals.report.tableUpdate('API Call Results', { method: 'tms', result });
      await globals.report.updateReport();
    } catch (e) {
      await this.handleError('tms', e);
    }
  };

  private priceCallback = async () => {
    try {
      const result = this.orderBasket.price();
      globals.report.tableUpdate('API Call Results', { method: 'price', result });
      await globals.report.updateReport();
    } catch (e) {
      await this.handleError('price', e);
    }
  };

  private volumeCallback = async () => {
    try {
      const result = this.orderBasket.volume();
      globals.report.tableUpdate('API Call Results', { method: 'volume', result });
      await globals.report.updateReport();
    } catch (e) {
      await this.handleError('volume', e);
    }
  };

  private askCallback = async () => {
    try {
      const result = { ask: this.orderBasket.ask(), askVolume: this.orderBasket.askVolume() };
      globals.report.tableUpdate('API Call Results', { method: 'ask', result });
      await globals.report.updateReport();
    } catch (e) {
      await this.handleError('ask', e);
    }
  };

  private bidCallback = async () => {
    try {
      const result = { bid: this.orderBasket.bid(), bidVolume: this.orderBasket.bidVolume() };
      globals.report.tableUpdate('API Call Results', { method: 'bid', result });
      await globals.report.updateReport();
    } catch (e) {
      await this.handleError('bid', e);
    }
  };

  private getPositionsCallback = async () => {
    try {
      const result = await this.orderBasket.getPositions();
      globals.report.tableUpdate('API Call Results', { method: 'getPositions', result });
      await globals.report.updateReport();
    } catch (e) {
      await this.handleError('getPositions', e);
    }
  };

  private getOrdersCallback = async () => {
    try {
      const result = this.orderBasket.getOrders();
      globals.report.tableUpdate('API Call Results', { method: 'getOrders', result });
      await globals.report.updateReport();
    } catch (e) {
      await this.handleError('getOrders', e);
    }
  };

  private getBalanceCallback = async () => {
    try {
      const result = await getBalance();
      globals.report.tableUpdate('API Call Results', { method: 'getBalance', result });
      await globals.report.updateReport();
    } catch (e) {
      await this.handleError('getBalance', e);
    }
  };

  private getProfitCallback = async () => {
    try {
      const result = await getProfit();
      globals.report.tableUpdate('API Call Results', { method: 'getProfit', result });
      await globals.report.updateReport();
    } catch (e) {
      await this.handleError('getProfit', e);
    }
  };

  private getHistoryCallback = async () => {
    try {
      const timeFrom = tms() - 1000 * 60 * 60 * 24 * 7; // 7 days
      const result = await getHistory(this.symbol, '1m', timeFrom, 10);
      log('getHistory', '', result);
      globals.report.tableUpdate('API Call Results', { method: 'getHistory', result });
      await globals.report.updateReport();
    } catch (e) {
      await this.handleError('getHistory', e);
    }
  };

  private buyMarketCallback = async () => {
    try {
      const amount = this.orderBasket.getContractsAmount(this.sizeUsd);
      const result = await this.orderBasket.buyMarket(amount);
      globals.report.tableUpdate('API Call Results', { method: 'buyMarket', result });
      await globals.report.updateReport();
    } catch (e) {
      await this.handleError('buyMarket', e);
    }
  };

  private createOrderCallback = async () => {
    try {
      const limitPrice = this.orderBasket.close() * 0.7;
      const amount = this.orderBasket.getContractsAmount(this.sizeUsd, limitPrice);
      const result = await this.orderBasket.createOrder('limit', 'buy', amount, limitPrice, {});
      globals.report.tableUpdate('API Call Results', { method: 'createOrder', result });
      await globals.report.updateReport();
    } catch (e) {
      await this.handleError('createOrder', e);
    }
  };

  private buyLimitCallback = async () => {
    try {
      const limitPrice = this.orderBasket.close() * 0.7;
      const amount = this.orderBasket.getContractsAmount(this.sizeUsd, limitPrice);
      const result = await this.orderBasket.buyLimit(amount, limitPrice);
      globals.report.tableUpdate('API Call Results', { method: 'buyLimit', result });
      await globals.report.updateReport();
    } catch (e) {
      await this.handleError('buyLimit', e);
    }
  };

  private modifyOrderCallback = async () => {
    try {
      const limitPrice = this.orderBasket.close() * 0.7;
      const amount = this.orderBasket.getContractsAmount(this.sizeUsd, limitPrice);

      await sleep(1000); // wait for the order to be created

      const order = await this.orderBasket.buyLimit(amount, limitPrice);
      const result = await this.orderBasket.modifyOrder(order.id, 'limit', 'buy', amount, limitPrice * 1.05);
      globals.report.tableUpdate('API Call Results', { method: 'modifyOrder', result });
      await globals.report.updateReport();
    } catch (e) {
      await this.handleError('modifyOrder', e);
    }
  };

  private cancelOrderCallback = async () => {
    try {
      const limitPrice = this.orderBasket.close() * 0.7;
      const amount = this.orderBasket.getContractsAmount(this.sizeUsd, limitPrice);
      const order = await this.orderBasket.buyLimit(amount, limitPrice);

      const result = await this.orderBasket.cancelOrder(order.id);
      globals.report.tableUpdate('API Call Results', { method: 'cancelOrder', result });
      await globals.report.updateReport();
    } catch (e) {
      await this.handleError('cancelOrder', e);
    }
  };

  private getOpenOrdersCallback = async () => {
    try {
      const result = await getOpenOrders(this.symbol);
      globals.report.tableUpdate('API Call Results', { method: 'getOpenOrders', result });
      await globals.report.updateReport();
    } catch (e) {
      await this.handleError('getOpenOrders', e);
    }
  };

  private getClosedOrdersCallback = async () => {
    try {
      const result = await getClosedOrders(this.symbol);
      globals.report.tableUpdate('API Call Results', { method: 'getClosedOrders', result });
      await globals.report.updateReport();
    } catch (e) {
      await this.handleError('getClosedOrders', e);
    }
  };

  // Helper method for error handling
  private handleError = async (method: string, e: any) => {
    const result = 'Error: ' + e.message;
    globals.report.tableUpdate('API Call Results', { method, result });
    error(e, { method, result });
    await globals.report.updateReport();
  };

  // Create buttons with callback functions

  async onEvent(event: string, data: any): Promise<void> {
    globals.report.tableUpdate('onEvent', { event, data }, 'uid');
    await globals.report.updateReport();
  }

  async onTick() {
    globals.report.cardSetValue('Price', this.orderBasket.price());
    globals.report.cardSetValue('Bid', this.orderBasket.bid());
    globals.report.cardSetValue('Ask', this.orderBasket.ask());
    globals.report.cardSetValue('Time', timeToStrHms(tms()));
  }
}
