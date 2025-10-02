declare global {
  /// <reference path="order.interface.ts" />
  /// <reference path="position.interface.ts" />
  /// <reference path="report.interface.ts" />
  /// <reference path="symbol.interface.ts" />
  /// <reference path="tick.interface.ts" />
  /// <reference path="candle.interface.ts" />
  type GlobalARGS = {
    connectionName: string;
    symbols: string; // "BTC/USDT,ETH/USDT"
    symbol: string; //"BTC/USDT"
    start: string; //"2021-01"  // tester only
    end: string; //"2021-12"  // tester only
    startDate: Date; //"2021-01-01T00:00:00.000Z" tester only
    endDate: Date; // "2021-12-31T23:59:59.999Z" tester only
    timeframe: string; // tester only
    optimizerIteration: number; // tester only
    makerFee: number; // tester only
    takerFee: number; // tester only
    marketOrderSpread: number; // tester only
    balance: number; // tester only
    leverage: number; // tester only
  } & Record<string, string | number | boolean>;

  const ARGS: GlobalARGS;

  export type Tick = TickTypes.Tick;
  export type Order = OrderTypes.Order;
  export type OrderType = OrderTypes.OrderType;
  export type OrderSide = OrderTypes.OrderSide;

  export type Candle = CandleTypes.Candle;
  export type OHLC = CandleTypes.OHLC;

  export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '1d';

  export type ReportData = ReportTypes.ReportData;
  export type ReportBlock = ReportTypes.ReportBlock;
  export type ReportBlockType = ReportTypes.ReportBlockType;
  export type ReportBlockData = ReportTypes.ReportBlockData;
  export type GenericReportBlock = ReportTypes.GenericReportBlock;
  export type TableRow = ReportTypes.TableRow;
  export type CardData = ReportTypes.CardData;
  export type CardOptions = ReportTypes.CardOptions;
  export type ChartData = ReportTypes.ChartData;
  export type Series = ReportTypes.Series;
  export type ActionButtonData = ReportTypes.ActionButtonData;
  export type TextData = ReportTypes.TextData;
  export type TVChartData = ReportTypes.TVChartData;
  export type PlaybackChartSymbolData = ReportTypes.PlaybackChartSymbolData;
  export type PlaybackChartCard = ReportTypes.PlaybackChartCard;
  export type PlaybackChartBaseCard = ReportTypes.PlaybackChartBaseCard;
  export type PlaybackChartTextCard = ReportTypes.PlaybackChartTextCard;
  export type PaybackChartFormulaCard = ReportTypes.PaybackChartFormulaCard;
  export type PlaybackChartDateCard = ReportTypes.PlaybackChartDateCard;
  export type PlaybackChartCurrencyCard = ReportTypes.PlaybackChartCurrencyCard;
  export type TableDataReportBlock = ReportTypes.TableDataReportBlock;
  export type CardDataReportBlock = ReportTypes.CardDataReportBlock;
  export type ChartDataReportBlock = ReportTypes.ChartDataReportBlock;
  export type TextReportBlock = ReportTypes.TextReportBlock;
  export type OptimizerResultsReportBlock = ReportTypes.OptimizerResultsReportBlock;
  export type TVChartReportBlock = ReportTypes.TVChartReportBlock;

  export type TVChartPlayerReportBlock = ReportTypes.TVChartPlayerReportBlock;

  export type PlaybackChartVisibleRange = ReportTypes.PlaybackChartVisibleRange;
  export type PlaybackChartShape = ReportTypes.PlaybackChartShape;
  export type PlaybackChartShapeOptions = ReportTypes.PlaybackChartShapeOptions;
  export type PlaybackChartPriceLine = ReportTypes.PlaybackChartPriceLine;
  export type PlaybackChartPriceLineOptions = ReportTypes.PlaybackChartPriceLineOptions;
  export type LineSeries = ReportTypes.LineSeries;
  export type TVChartSeriesLineWidth = ReportTypes.TVChartSeriesLineWidth;
  export type TVChartSeriesLineStyle = ReportTypes.TVChartSeriesLineStyle;
  export type TVChartSeriesLineType = ReportTypes.TVChartSeriesLineType;
  export type FormulaOptions = ReportTypes.FormulaOptions;
  export type DateOptions = ReportTypes.DateOptions;
  export type CurrencyOptions = ReportTypes.CurrencyOptions;
  export type CardType = ReportTypes.CardType;
  export type CardVariant = ReportTypes.CardVariant;
  export type CardNumberFormat = ReportTypes.CardNumberFormat;

  export type Position = PositionTypes.Position;
  export type PositionSide = PositionTypes.PositionSide;

  export type PositionSideType = OrderTypes.PositionSideType;

  export type SymbolInfo = SymbolTypes.Symbol;

  export enum ReportBlockType {
    DRAWDOWN_CHART = 'drawdown_chart',
    TABLE = 'table',
    CHART = 'chart',
    CARD = 'card',
    ACTION_BUTTON = 'action_button',
  }

  /**
   * BaseScriptInterface - base script interface for all scripts (tester, live, optimizer)
   * @abstract - abstract class
   * @property {GlobalARGS} args - script arguments (startDate, endDate, symbol, timeframe) and other custom arguments provided by user
   * @property {number} timeframe - candle timeframe
   * @property {string} exchange - exchange name required for live
   * @property {string} symbol - symbol name required
   * @property {string} interval - interval for timer. If it set in script used onTimer() method instead of onTick()
   *
   */
  abstract class BaseScriptInterface {
    protected constructor(args: GlobalARGS);

    connectionName: string;
    symbols: string[];
    interval: number;

    init(): Promise<void>;
    run: () => Promise<void> | void;
    stop: () => Promise<void> | void | never;

    runOnTick: (data: Tick) => Promise<void> | void;
    runTickEnded: (data: Tick) => Promise<void> | void;
    runOnTimer: () => Promise<void> | void;
    runOnOrderChange: (data: Order[]) => Promise<void> | void;
    runOnError: (e: any) => Promise<void | never> | never | void;
    runArgsUpdate: (args: GlobalARGS) => Promise<void> | void;
    runOnReportAction: (action: string, payload: any) => Promise<void> | void;
  }

  /*
  Trading API LIST
  ##createOrder
  createOrder(symbol: string, type: OrderType, side: OrderSide, amount: number, price: number, params: Record<string, unknown>): Promise<Order>;
   */

  //-------environment functions-----------------
  /**
   * getArtifactsKey - return artifact key for current script. It used to store report data in artifacts storage.
   * @returns {string} - artifact key
   * @example:
   * let artifactsKey = getArtifactsKey();
   * let reportUrl = "https://env1.jtnodes.one/report/" + artifactsKey ;
   */
  function getArtifactsKey(): string;

  /**
   * registerCallback - register callback for trading functions (only for developer mode)
   * @param funcName - function name (createOrder, cancelOrder, modifyOrder, getOrders, getPositions, getBalance)
   * @param callback - callback function (async only)
   */
  function registerCallback(funcName: string, callback: (...args: any[]) => void): void;

  /**
   * isTester - return true if current script is running in tester
   * @returns {boolean}
   * @example:
   * if (isTester()) {
   * // do something only for tester
   * }
   */
  function isTester(): boolean;

  function getErrorTrace(stack: string): Promise<string>;

  /**
   * updateReport - update report for current script; Max update frequency 1 time per second. Max report size 1MB
   * !important: avoid calling in the loops without interval execution control (for , onTick, onTimer - especially in tester)
   * @see Report class for more details @link ./report.md
   * @param data - report data blocks [charts, tables, cards, trading view charts, optimization results]
   * @returns {Promise<void>}
   *
   */
  function updateReport(data: ReportData): Promise<void>;

  function setCache(key: string, value: any): Promise<void>;

  /**
   * getCache - return cache value
   * @param key - cache key
   * */
  function getCache<T>(key: string): Promise<T>;

  /**
   * getPrefix - return prefix of the current script scenario
   * prefix is used when order is created in clientOrderId = {prefix + "." +  user clientOrderId provided in params}
   * if user not provide clientOrderId in params it will be generated automatically as {prefix + "." +  hash of timestamp}
   * @returns {string}
   */
  function getPrefix(): string;

  /**
   * setLeverage - set leverage for futures trading
   * @param leverage - leverage value (1-125)
   * @param symbol - symbol name spot (BTC/USDT) or futures (BTC/USDT:USDT)
   */
  function setLeverage(leverage: number, symbol: string): Promise<any>;

  //--------Trading Api-----------------

  /**
   * getSymbolInfo - return symbol info object
   * @param symbol - symbol name spot (BTC/USDT) or futures (BTC/USDT:USDT)
   * @returns {Promise<SymbolInfo>}
   */
  function symbolInfo(symbol: string): Promise<SymbolInfo>;

  /**
   * tsm - return timestamp of the current candle
   * @returns {number}
   */
  function tms(symbol? = undefined): number;

  /**
   *open  - return open price of the current candle
   * @returns {number}
   */
  function open(symbol?: string): number;

  /**
   * high  - return high price of the current candle
   * @returns {number}
   */
  function high(symbol?: string): number;

  /**
   * volume - return volume of the current candle
   * @returns {number}
   */
  function low(symbol?: string): number;

  /**
   * close - return the current price of the current candle
   * @returns {number}
   */
  function close(symbol?: string): number;

  /**
   * volume - return volume of the current candle
   * @returns {number}
   * @param symbol - symbol name spot (BTC/USDT) or futures (BTC/USDT:USDT)
   */
  function volume(symbol?: string): number;

  /**
   * getFee  - return fee for all executed orders for current script (only for tester)
   * @returns {number}
   * @example:
   * let fee = getFee();
   * console.log("Fee " + fee);
   */
  function getFee(): number;

  /**
   * ask - return ask price (first price from order book) for current symbol
   * @returns {[number, number]}
   * @example:
   * let askPrice = ask();
   * console.log("Ask price " + askPrice);
   */
  function ask(symbol?: string, index: number = 0): [number, number];

  /**
   * bid - return bid price (first price from order book) for current symbol
   * @returns {[number, number]}
   * @example:
   * let bidPrice = bid();
   * console.log("Bid price " + bidPrice);
   */
  function bid(symbol?: string, index: number = 0): [number, number];

  //---------------------- Trading functions ----------------------------

  /**
   * getPositions - return array of positions for current script
   * @returns {Promise<Position[]>}
   * options - forceFetch: boolean - if true, fetch positions from exchange, otherwise return cached positions
   * @example:
   * let positions = await getPositions();
   * for (let position of positions) {
   *  console.log("Symbol " + position.symbol + " size " + position.contracts + " entryPrice " + position.entryPrice);
   * }
   *
   */
  function getPositions(symbols?: string[], options = {}): Promise<Position[]>;

  /**
   * getBalance  - return balance for current script
   * @returns {Promise<{total: {USDT: number}, used: {USDT: number}, free: {USDT: number}}>}
   * @example:
   * let balance = await getBalance();
   * console.log("Free balance " + balance.free.USDT);
   */
  function getBalance(): Promise<{
    total: { USDT: number; [coin: string]: number };
    used: { USDT: number; [coin: string]: number };
    free: { USDT: number; [coin: string]: number };
  }>;

  /**
   * getOrders - return array of orders for symbol
   * @param symbol - symbol name spot (BTC/USDT) or futures (BTC/USDT:USDT)
   * @param since - start time of the orders (timestamp)
   * @param limit - limit of the orders
   * @param params - additional params
   * @returns {Promise<Order[]>}
   * @example:
   * let orders = await getOrders('BTC/USDT', 0, 10);
   * for (let order of orders) {
   *  // do something
   * }
   */
  function getOrders(symbol: string, since = 0, limit = 500, params: any = undefined): Promise<Order[]>;

  /**
   * getOpenOrders - return array of orders for symbol with status `open`
   * @param symbol {string} - symbol name spot (BTC/USDT) or futures (BTC/USDT:USDT)
   * @param since  {number} - start time of the orders (timestamp) (optional)
   * @param limit {number} - limit of the orders (optional)
   * @param params {any} - additional params (optional)
   * @returns {Promise<Order[]>}
   * @example:
   * let orders = await getOpenOrders('BTC/USDT', 0, 10);
   * for (let order of orders) {
   *  // do something
   * }
   */
  function getOpenOrders(symbol: string, since = 0, limit = 500, params: any = undefined): Promise<Order[]>;

  /**
   * getClosedOrders - return array of orders for symbol
   * @param symbol - symbol name spot (BTC/USDT) or futures (BTC/USDT:USDT)
   * @param since - start time of the orders (timestamp)
   * @param limit - limit of the orders
   * @param params - additional params
   * @returns {Promise<Order[]>}
   * @example:
   * let orders = await getClosedOrders('BTC/USDT', 0, 10);
   * for (let order of orders) {
   *  // do something
   * }
   */
  function getClosedOrders(symbol: string, since = 0, limit = 500, params: any = undefined): Promise<Order[]>;

  /**
   * getOrder - return order by id for symbol
   * @param id - order id
   * @param symbol - symbol name (required for some exchanges)
   */
  function getOrder(id: string, symbol = ''): Promise<Order>;

  /**
   * getProfit  - return profit for all closed positions for current script (only for tester)
   * @returns {number}
   */
  function getProfit(): Promise<number>;

  /** getHistory - return array of candles
   *  @param symbol - symbol name
   *  @param timeframe - candle timeframe (1m, 5m, 15m, 1h, 1d ...)
   *  @param startTime - start time of the candles
   *  @param limit - limit of the candles
   *  @returns {OHLC[]} - array of candles [timestamp, open, high, low, close, volume]
   *
   *  @example:
   *  let candles = getHistory('BTC/USDT', '1h', 1614556800000, 10);
   *
   *  log('candles', '', candles[0],true);
   *
   *  //output: [1614556800000, 50000, 51000, 49000, 50500, 1000];
   */
  function getHistory(symbol: string, timeframe: TimeFrame, startTime: number, limit?: number): Promise<OHLC[]>;

  /**
   * createOrder - create order and return order object or reject object with error message
   * @param symbol - order symbol
   * @param type - order type (limit, market)
   * @param side - order side (buy, sell)
   * @param amount - order amount (quantity) in base currency (BTC/USDT - amount in BTC, ETH/USDT - amount in ETH)
   * @param price - order price (for limit order)
   * @param params - additional params
   * @returns {Promise<Order>}
   *
   * @example:
   * // create market order - execute immediately
   * let order = await createOrder('BTC/USDT', 'market', 'buy', 0.01, 10000, {});
   *
   * //create stop loss order
   * let sl = await createOrder('BTC/USDT', 'market', 'sell', 0.01, 9000, {stopLossPrice: 9000, reduceOnly: true});
   *
   * //create take profit order
   * let tp = await createOrder('BTC/USDT', 'market', 'sell', 0.01, 11000, {takeProfitPrice: 11000, reduceOnly: true});
   * //!important: stop loss or take profit order must be canceled if one of them is executed
   * //take see class Exchange to automate this process
   *
   */
  function createOrder(
    symbol: string,
    type: OrderType,
    side: OrderSide,
    amount: number,
    price: number,
    params: Record<string, unknown>,
  ): Promise<Order>;

  /**
   * cancelOrder - cancel order and return order object or reject object with error message
   * @param id - order id
   * @param symbol - order symbol
   * @returns {Promise<Order>}
   */
  function cancelOrder(id: string, symbol: string): Promise<Order>;

  /**
   * modifyOrder - modify order and return order object or reject object with error message
   * @param id - order id
   * @param symbol - order symbol
   * @param type - order type (limit, market)
   * @param side - order side (buy, sell)
   * @param amount - order amount (quantity) in base currency (BTC/USDT - amount in BTC, ETH/USDT - amount in ETH)
   * @param price - order price (for limit order)
   * @param params - additional params (reduceOnly, postOnly, timeInForce...)
   * @returns {Promise<Order>}
   *
   * @example:
   * // modify order
   * let order = await modifyOrder('5203624294025367390',BTC/USDT:USDT', 'limit', 'buy', 0.01, 10000);
   */
  function modifyOrder(
    id: string,
    symbol: string,
    type: OrderType,
    side: OrderSide,
    amount: number,
    price: number,
    params = {},
  ): Promise<Order>;

  async function sdkCall(method: string, args: any[]): Promise<any>;
  async function sdkGetProp(property: string): Promise<any>;
  async function sdkSetProp(property: string, value: any): Promise<void>;

  function forceStop(): void;

  function systemUsage(): { cpu: number; memory: number };

  function subscribeChannel(channel: string, callback: (data: unknown) => void);
  function publishChannel(channel: string, data: unknown, toJSON = false);
  function unsubscribeChannel(channel: string);
  function unsubscribeAllChannels();

  const axios: any;

  const getUserId: () => string;

  const assert: typeof import('assert');
}

export {};
