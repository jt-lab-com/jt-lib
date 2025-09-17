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
import { debug, error, errorOnce, log, logOnce, trace, warning } from '../core/log';
import { getArgBoolean, getArgNumber, getArgString, uniqueId } from '../core/base';
import { globals } from '../core/globals';
import { currentTime, timeToString } from '../utils/date-time';
import { positionProfit } from './heplers';
import { isZero, normalize, validateNumbersInObject } from '../utils/numbers';
import { sleep } from '../utils/misc';

export class OrdersBasket extends BaseObject {
  LEVERAGE_INFO_KEY = 'exchange-leverage-info-';
  readonly triggerService: TriggerService;
  protected readonly symbol: string;
  protected _connectionName: string;
  protected hedgeMode = false;
  protected readonly triggerType: TriggerType = 'script';
  protected readonly ordersByClientId = new Map<string, Order>();
  protected readonly userParamsByClientId = new Map<string, Record<string, number | string | boolean>>();

  protected readonly stopOrdersByOwnerShortId = new Map<string, StopOrderData>();
  protected readonly stopOrdersQueue = new Map<string, StopOrderQueueItem>();

  protected symbolInfo: SymbolInfo;
  protected leverage = 1;
  protected prefix: string;
  protected maxLeverage: number;
  contractSize: number;
  _minContractQuoted: number;
  _minContractBase: number;
  _minContractStep: number;

  private nextOrderId = 0;

  isInit = false;
  private isGetPositionsForced: boolean;

  constructor(params: ExchangeParams) {
    super(params);

    // if (!params.connectionName || params.connectionName === '') {
    //   throw new BaseError('OrdersBasket::::constructor Argument "connectionName" is not defined', params);
    // }

    if (!params.symbol || params.symbol === '') {
      throw new BaseError('OrdersBasket::::constructor Argument "symbol" is not defined', params);
    }

    this.connectionName = params.connectionName || getArgString('connectionName', undefined);
    this.triggerType = params.triggerType ?? 'script'; // exchange or script
    this.symbol = params.symbol; // TODO validate symbol
    this.leverage = params.leverage ?? this.leverage;
    this.hedgeMode = params.hedgeMode || getArgBoolean('hedgeMode', undefined) || false;

    this.setPrefix(params.prefix);

    globals.events.subscribeOnOrderChange(this.beforeOnPnlChange, this, this.symbol);
    globals.events.subscribeOnOrderChange(this.beforeOnOrderChange, this, this.symbol);

    const onTickInterval = params.onTickInterval || 1000;
    globals.events.subscribeOnTick(this.beforeOnTick, this, this.symbol, onTickInterval);

    const symbol = this.symbol;
    this.triggerService = new TriggerService({ idPrefix: this.symbol, symbol, storageKey: symbol });
    this.triggerService.registerPriceHandler(symbol, 'executeStopLoss', this.createOrderByTrigger, this);
    this.triggerService.registerPriceHandler(symbol, 'executeTakeProfit', this.createOrderByTrigger, this);
    this.triggerService.registerPriceHandler(symbol, 'createOrderByTrigger', this.createOrderByTrigger, this);

    this.triggerService.registerOrderHandler('creteSlTpByTriggers', this.createSlTpByTriggers, this);
    this.triggerService.registerOrderHandler('cancelSlTpByTriggers', this.cancelSlTpByTriggers, this);

    this.addChild(this.triggerService);
  }

  async init() {
    try {
      this.symbolInfo = await this.getSymbolInfo();
      logOnce('OrdersBasket::getSymbolInfo ' + this.symbol, 'symbolInfo', this.symbolInfo);
      this.isInit = true;
      this.maxLeverage = getArgNumber('defaultLeverage', 10);

      // if (!isTester()) {
      //   if (!this.symbolInfo) {
      //     throw new BaseError('OrdersBasket::init symbolInfo is not defined for symbol ' + this.symbol, {
      //       symbol: this.symbol,
      //     });
      //   }
      // } else {
      //   //TODO update symbol info for futures in tester (then delete code below)
      //   this.symbolInfo['limits']['amount']['min'] = 0.00001;
      //
      //   if (this._connectionName.includes('binance')) {
      //     this.symbolInfo['limits']['cost']['min'] = 5;
      //   }
      // }

      this.contractSize = this.symbolInfo.contractSize ?? 1;
      this.maxLeverage = this.symbolInfo['limits']['leverage']['max'] ?? this.maxLeverage;
      this.updateLimits();

      await this.setLeverage(this.leverage);

      if (this.triggerType !== 'script' && this.triggerType !== 'exchange') {
        throw new BaseError('OrdersBasket::init', 'Wrong trigger type ' + this.triggerType);
      }

      //get opens orders

      const openOrders = await this.getOpenOrders();

      if (openOrders.length > 0) {
        for (const order of openOrders) {
          const { clientOrderId } = order.clientOrderId;

          this.ordersByClientId.set(clientOrderId, { ...order });
        }
      }

      //Positions slot initialization
      this.posSlot['long'] = await this.getPositionBySide('long', true);
      this.posSlot['short'] = await this.getPositionBySide('short');

      log('OrdersBasket::init', '', this.orderBasketInfo(), true);
    } catch (e) {
      this.isInit = false;
      throw new BaseError(e);
    }
  }
  orderBasketInfo() {
    return {
      symbol: this.symbol,
      triggerType: this.triggerType + '',
      connectionName: this._connectionName,
      hedgeMode: this.hedgeMode,
      prefix: this.prefix,
      leverage: this.leverage,
      maxLeverage: this.maxLeverage,
      contractSize: this.contractSize,
      _minContractQuoted: this._minContractQuoted,
      _minContractBase: this._minContractBase,
      minContractStep: this._minContractStep,
      loadedOpenOrders: this.ordersByClientId.size,
    };
  }
  private async beforeOnTick() {
    return await this.onTick();
  }

  updateLimits() {
    this._minContractStep = this.symbolInfo.limits.amount.min;

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
    const { prefix, shortClientId, ownerClientOrderId, triggerOrderType, clientOrderId } = this.parseClientOrderId(
      order.clientOrderId,
    );

    //TODO filtering by prefix??
    // if (prefix !== this.prefix)
    //   return { status: 'not processed', orderPrefix: prefix, currentPrefix: this.prefix, order };

    try {
      if (
        (triggerOrderType === 'TP' || triggerOrderType === 'SL') &&
        order.status === 'closed' &&
        this.triggerType === 'exchange'
      ) {
        await this._cancelSecondSlTp(order.clientOrderId);
      }
    } catch (e) {
      error(e, { order });
    }

    //sometimes orders not coming to websocket
    //TODO write test for position update in websocket
    // await this.getPositions(true);

    this.ordersByClientId.set(clientOrderId, { ...order });
    return await this.onOrderChange(order);
  }

  private async _cancelSecondSlTp(orderId: string) {
    let oppositeId: string;

    if (orderId.includes('.TP')) {
      oppositeId = orderId.replace('.TP', '.SL');
    } else if (orderId.includes('.SL')) {
      oppositeId = orderId.replace('.SL', '.TP');
    } else {
      throw new BaseError('OrdersBasket::_cancelSecondSlTp wrong orderId format', { orderId });
    }

    const idToCancel = this.ordersByClientId.get(oppositeId)?.id;

    if (orderId) {
      await this.cancelOrder(idToCancel);
    } else {
      warning('OrdersBasket::_cancelSecondSlTp', 'Opposite order not found', { oppositeId });
    }

    log('OrdersBasket::_cancelSecondSlTp', orderId, { orderId, oppositeId, idToCancel });
  }

  async onOrderChange(order: Order): Promise<any> {
    return { order };
  }

  posSlot: Record<string, Position> = {
    long: this.emulatePosition('long'),
    short: this.emulatePosition('short'),
  };

  private async _updatePosSlot(order: Order): Promise<number> {
    if (order.status !== 'closed') {
      return 0;
    }

    const isReduce = order.reduceOnly;
    let side = order.side === 'buy' ? 'long' : 'short';
    if (isReduce) side = side === 'long' ? 'short' : 'long';

    const posSide = side;

    const position: Position = this.posSlot[posSide];

    if (!position.side) position.side = side;

    //TODO investigate why order.price is 0 on market orders in some exchanges
    let orderPrice = isTester() ? order.price : order.average;

    if (isZero(orderPrice)) orderPrice = this.close();
    let pnl = 0;

    let amountChange = order.filled;
    const prevOrder = this.ordersByClientId.get(order.clientOrderId);
    if (prevOrder && prevOrder.filled > 0) {
      amountChange = order.filled - prevOrder.filled;
    }

    if (amountChange <= 0) {
      this.posSlot[posSide] = await this.getPositionBySide(posSide as 'long' | 'short');
      throw new BaseError('OrdersBasket::_updatePosSlot amountChange <= 0', {
        posSide,
        isReduce,
        orderPrice,
        posPrice: position.entryPrice,
        amountChange,
        position,
        order,
        prevOrder,
      });
    }

    if (isReduce) {
      pnl = positionProfit(side, position.entryPrice, orderPrice, amountChange, this.contractSize);
      position.profit += pnl;
    }

    if (!isReduce) {
      position.entryPrice =
        (position.contracts * position.entryPrice + amountChange * orderPrice) / (position.contracts + amountChange);
      position.contracts += amountChange;
    } else {
      if (position.contracts - amountChange === 0) {
        position.entryPrice = 0;
      }
      position.contracts -= amountChange;
    }

    position.contracts = isZero(position.contracts) ? 0 : position.contracts;
    position.notional = this.getUsdAmount(position.contracts, position.entryPrice);

    if (position.contracts < 0) {
      throw new BaseError('OrderBasket::_updatePosSlot posSlot.size < 0', {
        order,
        posSlot: this.posSlot,
        positions: await this.getPositions(),
      });
    }
    if (position.contracts > 0 && position.entryPrice <= 0) {
      throw new BaseError('OrderBasket::_updatePosSlot posSlot.entryPrice <= 0', {
        order,
        posSlot: this.posSlot,
        positions: await this.getPositions(),
      });
    }

    this.posSlot[posSide] = position;
    log('OrdersBasket::_updatePosSlot ' + this.symbol, 'Position slot updated', {
      pnl,
      posSide,
      isReduce,
      orderPrice,
      posPrice: position.entryPrice,
      amountChange,
      position,
      order,
    });
    return pnl;
  }

  async beforeOnPnlChange(order: Order): Promise<any> {
    try {
      if (order.status === 'closed') {
        let pnl = 0;
        try {
          pnl = await this._updatePosSlot(order);
        } catch (e) {
          errorOnce(e, {});
          this.posSlot['long'] = await this.getPositionBySide('long', true);
          this.posSlot['short'] = await this.getPositionBySide('short');
          return;
        }

        if (pnl !== 0) {
          await this.onPnlChange(pnl, 'pnl');
          await globals.events.emit('onPnlChange', { type: 'pnl', amount: pnl, symbol: this.symbol, order });
        }

        if (order.fee?.cost) {
          await this.onPnlChange(order.fee.cost, 'fee');
          await globals.events.emit('onPnlChange', { type: 'fee', amount: order.fee.cost, symbol: this.symbol, order });
        }
      }
    } catch (e) {
      error(e, { order });
    }
  }

  async onPnlChange(amount: number, type: 'fee' | 'pnl' | 'transfer'): Promise<any> {}

  createSlTpByTriggers = async (args: { clientOrderId: string; symbol: string; sl: number; tp: number }) => {
    //  trace('OrdersBasket::creteSlTpByTriggers', 'Creating SL/TP by triggers', args);
    const { slOrder, tpOrder } = await this.createSlTpOrders(args.clientOrderId, args.sl, args.tp);
  };

  cancelSlTpByTriggers = async (args: { taskId?: string; clientOrderId?: string }) => {
    if (!args.clientOrderId) {
      await this.cancelOrder(args.clientOrderId);
    }

    if (args.taskId) {
      this.triggerService.cancelOrderTask(args.taskId);
    }
  };

  /**
   * Create order on exchange
   * @param type - 'market' or 'limit'
   * @param side - 'buy' or 'sell'
   * @param amount - order amount
   * @param price -  order price
   * @param params - if params['sl'] or params['tp'] set, stop orders will be created automatically by this order.
   * @returns {Promise<Order>}
   *

   *
   */
  async createOrder(
    type: OrderType,
    side: OrderSide,
    amount: number,
    price: number,
    params: Record<string, unknown>,
  ): Promise<Order> {
    const args = { type, side, amount, price, params };

    if (!this.isInit) throw new BaseError('OrdersBasket::createOrder - OrdersBasket is not initialized', args);
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
      params['postfix'] as string,
    );

    params.clientOrderId = clientOrderId;

    // If stop orders params set, save it to stopOrdersQueue then this params will be used in onOrderChange function
    // stop orders will be created when owner order executed (status = 'closed')
    if (params['sl'] || params['tp']) {
      const sl = params['sl'] || 0;
      const tp = params['tp'] || 0;
      this.stopOrdersQueue.set(clientOrderId, {
        ownerOrderId: clientOrderId,
        sl: params['sl'] as number,
        tp: params['tp'] as number,
        prefix: this.prefix,
      });

      const taskId = this.triggerService.addTaskByOrder({
        clientOrderId,
        args: { clientOrderId, sl, tp },
        name: 'creteSlTpByTriggers',
        status: 'closed',
        canReStore: true,
      });

      if (this.triggerType === 'exchange') {
        this.triggerService.addTaskByOrder({
          clientOrderId,
          args: { taskId },
          name: 'cancelSlTpByTriggers',
          status: 'canceled',
          canReStore: true,
        });
      }

      log('OrdersBasket::createOrder', 'Stop orders params saved', this.stopOrdersQueue.get(clientOrderId));
    }

    const triggerPrice = params.triggerPrice || params.stopLossPrice || params.takeProfitPrice;

    if (triggerPrice && this.triggerType === 'script') {
      const ownerClientOrderId = params.ownerClientOrderId as string;

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

      const group = ownerClientOrderId || (params?.triggerGroup as string);
      taskId = this.triggerService.addTaskByPrice({
        name: taskName,
        triggerPrice: triggerPrice as number,
        symbol: this.symbol,
        group,
        args: orderParams,
        canReStore: true,
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

      return {
        clientOrderId,
        id: null,
        msg: 'trigger order added to TriggerService queue because OrderBasket.triggerType=script',
      } as Order;
    }

    const { orderParams, userParams } = this.validateParams(params);

    let order: Order;

    const orderArgs = { symbol: this.symbol, type, side, amount, price, params: orderParams };
    try {
      order = await createOrder(this.symbol, type, side, amount, price, orderParams);

      // After creating the order, we force an update of the positions to ensure accuracy.
      // Because positions may not be updated by websocket
      this.isGetPositionsForced = true;
    } catch (e) {
      e.message = 'ExchangeAPI:: ' + e.message;
      throw new BaseError(e, {
        orderArgs,
        userParams,
        args,
        marketInfo: await this.marketInfoShort(),
        e,
      });
    }
    if (this.connectionName.includes('bybit') && !isTester() && order.id) {
      //TODO emulate order for bybit (bybit return only id) -> move it to Environment

      // debug('OrdersBasket::createOrder', 'Emulated order for  bybit', { order, emulateOrder });
      order = this.emulateOrder(type, side, amount, price, {
        ...orderParams,
        id: order.id,
        error: order.error,
        filled: type === 'market' ? amount : 0,
      });
    }

    //this.ordersByClientId.set(clientOrderId, order);
    this.userParamsByClientId.set(clientOrderId, userParams);

    if (!order.id) {
      error('OrdersBasket::createOrder', 'Order not created', {
        orderArgs,
        userParams,
        order,
        marketInfo: await this.marketInfoShort(),
        params,
        args,
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
    const order: Order = {
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
  getOrderUserParams(clientOrderId: string): Record<string, number | string | boolean> {
    const userParams = this.userParamsByClientId.get(clientOrderId);
    return userParams ?? {};
  }

  setPrefix(prefix?: string): void {
    this.prefix = prefix ?? uniqueId(4);

    log('OrdersBasket::setPrefix', 'Prefix set to ' + this.prefix);
  }

  getPrefix() {
    return this.prefix;
  }

  /**
   * Create market buy order (futures opened long position)
   * @param amount - order amount of the base currency (for futures - contracts)
   * @param tp - take profit price if tp = 0, take profit order will not be created
   * @param sl - stop loss price if sl = 0, stop loss order will not be created
   * @param params - params for createOrder function (see createOrder function)
   */
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

      if (!order || !order.id) {
        warning('Exchange:cancelOrder', 'Order not found or already canceled', { orderId, symbol: this.symbol });
      }

      log('OrderBasket:cancelOrder', 'Order canceled', { orderId, symbol: this.symbol, order: { ...order } });

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
    const orders = await this.getOpenOrders();
    for (const order of orders) {
      const result = await this.cancelOrder(order.id);

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

  private emulatePosition(side: 'long' | 'short') {
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
  async getPositionBySide(side: 'short' | 'long', isForce = false): Promise<Position> {
    if (side !== 'long' && side !== 'short') {
      throw new BaseError(`OrdersBasket::getPositionBySide`, `wrong position side: ${side}`);
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
      return this.emulatePosition(side);
    }
    return pos;
  }

  async getPositions(isForce = false) {
    if (this.isGetPositionsForced) {
      isForce = true;
      this.isGetPositionsForced = false;
    }
    const positions = await getPositions([this.symbol], { forceFetch: isForce });

    if (!isTester() && globals.isDebug) {
      logOnce('OrdersBasket::getPositions', this.symbol, { positions, isForce });
    }
    return positions;
  }

  private async createSlTpOrders(ownerClientOrderId: string, sl?: number, tp?: number) {
    if (!sl && !tp) return;

    const orderToClose = this.ordersByClientId.get(ownerClientOrderId);

    //debug('OrdersBasket::createSlTpOrders', 'Order to close', { orderToClose, ownerClientOrderId, sl, tp });

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

  /**
   * Generate unique client order id for order
   * @param prefix - unique prefix for orders basket
   * @param type - 'market' or 'limit'
   * @param isReduce - if true, order is reduce only
   * @param ownerClientOrderId - if order is linked to another order, this is owner order id
   * @param triggerOrderType - 'SL' or 'TP' for linked stop orders
   * @returns {string} - generated client order id
   * Example:
   * market order - 1691234567890-uniquePrefix-M1234
   * limit order - 1691234567890-uniquePrefix-L1234
   * reduce only order - 1691234567890-uniquePrefix-R1234
   * Take profit order - 1691234567890-uniquePrefix-1234.TP
   * Stop loss order - 1691234567890-uniquePrefix-1234.SL
   */

  private generateClientOrderId(
    prefix: string,
    type: OrderType,
    isReduce = false,
    ownerClientOrderId?: string,
    triggerOrderType?: string,
    postfix: string = null,
  ) {
    //TODO check '-' '.' in params
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

    if (postfix) id = id + '-' + postfix;
    if (this._connectionName === 'gateio') id = `t-${id}`;

    return id;
  }

  /**
   * Parse client order id to get order info
   * @param clientOrderId
   * @protected
   * @return {object} - parsed client order id
   * Example:
   * clientOrderId: 1691234567890-01-M1234.TP
   * {
   *   uniquePrefix: '1691234567890',
   *   prefix: '01',
   *   shortClientId: 'M1234.TP',
   *   ownerClientOrderId: '1691234567890-01-M1234',
   *   ClientOrderId: '1691234567890-01-M1234',
   *   triggerOrderType: 'TP',
   *   clientOrderId: '169123456789
   *
   * }

   */

  protected parseClientOrderId(clientOrderId: string) {
    if (!clientOrderId) {
      return {
        uniquePrefix: null,
        prefix: null,
        shortClientId: null,
        ownerClientOrderId: null,
        triggerOrderType: null,
        clientOrderId: null,
        postfix: null,
      };
    }
    const split = clientOrderId.split('-');

    if (this._connectionName === 'gateio') {
      split.shift();
    }

    const shortClientId = split[2];

    let triggerOrderType = undefined;
    let ownerClientOrderId = undefined;
    let shortOwnerClientId = undefined;

    if (shortClientId) {
      const splitShortId = shortClientId.split('.');

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
      postfix: split[3] ?? null,
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
      positionSide:
        (this.hedgeMode && this._connectionName.toLowerCase().includes('binance')) ||
        this._connectionName.includes('mock'),
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

      if (isTester()) {
        allowedParams['positionSide'] = true;
      }
    }

    if (this._connectionName.toLowerCase().includes('gateio')) {
      params['marginMode'] = this.marginMode;
    }

    for (const key in params) {
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
    //TODO: validate orders type only is open -> clear orders with other status
    // getOpenOrders is not working in tester mode, use getOrders and filter by status
    if (isTester()) {
      const orders = [];

      for (const order of await this.getOrders()) {
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
      throw new BaseError(e, await this.marketInfoShort());
    }
  }

  async getClosedOrders(since = undefined, limit = 100, params: any = undefined) {
    // getClosedOrders is not working in tester mode, use getOrders and filter by status
    if (isTester()) {
      const orders = [];

      for (const order of await this.getOrders()) {
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
      throw new BaseError(e, await this.marketInfoShort());
    }
  }

  getContractsAmount = (usdAmount: number, executionPrice?: number) => {
    //TODO check precision of amount and round it
    if (!executionPrice) {
      executionPrice = this.close();
    }
    // contractSize = 10 xrp
    // xrp = 0.5 usd, usdAmount = 5 usd | amount = 5 / 0.5 / 10 = 1
    const amount = usdAmount / executionPrice / this.contractSize;

    return amount;
  };

  //TODO check naming getUsdAmount
  getUsdAmount = (contractsAmount: number, executionPrice?: number) => {
    if (!executionPrice) {
      executionPrice = this.close();
    }
    // contractSize = 10 xrp
    // xrp = 0.5 usd, contractsAmount = 1 | usdAmount = 1 * 0.5 * 10 = 5
    return contractsAmount * executionPrice * this.contractSize; // 1*0.5*10 = 5
  };

  ask() {
    //TODO fix ask bid in tester
    if (isTester()) return this.price();
    return ask(this.symbol)?.[0];
  }

  askVolume() {
    return ask(this.symbol)?.[1];
  }

  bid() {
    if (isTester()) return this.price();
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
    const info = {} as MarketInfoShort;

    info.symbol = this.symbol;
    info.price = this.price();
    info.ob = { ask: ask(this.symbol), bid: bid(this.symbol), spread: this.ask() - this.bid() };
    info.positions = await this.getPositions();
    info.timeInfo = {
      t: { ex: tms(this.symbol), srv: Date.now(), diff: Date.now() - tms(this.symbol) },
      st: { ex: timeToString(tms(this.symbol)), srv: timeToString(Date.now()) },
    };
    return info;
  }

  async setLeverage(leverage: number) {
    if (leverage) this.leverage = leverage;

    if (this.leverage > this.maxLeverage) {
      throw new BaseError('OrderBasket:init leverage (' + this.leverage + ') is high for symbol ' + this.symbol, {
        symbol: this.symbol,
        leverage: this.leverage,
        maxLeverage: this.maxLeverage,
      });
    }
    const levKey = this.LEVERAGE_INFO_KEY + this._connectionName + '-' + this.symbol;
    const leverageInfo = !isTester() ? Number(await globals.storage.get(levKey)) : -1;

    if (leverageInfo !== this.leverage) {
      try {
        const response = await setLeverage(this.leverage, this.symbol);
        await globals.storage.set(levKey, this.leverage);
        log('OrderBasket:setLeverage', this.leverage + ' ' + this.symbol, { response });
      } catch (e) {
        // bybit returns error if leverage already set, unfortunately there is no way to check leverage before set.
        if (e.message.includes('leverage not modified') && e.message.includes('bybit')) {
          log('OrderBasket:setLeverage', this.leverage + ' ' + this.symbol, {
            message:
              'bybit returns error if leverage already set, unfortunately there is no way to check leverage before set.',
          });
          await globals.storage.set(levKey, this.leverage);
        } else {
          throw new BaseError(e, { leverage: this.leverage, symbol: this.symbol, symbolInfo: this.symbolInfo });
        }
      }
    } else {
      log('OrderBasket:setLeverage', 'Leverage already set', { leverage: this.leverage, symbol: this.symbol });
    }
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
    return await symbolInfo(this.symbol);
  }
}
