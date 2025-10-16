import { globals } from '../lib/core/globals';
import { error, log, trace } from '../lib/core/log';
import { timeCurrent, timeToStrHms } from '../lib/utils/date-time';
import { getArgNumber, getArgString } from '../lib/core/base';
import { OrdersBasket } from '../lib/exchange';
import { BaseScript } from '../lib/script/base-script';
import { sleep } from '../lib/utils/misc';
import { StandardReportLayout } from '../lib/report/layouts';

/*
Orders Opening Example

This script demonstrates various ways to open positions using JT-Lib OrdersBasket.
Based on the complete guide for opening orders, it shows:

1. Market orders (buy/sell)
2. Limit orders with trigger orders (stop-loss/take-profit)
3. Position management and contract calculations
4. Different trigger types (exchange/script)
5. Symbol info and contract size calculations

Key features:
- Interactive buttons for different order types
- Real-time position and order monitoring
- Error handling and result display
- Contract amount calculations for different exchanges
- Stop-loss and take-profit management

Usage:
- Use buttons to test different order types
- Monitor positions and orders in real-time
- Adjust sizeUsd parameter for different position sizes
- Switch between exchange and script trigger types

*/

class Script extends BaseScript {
  static definedArgs = [
    {
      key: 'symbols',
      defaultValue: 'BTC/USDT:USDT',
    },
    {
      key: 'sizeUsd',
      defaultValue: 10,
    },
    {
      key: 'triggerType',
      defaultValue: 'exchange',
      options: [
        { value: 'exchange', label: 'Exchange' },
        { value: 'script', label: 'Script' },
      ],
    },
    {
      key: 'stopLossPercent',
      defaultValue: 5,
    },
    {
      key: 'takeProfitPercent',
      defaultValue: 4,
    },
    {
      key: 'isDebug',
      defaultValue: false,
      options: [
        { value: true, label: 'True' },
        { value: false, label: 'False' },
      ],
    },
  ];
  sizeUsd: number;
  symbol: string;
  orderBasket: OrdersBasket;
  private reportLayout = new StandardReportLayout();
  private currentPosition: any = null;
  private triggerType = getArgString('triggerType', 'exchange') as 'exchange' | 'script';
  private stopLossPercent = getArgNumber('stopLossPercent', 5) / 100;
  private takeProfitPercent = getArgNumber('takeProfitPercent', 4) / 100;

  constructor(params: GlobalARGS) {
    super(params);

    this.symbol = this.symbols[0];
    this.sizeUsd = getArgNumber('sizeUsd', 2);
  }

  onInit = async () => {
    // Create a new OrdersBasket instance
    this.orderBasket = new OrdersBasket({
      symbol: this.symbols[0],
      triggerType: this.triggerType,
    });
    await this.orderBasket.init();

    globals.report.setTitle('Orders Opening Example');
    globals.report.setDescription(
      `Exchange: ${this.connectionName}, Symbol: ${this.symbol}, Size: $${this.sizeUsd}, Trigger: ${this.triggerType}`,
    );

    await this.handleApiResult('Basket Info', this.orderBasket.orderBasketInfo());
    await this.createOrderButtons();
  };

  async onOrderChange(order: Order): Promise<void> {
    globals.report.tableUpdate('onOrderChange', { ...order, info: undefined }, 'uid');
  }

  createOrderButtons = async () => {
    // Symbol information buttons
    globals.report.createActionButton('Symbol Info', 'symbolInfo', this.symbol, this.symbolInfoCallback);
    globals.report.createActionButton('Current Price', 'price', this.symbol, this.priceCallback);

    // Market orders
    globals.report.createActionButton('Buy Market', 'buyMarket', this.symbol, this.buyMarketCallback);
    globals.report.createActionButton('Sell Market', 'sellMarket', this.symbol, this.sellMarketCallback);

    // Market orders with protection
    globals.report.createActionButton('Buy Market + SL/TP', 'buyMarketSlTp', this.symbol, this.buyMarketSlTpCallback);
    globals.report.createActionButton(
      'Sell Market + SL/TP',
      'sellMarketSlTp',
      this.symbol,
      this.sellMarketSlTpCallback,
    );

    // Limit orders
    globals.report.createActionButton('Buy Limit', 'buyLimit', this.symbol, this.buyLimitCallback);
    globals.report.createActionButton('Sell Limit', 'sellLimit', this.symbol, this.sellLimitCallback);

    // Limit orders with protection
    globals.report.createActionButton('Buy Limit + SL/TP', 'buyLimitSlTp', this.symbol, this.buyLimitSlTpCallback);
    globals.report.createActionButton('Sell Limit + SL/TP', 'sellLimitSlTp', this.symbol, this.sellLimitSlTpCallback);

    // Position management
    globals.report.createActionButton('Get Positions', 'getPositions', `[${this.symbol}]`, this.getPositionsCallback);
    globals.report.createActionButton('Get Orders', 'getOrders', this.symbol, this.getOrdersCallback);
    globals.report.createActionButton('Close All Positions', 'closeAll', this.symbol, this.closeAllCallback);

    // Order management
    globals.report.createActionButton('Cancel All Orders', 'cancelAll', this.symbol, this.cancelAllCallback);
    globals.report.createActionButton('Get Open Orders', 'getOpenOrders', this.symbol, this.getOpenOrdersCallback);

    log('createOrderButtons', 'Order buttons created', {}, true);
  };

  // Symbol information callbacks
  private symbolInfoCallback = async () => {
    const result = await this.orderBasket.getSymbolInfo();
    await this.handleApiResult('Symbol Info', result);
  };

  private priceCallback = async () => {
    const result = {
      price: this.orderBasket.price(),
      bid: this.orderBasket.bid(),
      ask: this.orderBasket.ask(),
      close: this.orderBasket.close(),
    };
    await this.handleApiResult('Current Price', result);
  };

  private contractInfoCallback = async () => {
    const symbolInfo = await this.orderBasket.getSymbolInfo();
    const currentPrice = this.orderBasket.price();
    const contracts = this.orderBasket.getContractsAmount(this.sizeUsd);
    const contractsWithPrice = this.orderBasket.getContractsAmount(this.sizeUsd, currentPrice * 0.9);

    const result = {
      symbolInfo: {
        contractSize: symbolInfo.contractSize,
        amountPrecision: symbolInfo.precision.amount,
        minAmount: symbolInfo.limits.amount.min,
        maxAmount: symbolInfo.limits.amount.max,
      },
      calculations: {
        sizeUsd: this.sizeUsd,
        currentPrice,
        contractsForCurrentPrice: contracts,
        contractsFor90PercentPrice: contractsWithPrice,
        actualValueCurrent: contracts * currentPrice * symbolInfo.contractSize,
        actualValue90Percent: contractsWithPrice * (currentPrice * 0.9) * symbolInfo.contractSize,
      },
    };
    await this.handleApiResult('Contract Size Info', result);
  };

  // Market order callbacks
  private buyMarketCallback = async () => {
    const amount = this.orderBasket.getContractsAmount(this.sizeUsd);
    const result = await this.orderBasket.buyMarket(amount);
    await this.handleApiResult('Buy Market', result);
  };

  private sellMarketCallback = async () => {
    const amount = this.orderBasket.getContractsAmount(this.sizeUsd);
    const result = await this.orderBasket.sellMarket(amount);
    await this.handleApiResult('Sell Market', result);
  };

  // Market orders with stop-loss and take-profit
  private buyMarketSlTpCallback = async () => {
    const amount = this.orderBasket.getContractsAmount(this.sizeUsd);
    const currentPrice = this.orderBasket.price();

    // Calculate stop-loss and take-profit
    const sl = currentPrice * (1 - this.stopLossPercent);
    const tp = currentPrice * (1 + this.takeProfitPercent);

    const result = await this.orderBasket.buyMarket(amount, tp, sl);
    await this.handleApiResult('Buy Market + SL/TP', {
      ...result,
      stopLoss: sl,
      takeProfit: tp,
      stopLossPercent: `${this.stopLossPercent * 100}%`,
      takeProfitPercent: `${this.takeProfitPercent * 100}%`,
    });
  };

  private sellMarketSlTpCallback = async () => {
    const amount = this.orderBasket.getContractsAmount(this.sizeUsd);
    const currentPrice = this.orderBasket.price();

    // Calculate stop-loss and take-profit
    const sl = currentPrice * (1 + this.stopLossPercent);
    const tp = currentPrice * (1 - this.takeProfitPercent);

    const result = await this.orderBasket.sellMarket(amount, tp, sl);
    await this.handleApiResult('Sell Market + SL/TP', {
      ...result,
      stopLoss: sl,
      takeProfit: tp,
      stopLossPercent: `${this.stopLossPercent * 100}%`,
      takeProfitPercent: `${this.takeProfitPercent * 100}%`,
    });
  };

  // Limit order callbacks
  private buyLimitCallback = async () => {
    const currentPrice = this.orderBasket.price();
    const limitPrice = currentPrice * 0.98; // 2% below current price
    const amount = this.orderBasket.getContractsAmount(this.sizeUsd, limitPrice);

    const result = await this.orderBasket.buyLimit(amount, limitPrice);
    await this.handleApiResult('Buy Limit', {
      ...result,
      currentPrice,
      limitPrice,
      priceDifference: `${(((limitPrice - currentPrice) / currentPrice) * 100).toFixed(2)}%`,
    });
  };

  private sellLimitCallback = async () => {
    const currentPrice = this.orderBasket.price();
    const limitPrice = currentPrice * 1.02; // 2% above current price
    const amount = this.orderBasket.getContractsAmount(this.sizeUsd, limitPrice);

    const result = await this.orderBasket.sellLimit(amount, limitPrice);
    await this.handleApiResult('Sell Limit', {
      ...result,
      currentPrice,
      limitPrice,
      priceDifference: `${(((limitPrice - currentPrice) / currentPrice) * 100).toFixed(2)}%`,
    });
  };

  // Limit orders with stop-loss and take-profit
  private buyLimitSlTpCallback = async () => {
    const currentPrice = this.orderBasket.price();
    const limitPrice = currentPrice * 0.98; // 2% below current price
    const amount = this.orderBasket.getContractsAmount(this.sizeUsd, limitPrice);

    // Calculate stop-loss and take-profit from limit price
    const sl = limitPrice * (1 - this.stopLossPercent);
    const tp = limitPrice * (1 + this.takeProfitPercent);

    const result = await this.orderBasket.buyLimit(amount, limitPrice, tp, sl);
    await this.handleApiResult('Buy Limit + SL/TP', {
      ...result,
      currentPrice,
      limitPrice,
      stopLoss: sl,
      takeProfit: tp,
      stopLossPercent: `${this.stopLossPercent * 100}%`,
      takeProfitPercent: `${this.takeProfitPercent * 100}%`,
    });
  };

  private sellLimitSlTpCallback = async () => {
    const currentPrice = this.orderBasket.price();
    const limitPrice = currentPrice * 1.02; // 2% above current price
    const amount = this.orderBasket.getContractsAmount(this.sizeUsd, limitPrice);

    // Calculate stop-loss and take-profit from limit price
    const sl = limitPrice * (1 + this.stopLossPercent);
    const tp = limitPrice * (1 - this.takeProfitPercent);

    const result = await this.orderBasket.sellLimit(amount, limitPrice, tp, sl);
    await this.handleApiResult('Sell Limit + SL/TP', {
      ...result,
      currentPrice,
      limitPrice,
      stopLoss: sl,
      takeProfit: tp,
      stopLossPercent: `${this.stopLossPercent * 100}%`,
      takeProfitPercent: `${this.takeProfitPercent * 100}%`,
    });
  };

  // Position management callbacks
  private getPositionsCallback = async () => {
    const result = await this.orderBasket.getPositions();
    this.currentPosition = result.find((pos: any) => pos.symbol === this.symbol);
    await this.handleApiResult('Get Positions', result);
  };

  private getOrdersCallback = async () => {
    const result = this.orderBasket.getOrders();
    await this.handleApiResult('Get Orders', result);
  };

  private closeAllCallback = async () => {
    const positions = await this.orderBasket.getPositions();
    const results = [];

    for (const position of positions) {
      if (position.contracts !== 0) {
        const result = await this.orderBasket.closePosition(position.side, position.contracts);
        results.push({ symbol: position.symbol, result });
      }
    }

    await this.handleApiResult('Close All Positions', results);
  };

  private getOpenOrdersCallback = async () => {
    const result = await getOpenOrders(this.symbol);
    await this.handleApiResult('Get Open Orders', result);
  };

  private cancelAllCallback = async () => {
    const openOrders = await getOpenOrders(this.symbol);
    const results = [];

    for (const order of openOrders) {
      const result = await this.orderBasket.cancelOrder(order.id);
      results.push({ orderId: order.id, result });
    }

    await this.handleApiResult('Cancel All Orders', results);
  };

  // Helper method for handling API results
  private handleApiResult = async (method: string, result: any) => {
    globals.report.tableUpdate('Order Results', { method, result, timestamp: timeToStrHms(timeCurrent()) });
    await globals.report.updateReport();
  };

  async onEvent(event: string, data: any): Promise<void> {
    globals.report.tableUpdate('onEvent', { event, data }, 'uid');
    await globals.report.updateReport();
  }

  async onTick() {
    // Update real-time information
    globals.report.cardSetValue('Price', this.orderBasket.price());
    globals.report.cardSetValue('Bid', this.orderBasket.bid());
    globals.report.cardSetValue('Ask', this.orderBasket.ask());
    globals.report.cardSetValue('Time', timeToStrHms(tms()));

    // Update position info if available
    if (this.currentPosition) {
      globals.report.cardSetValue('Position Size', this.currentPosition.contracts);
      globals.report.cardSetValue('Position PnL', this.currentPosition.unrealizedPnl);
    }
  }
}
