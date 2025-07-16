import { BaseObject } from '../core/base-object';
import {
  CreateTriggerOrderByTaskParams,
  ExchangeOrder,
  ExchangeParams,
  StopOrderData,
  StopOrderQueueItem,
  TriggerType,
  MarketInfoShort,
} from './types';
import { BaseError } from '../core/errors';
import { TriggerService } from '../events';
import { debug, error, log, logOnce, warning } from '../core/log';
import { getArgBoolean, getArgNumber, getArgString, uniqueId } from '../core/base';
import { globals } from '../core/globals';
import { currentTime, timeToString } from '../utils/date-time';
import { positionProfit } from './heplers';
import { normalize, validateNumbersInObject } from '../utils/numbers';
import { errorContext } from '../utils/errors';

export class OrdersBasket extends BaseObject {
  LEVERAGE_INFO_KEY = 'exchange-leverage-info-';
  readonly triggerService: TriggerService;
  protected readonly symbol: string;
  protected _connectionName: string;
  protected hedgeMode: boolean = false;
  protected readonly triggerType: TriggerType = 'script';
  protected readonly ordersByClientId = new Map<
    string,
    Order & { userParams: Record<string, number | string | boolean> }
  >();
  protected readonly stopOrdersByOwnerShortId = new Map<string, StopOrderData>();
  protected readonly stopOrdersQueue = new Map<string, StopOrderQueueItem>();

  protected symbolInfo: SymbolInfo;
  protected leverage: number = 1;
  protected prefix: string;
  protected maxLeverage: number;
  protected contractSize: number;
  protected _minContractQuoted: number;
  protected _minContractBase: number;
  protected minContractStep: number;

  private nextOrderId = 0;

  isInit = false;

  constructor(params: ExchangeParams) {
    super(params);

    // if (!params.connectionName || params.connectionName === '') {
    //   throw new BaseError('OrdersBasket::::constructor Argument "connectionName" is not defined', params);
    // }

    if (!params.symbol || params.symbol === '') {
      throw new BaseError('OrdersBasket::::constructor Argument "symbol" is not defined', params);
    }

    this.triggerType = params.triggerType ?? 'script';
    this.connectionName = params.connectionName || getArgString('connectionName', undefined);
    this.symbol = params.symbol; // TODO validate symbol
    this.leverage = params.leverage ?? this.leverage;
    this.hedgeMode = params.hedgeMode || getArgBoolean('hedgeMode', undefined) || false;

    this.setPrefix(params.prefix);

    globals.events.subscribeOnOrderChange(this.beforeOnOrderChange, this, this.symbol);
    globals.events.subscribeOnTick(this.beforeOnTick, this, this.symbol);

    this.triggerService = new TriggerService({ idPrefix: this.symbol, symbol: this.symbol });
    this.triggerService.registerPriceHandler(params.symbol, 'executeStopLoss', this.createOrderByTrigger, this);
    this.triggerService.registerPriceHandler(params.symbol, 'executeTakeProfit', this.createOrderByTrigger, this);
    this.triggerService.registerPriceHandler(params.symbol, 'createOrderByTrigger', this.createOrderByTrigger, this);

    this.addChild(this.triggerService);
  }

  private async beforeOnTick() {
    return await this.onTick();
  }

  async onTick(): Promise<any> {
    return { class: 'OrdersBasket' };
  }
  private set connectionName(value: string) {
    this._connectionName = value;
  }

  get connectionName(): string {
    return this._connectionName;
  }

  async getSymbolInfo() {
    let result = await symbolInfo(this.symbol);
    logOnce('OrdersBasket::getSymbolInfo ' + this.symbol, 'symbolInfo', this.symbolInfo);

    return result;
  }
  async init() {
    this.symbolInfo = await this.getSymbolInfo();
    this.isInit = true;

    if (!isTester()) {
      if (!this.symbolInfo) {
        throw new BaseError('OrdersBasket::init symbolInfo is not defined for symbol ' + this.symbol, {
          symbol: this.symbol,
        });
      }
    } else {
      //TODO update symbol info for futures in tester (then delete code below)
      this.symbolInfo['limits']['amount']['min'] = 0.00001;

      if (this._connectionName.includes('binance')) {
        this.symbolInfo['limits']['cost']['min'] = 5;
      }
      this.maxLeverage = getArgNumber('defaultLeverage', 100);
    }

    this.contractSize = this.symbolInfo.contractSize ?? 1;
    this.updateLimits();

    if (this.leverage > this.maxLeverage) {
      throw new BaseError('Exchange:init leverage (' + this.leverage + ') is high for symbol ' + this.symbol, {
        symbol: this.symbol,
        leverage: this.leverage,
        maxLeverage: this.maxLeverage,
      });
    }

    await this.setLeverage(this.leverage);

    if (this.triggerType !== 'script' && this.triggerType !== 'exchange') {
      throw new BaseError('OrdersBasket::init', 'Wrong trigger type ' + this.triggerType);
    }

    log('OrdersBasket::init', '', {
      symbol: this.symbol,
      triggerType: this.triggerType + '',
      connectionName: this._connectionName,
      hedgeMode: this.hedgeMode,
      prefix: this.prefix,
      leverage: this.leverage,
      maxLeverage: this.maxLeverage,
      contractSize: this.contractSize,
      minContractQuoted: this._minContractQuoted,
      minContractBase: this._minContractBase,
      minContractStep: this.minContractStep,
    });
  }

  updateLimits() {
    this.minContractStep = this.symbolInfo.limits.amount.min;

    if (!this.symbolInfo?.limits?.amount?.min) {
      throw new BaseError('OrdersBasket::init min amount is not defined for symbol ' + this.symbol, {
        symbolInfo: this.symbolInfo,
      });
    }

    if (this.symbolInfo.limits?.cost?.min) {
      this._minContractQuoted = this.symbolInfo.limits.cost.min;
    } else {
      this._minContractQuoted = this.getUsdAmount(this.symbolInfo.limits.amount.min, this.close());
    }

    //TODO update symbolInfo minCost (bybit minCost is 5 but not info in symbolInfo)
    if (this._connectionName.includes('bybit')) {
      this._minContractQuoted = 5;
    }

    this._minContractBase = this.getContractsAmount(this._minContractQuoted);
  }

  private async beforeOnOrderChange(order: Order) {
    const { prefix, shortClientId, ownerClientOrderId, triggerOrderType } = this.parseClientOrderId(
      order.clientOrderId,
    );

    if (prefix !== this.prefix)
      return { status: 'not processed', orderPrefix: prefix, currentPrefix: this.prefix, order };

    try {
      this.ordersByClientId.set(order.clientOrderId, { ...order, userParams: {} });
      const stopOrders = this.stopOrdersByOwnerShortId.get(ownerClientOrderId);

      // cancel stop orders if one of them is fulfilled.
      if (order.status === 'closed' && !!stopOrders) {
        const { slOrderId, tpOrderId } = stopOrders;

        if (order.id === slOrderId && tpOrderId) {
          await this.cancelOrder(tpOrderId);
        }

        if (order.id === tpOrderId && slOrderId) {
          await this.cancelOrder(slOrderId);
        }
      }

      // cancel stop orders if one of them is executed.
      if (order.status === 'canceled' && !!stopOrders && this.triggerType === 'exchange') {
        const { slOrderId, tpOrderId } = stopOrders;
        if (slOrderId) {
          await this.cancelOrder(slOrderId);
        }
        if (tpOrderId) {
          await this.cancelOrder(tpOrderId);
        }
      }

      const stopOrderQueue = this.stopOrdersQueue.get(order.clientOrderId);
      // If executed order has SL or TP params, create stop orders
      if (order.status === 'closed' && stopOrderQueue) {
        await this.createSlTpOrders(order.clientOrderId, stopOrderQueue.sl, stopOrderQueue.tp);
      }
      log('OrdersBasket::onOrderChange', `${order.clientOrderId} ${order.status}`, {
        order,
        prefix,
        ownerClientOrderId,
        shortClientId,
        stopOrderQueue,
        stopOrders,
        triggerOrderType,
      });
    } catch (e) {
      error(e, { order });
    }

    //sometimes orders not coming to websocket
    //TODO write test for position update in websocket
    await this.getPositions(true);

    return await this.onOrderChange(order);
  }

  async onOrderChange(order: Order): Promise<any> {
    return { order };
  }

  /**
   * Create order on exchange
   * @param type - 'market' or 'limit'
   * @param side - 'buy' or 'sell'
   * @param amount - order amount
   * @param price -  order price
   * @param params - if params['sl'] or params['tp'] set, stop orders will be created automatically by this order.
   * @returns {Promise<Order>}
   */
  async createOrder(
    type: OrderType,
    side: OrderSide,
    amount: number,
    price: number,
    params: Record<string, unknown>,
  ): Promise<Order> {
    const args = { type, side, amount, price, params };

    if (!this.isInit) throw new BaseError('OrdersBasket::createOrder - exchange not initialized', args);
    if (validateNumbersInObject({ amount, price }) === false)
      throw new BaseError('OrdersBasket::createOrder - wrong amount or price', args);
    if (amount <= 0) throw new BaseError('OrdersBasket::createOrder amount must be > 0', args);
    if (!['sell', 'buy'].includes(side))
      throw new BaseError('OrdersBasket::createOrder side must be buy or sell', args);

    if (this.hedgeMode) {
      params['positionSide'] = side === 'buy' ? 'long' : 'short';

      if (params['reduceOnly']) {
        params['positionSide'] = side === 'buy' ? 'short' : 'long';
      }
    }

    params['leverage'] = params['leverage'] ?? this.leverage;

    const clientOrderId = this.generateClientOrderId(
      this.prefix,
      type,
      !!params['reduceOnly'] ?? false,
      params['ownerClientOrderId'] as string,
      params['triggerOrderType'] as string,
    );

    params.clientOrderId = clientOrderId;

    // If stop orders params set, save it to stopOrdersQueue then this params will be used in onOrderChange function
    // stop orders will be created when owner order executed (status = 'closed')
    if (params['sl'] || params['tp']) {
      this.stopOrdersQueue.set(clientOrderId, {
        ownerOrderId: clientOrderId,
        sl: params['sl'] as number,
        tp: params['tp'] as number,
        prefix: this.prefix,
      });

      log('OrdersBasket::createOrder', 'Stop orders params saved', this.stopOrdersQueue.get(clientOrderId));
    }

    const triggerPrice = params.triggerPrice || params.stopLossPrice || params.takeProfitPrice;

    if (triggerPrice && this.triggerType === 'script') {
      let ownerClientOrderId = params.ownerClientOrderId as string;

      let triggerOrderType = undefined;
      if (params.takeProfitPrice || params.stopLossPrice) {
        triggerOrderType = params.takeProfitPrice ? 'TP' : 'SL';
      }

      const orderParams = {
        type,
        side,
        amount,
        price,
        params: { reduceOnly: params.reduceOnly, ownerClientOrderId, triggerOrderType },
      };

      let taskId: string;
      let taskName: string;

      if (params.stopLossPrice) taskName = 'executeStopLoss';
      if (params.takeProfitPrice) taskName = 'executeTakeProfit';
      if (params.triggerPrice) taskName = 'createOrderByTrigger';

      let group = ownerClientOrderId || (params?.triggerGroup as string);
      taskId = this.triggerService.addTaskByPrice({
        name: taskName,
        triggerPrice: triggerPrice as number,
        symbol: this.symbol,
        group,
        args: orderParams,
      });

      log('OrdersBasket::createOrder', 'Trigger price task ' + taskName + ' added', {
        taskId,
        triggerOrdersParams: args,
        options: {
          id: params.clientOrderId,
          group: params.ownerShortId,
        },
        params,
      });

      return { clientOrderId, id: null } as Order;
    }

    const { orderParams, userParams } = this.validateParams(params);

    let order: Order;

    try {
      order = await createOrder(this.symbol, type, side, amount, price, orderParams);
    } catch (e) {
      e.message = 'ExchangeAPI:: ' + e.message;
      throw new BaseError(e, {
        marketInfo: await this.marketInfoShort(),
        orderParams,
        userParams,
        args,
        e,
      });
    }
    if (this.connectionName.includes('bybit') && !isTester() && order.id) {
      //TODO emulate order for bybit (bybit return only id) -> move it to Environment
      let emulateOrder = this.emulateOrder(type, side, amount, price, {
        ...orderParams,
        id: order.id,
        error: order.error,
        filled: type === 'market' ? amount : 0,
      });
      // debug('OrdersBasket::createOrder', 'Emulated order for  bybit', { order, emulateOrder });
      order = emulateOrder;
    }

    this.ordersByClientId.set(clientOrderId, { ...order, userParams });
    if (!order.id) {
      error('OrdersBasket::createOrder', 'Order not created', {
        marketInfo: await this.marketInfoShort(),
        order,
        params,
        args,
        orderParams,
        userParams,
      });

      return order;
    }

    log('OrdersBasket::createOrder', `[${this.symbol}] Order created ` + (params.reduceOnly ? 'R' : '') + ' ' + type, {
      marketInfo: await this.marketInfoShort(),
      args,
      orderParams,
      userParams,
      order,
      triggerPrice,
    });

    return order;
  }

  emulateOrder(
    type: OrderType,
    side: OrderSide,
    amount: number,
    price: number,
    params: Record<string, unknown>,
  ): Order {
    let order: Order = {
      emulated: true,
      id: (params.id as string) ?? uniqueId(8),
      clientOrderId: (params?.clientOrderId as string) ?? '',
      datetime: new Date(tms()).toISOString(),
      timestamp: tms(),
      lastTradeTimestamp: null,
      status: 'open',
      symbol: this.symbol,
      type: type,
      timeInForce: 'IOC',
      side: side,
      positionSide: null,
      price: type === 'market' ? this.close() : price, // Цена ордера
      average: type === 'market' ? this.close() : price, // Цена ордера
      amount: amount,
      filled: (params.filled as number) ?? 0,
      remaining: 0.1,
      cost: 0,
      trades: [],
      fee: {
        cost: 0,
        currency: 'USDT',
      },
      info: {},
      reduceOnly: (params?.reduceOnly as boolean) || false,
    };

    if (this.hedgeMode) {
      order.positionSide = params['positionSide'] as PositionSideType;
    }

    return order;
  }
  getUserOrderParams(clientOrderId: string): Record<string, number | string | boolean> {
    let order = this.ordersByClientId.get(clientOrderId);
    return order?.userParams ?? {};
  }

  setPrefix(prefix?: string): void {
    this.prefix = prefix ?? uniqueId(4);

    log('OrdersBasket::setPrefix', 'Prefix set to ' + this.prefix);
  }

  getPrefix() {
    return this.prefix;
  }

  async buyMarket(amount: number, tp?: number, sl?: number, params = {}): Promise<Order> {
    return this.createOrder('market', 'buy', amount, this.close(), { ...params, tp, sl });
  }

  async sellMarket(amount: number, tp?: number, sl?: number, params = {}): Promise<Order> {
    return this.createOrder('market', 'sell', amount, this.close(), { ...params, tp, sl });
  }

  async buyLimit(amount: number, limitPrice: number, tp?: number, sl?: number, params = {}): Promise<Order> {
    return this.createOrder('limit', 'buy', amount, limitPrice, { ...params, tp, sl });
  }

  /**
   * Create limit sell order
   * @param amount - order amount
   * @param limitPrice - order execution price
   * @param sl - stop loss price if sl = 0, stop loss order will not be created
   * @param tp - take profit price if tp = 0, take profit order will not be created
   * @param params - params for createOrder function (see createOrder function)
   * @returns {Promise<Order>}
   *
   */
  async sellLimit(amount: number, limitPrice: number, tp?: number, sl?: number, params = {}): Promise<Order> {
    return this.createOrder('limit', 'sell', amount, limitPrice, { ...params, tp, sl });
  }

  /**
   * Modify order by id (change price, amount)
   * @param orderId - order id
   * @param type - 'market' or 'limit'
   * @param side - 'buy' or 'sell'
   * @param amount - order amount
   * @param price -  order price
   * @returns {Promise<Order>}
   */
  async modifyOrder(orderId: string, type: OrderType, side: OrderSide, amount: number, price: number): Promise<Order> {
    const args = { orderId, symbol: this.symbol, type, side, amount, price };

    try {
      const order = await modifyOrder(orderId, this.symbol, type, side, amount, price);

      log('OrdersBasket::modifyOrder', 'Order modified', {
        args,
        order,
        before: this.ordersByClientId.get(orderId) ?? null,
      });

      return order;
    } catch (e) {
      throw new BaseError(e, { ...args, order: this.ordersByClientId.get(orderId) });
    }
  }

  /**
   * Cancel order by id
   * @param orderId - order id
   * @returns {Promise<Order>}
   */
  async cancelOrder(orderId: string): Promise<Order> {
    try {
      if (typeof orderId !== 'string') {
        error('Exchange:cancelOrder ', 'orderId must be string ', { orderId, orderIdType: typeof orderId });
        return {};
      }
      const order = await cancelOrder(orderId, this.symbol);

      if (isTester()) {
        const order = await getOrder(orderId);
        if (order.status !== 'canceled' && order.status !== 'closed') {
          error('Exchange:cancelOrder ', 'Order not canceled', {
            orderId,
            symbol: this.symbol,
            order,
          });
          return;
        }
      }

      log('Exchange:cancelOrder', 'Order canceled', { orderId, symbol: this.symbol });

      return order;
    } catch (e) {
      throw new BaseError(e, { orderId, symbol: this.symbol });
    }
  }

  /**
   * Create take profit order (close position)
   * @param sideToClose - 'buy' or 'sell' - side of order to close @note: (if you want to close buy order, you need pass 'buy' to this param so stop loss order will be sell order)
   * @param amount - order amount
   * @param takeProfitPrice - trigger price (take profit price)
   * @param params - params for createOrder function (see createOrder function)
   * @returns {Promise<Order>}
   */
  async createTakeProfitOrder(
    sideToClose: OrderSide,
    amount: number,
    takeProfitPrice: number,
    params = {},
  ): Promise<Order> {
    const side: OrderSide = sideToClose === 'buy' ? 'sell' : 'buy';

    return this.createOrder('market', side, amount, takeProfitPrice, {
      ...params,
      takeProfitPrice,
      reduceOnly: true,
    });
  }

  /**
   * Create stop loss order (close position)
   * @param sideToClose - 'buy' or 'sell' - side of order to close @note: (if you want to close buy order, you need pass 'buy' to this param so stop loss order will be sell order)
   * @param amount  - order amount
   * @param stopLossPrice - trigger price (stop loss price)
   * @param params - params for createOrder function (see createOrder function)
   * @note - stop loss order could be only market type
   * @returns {Promise<Order>}
   */
  async createStopLossOrder(
    sideToClose: OrderSide,
    amount: number,
    stopLossPrice: number,
    params = {},
  ): Promise<Order> {
    const side: OrderSide = sideToClose === 'buy' ? 'sell' : 'buy';

    return this.createOrder('market', side, amount, stopLossPrice, {
      ...params,
      stopLossPrice,
      reduceOnly: true,
    });
  }

  // ------------- Triggered orders ----------------
  // note: This function uses our own library for working with trigger orders.
  // It is important to note that these orders are not placed directly into the exchange's order book. Instead, they are stored locally
  // and are activated only when the market price reaches the specified trigger price.
  // Once activated, the corresponding order (market or limit) is sent to the exchange for execution.
  /**
   * Creates a trigger order (market or limit) that is sent to the exchange when the price reaches the specified trigger price.
   * @param type - 'market' or 'limit'
   * @param side - 'buy' or 'sell'
   * @param amount - order amount
   * @param price - order price (used only for limit orders)
   * @param triggerPrice - trigger price
   * @param params - params for createOrder function (see createOrder function)
   * @returns {Promise<void>}
   */
  async createTriggeredOrder(
    type: OrderType,
    side: OrderSide,
    amount: number,
    price: number,
    triggerPrice: number,
    params = {},
  ): Promise<Order> {
    return this.createOrder(type, side, amount, price, { ...params, triggerPrice });
  }

  /**
   * Create reduce only order (close position)
   * @param type - 'market' or 'limit'
   * @param sideToClose - 'buy' | 'sell' | 'long | 'short
   * @param amount - order amount
   * @param price -  order price
   * @param params - params for createOrder function (see createOrder function)
   * @returns {Promise<Order>}
   */
  createReduceOrder = async (
    type: OrderType,
    sideToClose: OrderSide | 'long' | 'short',
    amount: number,
    price: number,
    params = {},
  ): Promise<Order> => {
    let side: OrderSide;
    //TODO keep sideToClose only long short (sideToClose -> posSideToClose = long short)
    if (sideToClose === 'buy' || sideToClose === 'long') side = 'sell';
    if (sideToClose === 'sell' || sideToClose === 'short') side = 'buy';
    return await this.createOrder(type, side, amount, price, { ...params, reduceOnly: true });
  };

  async closePosition(side: 'long' | 'short', amount: number = undefined, params = {}): Promise<Order> {
    //TODO: validate side it should be 'long' or 'short'
    const position = await this.getPositionBySide(side);
    if (position.contracts > 0) {
      const reduceSide = side === 'long' ? 'sell' : 'buy';
      if (!amount) {
        amount = position.contracts;
      }
      return this.createOrder('market', reduceSide, amount, 0, { ...params, reduceOnly: true });
    }
  }

  cancelAllOrders = async (): Promise<void> => {
    let orders = await this.getOpenOrders();
    for (let order of orders) {
      let result = await this.cancelOrder(order.id);

      if (result.status !== 'canceled') {
        error('OrdersBasket::cancelAllOrders', 'Order not canceled', { order });
      }
    }

    log('OrdersBasket::cancelAllOrders', 'All orders canceled', { orders });
  };

  getExtendedOrders(): ExchangeOrder[] {
    return Array.from(this.ordersByClientId.values()).map((order) => {
      const { ownerClientOrderId, shortClientId } = this.parseClientOrderId(order.clientOrderId);
      const stopOrderData = this.stopOrdersByOwnerShortId.get(ownerClientOrderId);
      let stopOrder: Order;

      if (stopOrderData) {
        const tpOrder = this.ordersByClientId.get(stopOrderData.tpClientOrderId);
        const slOrder = this.ordersByClientId.get(stopOrderData.slClientOrderId);

        if (tpOrder?.status === 'closed') {
          stopOrder = tpOrder;
        }

        if (slOrder?.status === 'closed') {
          stopOrder = slOrder;
        }
      }

      return {
        id: order.id,
        clientOrderId: order.clientOrderId,
        shortClientId: shortClientId,
        side: order.side as 'buy' | 'sell',
        openPrice: order.price,
        closePrice: stopOrder ? stopOrder.price : 0,
        amount: order.amount,
        status: order.status,
        profit: stopOrder ? positionProfit(order.side, order.price, stopOrder.price, order.amount) : 0,
        reduceOnly: order.reduceOnly,
        cost: Math.abs(order.price * order.amount),
        dateOpen: timeToString(order.timestamp),
        dateClose: stopOrder ? timeToString(stopOrder.timestamp) : '',
        userParams: order.userParams,
      };
    });
  }

  async getPositionBySide(side: 'short' | 'long', isForce = false): Promise<Position> {
    if (side !== 'long' && side !== 'short') {
      throw new BaseError(`OrdersBasketgetPositionBySide`, `wrong position side: ${side}`);
    }

    const positions = await this.getPositions(isForce);
    let pos;

    if (!isTester()) {
      //for binance could be 3 positions in array (long, short, both)
      pos = positions.filter((position) => position.side === side)?.[0];
    } else {
      if (positions[0] && positions[0]?.side === side) {
        pos = positions[0];
      } else if (positions[1] && positions[1]?.side === side) {
        pos = positions[1];
      }
    }

    if (!pos) {
      return {
        emulated: true,
        side: side,
        symbol: this.symbol,
        entryPrice: 0,
        contracts: 0,
        unrealizedPnl: 0,
        leverage: 0,
        liquidationPrice: 0,
        collateral: 0,
        notional: 0,
        markPrice: 0,
        timestamp: 0,
        initialMargin: 0,
        initialMarginPercentage: 0,
        maintenanceMargin: 0,
        maintenanceMarginPercentage: 0,
        marginRatio: 0,
        datetime: '',
        hedged: this.hedgeMode,
        percentage: 0,
        contractSize: 0,
      };
    }
    return pos;
  }

  async getPositions(isForce = false) {
    return await getPositions([this.symbol], { forceFetch: isForce });
  }

  private async createSlTpOrders(ownerClientOrderId: string, sl?: number, tp?: number) {
    if (!sl && !tp) return;

    const orderToClose = this.ordersByClientId.get(ownerClientOrderId);

    debug('OrdersBasket::createSlTpOrders', 'Order to close', { orderToClose, ownerClientOrderId, sl, tp });

    if (!orderToClose) {
      warning('OrdersBasket::createSlTpOrders', 'Order not found or not closed', { ownerClientOrderId });
      return;
    }

    let slOrder: Order;
    let tpOrder: Order;

    if (sl) {
      slOrder = await this.createStopLossOrder(orderToClose.side as OrderSide, orderToClose.amount, sl, {
        ownerClientOrderId,
        triggerOrderType: 'SL',
        prefix: this.prefix,
      });
    }

    if (tp) {
      tpOrder = await this.createTakeProfitOrder(orderToClose.side as OrderSide, orderToClose.amount, tp, {
        ownerClientOrderId,
        triggerOrderType: 'TP',
        prefix: this.prefix,
      });
    }

    log('OrdersBasket::createSlTpOrders', 'Stop order created', {
      tp,
      sl,
      tpOrder,
      slOrder,
      ownerClientOrderId,
      prefix: this.prefix,
    });

    this.stopOrdersByOwnerShortId.set(ownerClientOrderId, {
      slOrderId: slOrder?.id,
      slClientOrderId: slOrder?.clientOrderId,
      tpOrderId: tpOrder?.id,
      tpClientOrderId: tpOrder?.clientOrderId,
      ownerOrderClientId: ownerClientOrderId,
    });

    return { slOrder, tpOrder };
  }

  private createOrderByTrigger(taskParams: CreateTriggerOrderByTaskParams) {
    const { type, side, amount, params, price } = taskParams;

    log('OrdersBasket::createTriggerOrderByTask', '', { taskParams });

    return this.createOrder(type, side, amount, price, params);
  }

  private generateClientOrderId(
    prefix: string,
    type: OrderType,
    isReduce = false,
    ownerClientOrderId?: string,
    triggerOrderType?: string,
  ) {
    let idPrefix = type === 'market' ? 'M' : 'L';
    if (isReduce && !ownerClientOrderId) {
      idPrefix = 'R';
    }
    let id = `${normalize(tms() / 100, 0)}-${prefix}-${idPrefix}${this.nextOrderId++}`;

    if (ownerClientOrderId) {
      if (this._connectionName === 'gateio') ownerClientOrderId = ownerClientOrderId.replace('t-', '');

      if (triggerOrderType !== 'SL' && triggerOrderType !== 'TP') {
        warning(
          'OrdersBasketgenerateClientOrderId',
          'triggerOrderType (SL or TP) is required to generate clientId for linked stopOrders',
          { prefix, type, isReduce, ownerClientOrderId, triggerOrderType },
        );
      } else {
        id = ownerClientOrderId + '.' + triggerOrderType;
      }
    }

    if (this._connectionName === 'gateio') id = `t-${id}`;

    return id;
  }

  protected parseClientOrderId(clientOrderId: string) {
    if (!clientOrderId) {
      return {
        uniquePrefix: null,
        prefix: null,
        shortClientId: null,
        ownerClientOrderId: null,
        triggerOrderType: null,
        clientOrderId: null,
      };
    }
    const split = clientOrderId.split('-');

    if (this._connectionName === 'gateio') {
      split.shift();
    }

    let shortClientId = split[2];

    let triggerOrderType = undefined;
    let ownerClientOrderId = undefined;
    let shortOwnerClientId = undefined;

    if (shortClientId) {
      let splitShortId = shortClientId.split('.');

      triggerOrderType = splitShortId[1] ?? null;
      shortOwnerClientId = splitShortId[0];
      ownerClientOrderId = triggerOrderType ? split[0] + '-' + split[1] + '-' + shortOwnerClientId : null;
    }

    return {
      uniquePrefix: split[0] ?? null,
      prefix: split[1] ?? null,
      shortClientId,
      ownerClientOrderId,
      triggerOrderType,
      clientOrderId: clientOrderId,
    };
  }

  marginMode = 'cross'; // isolated | cross
  private validateParams(params: Record<string, unknown>): {
    orderParams: Record<string, number | string | boolean>;
    userParams: Record<string, number | string | boolean>;
  } {
    const orderParams = {};
    const userParams = {};

    const allowedParams = {
      positionSide: this.hedgeMode && this._connectionName.toLowerCase().includes('binance'),
      positionIdx: this._connectionName.toLowerCase().includes('bybit') && this.hedgeMode,
      timeInForce: true,
      leverage: true,
      clientOrderId: true,
      stopPrice: true,
      triggerPrice: true,
      reduceOnly: true, // TODO check  - binance generate error if reduceOnly = true and stopPrice or triggerPrice set
      takeProfitPrice: true,
      stopLossPrice: true,
    };

    if (this.hedgeMode) {
      if (this._connectionName.toLowerCase().includes('binance')) {
        allowedParams['reduceOnly'] = false; // for binance -  reduceOnly not used because has positionSide is enough
      }
      if (this._connectionName.toLowerCase().includes('bybit')) {
        params['positionIdx'] = params['positionSide'] === 'long' ? '1' : '2';
      }
    }

    if (this._connectionName.toLowerCase().includes('gateio')) {
      params['marginMode'] = this.marginMode;
    }

    for (let key in params) {
      if (allowedParams[key]) {
        orderParams[key] = params[key];
      } else {
        userParams[key] = params[key];
      }
    }

    log('OrdersBasket::validateParams', '', {
      params,
      userParams,
      orderParams,
      allowedParams,
      connectionName: this._connectionName,
    });

    return { orderParams, userParams };
  }

  //TODO check prefix and return only orders for current Orders Basket
  async getOrders(since = undefined, limit = 100, params: any = undefined) {
    return await getOrders(this.symbol, since, limit, params);
  }

  async getOpenOrders(since = undefined, limit = 100, params: any = undefined) {
    // getOpenOrders is not working in tester mode, use getOrders and filter by status
    if (isTester()) {
      let orders = [];

      for (let order of await this.getOrders()) {
        if (order.status === 'open') {
          orders.push(order);
        }
      }

      return orders;
    }

    try {
      since = since ?? currentTime() - 7 * 24 * 60 * 60 * 1000; // 7 days by default

      return await getOpenOrders(this.symbol, since, limit, params);
    } catch (e) {
      throw errorContext(e, await this.marketInfoShort());
    }
  }

  async getClosedOrders(since = undefined, limit = 100, params: any = undefined) {
    // getClosedOrders is not working in tester mode, use getOrders and filter by status
    if (isTester()) {
      let orders = [];

      for (let order of await this.getOrders()) {
        if (order.status === 'closed') {
          orders.push(order);
        }
      }
      return orders;
    }

    try {
      since = since ?? currentTime() - 30 * 24 * 60 * 60 * 1000; // 7 days by default
      return await getClosedOrders(this.symbol, since, limit, params);
    } catch (e) {
      throw errorContext(e, await this.marketInfoShort());
    }
  }

  getContractsAmount = (usdAmount: number, executionPrice?: number) => {
    if (!executionPrice) {
      executionPrice = this.close();
    }
    // contractSize = 10 xrp
    // xrp = 0.5 usd   1 contract = 10 xrp = 5 usd
    let amount = usdAmount / executionPrice / this.contractSize;

    return amount;
  };

  getUsdAmount = (contractsAmount: number, executionPrice?: number) => {
    if (!executionPrice) {
      executionPrice = this.close();
    }
    // contractSize = 10 xrp
    // xrp = 0.5 usd   1 contract = 10 xrp = 5 usd
    return contractsAmount * executionPrice * this.contractSize; // 1*0.5*10 = 5
  };

  ask() {
    return ask(this.symbol)?.[0];
  }

  askVolume() {
    return ask(this.symbol)?.[1];
  }

  bid() {
    return bid(this.symbol)?.[0];
  }

  bidVolume() {
    return bid(this.symbol)?.[1];
  }

  high() {
    return high(this.symbol);
  }

  low() {
    return low(this.symbol);
  }

  open() {
    return open(this.symbol);
  }

  close() {
    return close(this.symbol);
  }

  price() {
    return close(this.symbol);
  }
  volume() {
    return volume(this.symbol);
  }

  unsubscribe() {
    globals.events.unsubscribeByObjectId(this.id);
    this.triggerService.cancelAll();
  }

  async marketInfoShort(): Promise<MarketInfoShort> {
    let info = {} as MarketInfoShort;

    let posBuy = await this.getPositionBySide('long');
    let posSell = await this.getPositionBySide('short');

    info.symbol = this.symbol;
    info.close = this.close();
    info.buyContracts = posBuy.contracts;
    info.buySizeUsd = this.getUsdAmount(posBuy.contracts, posBuy.entryPrice);
    info.BuyEntryPrice = posBuy.entryPrice;
    info.sellContracts = posSell.contracts;
    info.sellSizeUsd = this.getUsdAmount(posSell.contracts, posSell.entryPrice);
    info.sellEntryPrice = posSell.entryPrice;
    info.leverage = this.leverage;

    return info;
  }

  private async setLeverage(leverage: number) {
    // --- Set leverage ---
    if (!isTester()) {
      let levKey = this.LEVERAGE_INFO_KEY + this._connectionName + '-' + this.symbol;
      let leverageInfo = Number(await globals.storage.get(levKey));

      if (leverageInfo !== this.leverage) {
        try {
          const response = await setLeverage(this.leverage, this.symbol);
          await globals.storage.set(levKey, this.leverage);
          log('Exchange:init', 'setLeverage ' + this.leverage + ' ' + this.symbol, { response });
        } catch (e) {
          // bybit returns error if leverage already set, unfortunately there is no way to check leverage before set.
          if (e.message.includes('leverage not modified') && e.message.includes('bybit')) {
            log('Exchange:init', 'setLeverage ' + this.leverage + ' ' + this.symbol, {
              message:
                'bybit returns error if leverage already set, unfortunately there is no way to check leverage before set.',
            });
            await globals.storage.set(levKey, this.leverage);
          } else {
            throw new BaseError(e, { leverage: this.leverage, symbol: this.symbol, symbolInfo: this.symbolInfo });
          }
        }
      } else {
        log('Exchange:init', 'Leverage already set', { leverage: this.leverage, symbol: this.symbol });
      }
    }
  }
}
