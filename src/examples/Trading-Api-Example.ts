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
      symbol: this.symbols[0],
      triggerType: 'exchange',
    });
    await this.orderBasket.init();

    globals.report.setTitle('Trading API Callback Example');
    globals.report.setDescription(
      `Exchange: ${this.connectionName}, Symbol: ${this.symbol}, Hedge Mode: ${this.hedgeMode}`,
    );

    await this.handleApiResult('Basket Info', this.orderBasket.orderBasketInfo());
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
    const result = await this.orderBasket.getSymbolInfo();
    await this.handleApiResult('symbolInfo', result);
  };

  private tmsCallback = async () => {
    const result = timeCurrent();
    await this.handleApiResult('tms', result);
  };

  private priceCallback = async () => {
    const result = this.orderBasket.price();
    await this.handleApiResult('price', result);
  };

  private volumeCallback = async () => {
    const result = this.orderBasket.volume();
    await this.handleApiResult('volume', result);
  };

  private askCallback = async () => {
    const result = { ask: this.orderBasket.ask(), askVolume: this.orderBasket.askVolume() };
    await this.handleApiResult('ask', result);
  };

  private bidCallback = async () => {
    const result = { bid: this.orderBasket.bid(), bidVolume: this.orderBasket.bidVolume() };
    await this.handleApiResult('bid', result);
  };

  private getPositionsCallback = async () => {
    const result = await this.orderBasket.getPositions();
    await this.handleApiResult('getPositions', result);
  };

  private getOrdersCallback = async () => {
    const result = this.orderBasket.getOrders();
    await this.handleApiResult('getOrders', result);
  };

  private getBalanceCallback = async () => {
    const result = await getBalance();
    await this.handleApiResult('getBalance', result);
  };

  private getProfitCallback = async () => {
    const result = await getProfit();
    await this.handleApiResult('getProfit', result);
  };

  private getHistoryCallback = async () => {
    const timeFrom = tms() - 1000 * 60 * 60 * 24 * 7; // 7 days
    const result = await getHistory(this.symbol, '1m', timeFrom, 10);
    log('getHistory', '', result);
    await this.handleApiResult('getHistory', result);
  };

  private buyMarketCallback = async () => {
    const amount = this.orderBasket.getContractsAmount(this.sizeUsd);
    const result = await this.orderBasket.buyMarket(amount);
    await this.handleApiResult('buyMarket', result);
  };

  private createOrderCallback = async () => {
    const limitPrice = this.orderBasket.close() * 0.7;
    const amount = this.orderBasket.getContractsAmount(this.sizeUsd, limitPrice);
    const result = await this.orderBasket.createOrder('limit', 'buy', amount, limitPrice, {});
    await this.handleApiResult('createOrder', result);
  };

  private buyLimitCallback = async () => {
    const limitPrice = this.orderBasket.close() * 0.7;
    const amount = this.orderBasket.getContractsAmount(this.sizeUsd, limitPrice);
    const result = await this.orderBasket.buyLimit(amount, limitPrice);
    await this.handleApiResult('buyLimit', result);
  };

  private modifyOrderCallback = async () => {
    const limitPrice = this.orderBasket.close() * 0.7;
    const amount = this.orderBasket.getContractsAmount(this.sizeUsd, limitPrice);

    await sleep(1000); // wait for the order to be created

    const order = await this.orderBasket.buyLimit(amount, limitPrice);
    const result = await this.orderBasket.modifyOrder(order.id, 'limit', 'buy', amount, limitPrice * 1.05);
    await this.handleApiResult('modifyOrder', result);
  };

  private cancelOrderCallback = async () => {
    const limitPrice = this.orderBasket.close() * 0.7;
    const amount = this.orderBasket.getContractsAmount(this.sizeUsd, limitPrice);
    const order = await this.orderBasket.buyLimit(amount, limitPrice);

    const result = await this.orderBasket.cancelOrder(order.id);
    await this.handleApiResult('cancelOrder', result);
  };

  private getOpenOrdersCallback = async () => {
    const result = await getOpenOrders(this.symbol);
    await this.handleApiResult('getOpenOrders', result);
  };

  private getClosedOrdersCallback = async () => {
    const result = await getClosedOrders(this.symbol);
    await this.handleApiResult('getClosedOrders', result);
  };

  // Helper method for handling API results
  private handleApiResult = async (method: string, result: any) => {
    globals.report.tableUpdate('API Call Results', { method, result });
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
