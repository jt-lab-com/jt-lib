import { globals } from '../core/globals';
import { error, log, warning } from '../core/log';
import { EventEmitter, TriggerService } from '../events';
import { MainReport } from '../report';
import { BaseObject } from '../core/base-object';
import { Storage } from '../core/storage';
import { getArgBoolean, getArgString } from '../core/base';
import { BaseError } from '../core/errors';
import { CandlesBufferService } from '../candles';
import { Indicators } from '../indicators';

export class BaseScript extends BaseObject {
  MAX_ORDERS = 10000;
  connectionName: string; //required
  marketType: 'spot' | 'futures' | 'swap'; //required
  symbols: string[] = []; //required
  interval: number; // if set - onTimer are called every interval instead of onTick

  iterator = 0;

  hedgeMode: boolean;
  timeframe: number;
  version = 3;

  balanceTotal: number;
  balanceFree: number;
  _testerStartRealTime: number;

  isInitialized = false;
  closedOrdersId: Record<string, string> = {};
  constructor(args: GlobalARGS) {
    super(args);
    this._testerStartRealTime = Date.now();

    if (getArgString('connectionName', '').toLowerCase().includes('mock')) {
      ARGS.hedgeMode = true;
      warning('BaseScript::constructor', 'Mock connection detected, enabling hedgeMode', {}, true);
    }

    log('Script:constructor', '=============Constructor(v 2.6)=============', { args }, true);
    try {
      this.connectionName = getArgString('connectionName', undefined, true);
      this.hedgeMode = getArgBoolean('hedgeMode', false);
    } catch (e) {
      throw new BaseError(e);
    }

    if (isTester()) {
      this.symbols.push(args.symbol);
    } else {
      //TODO make symbolsInfo available in constructor
      if (!this.symbols?.length) {
        const symbolsLine = getArgString('symbols', '');

        const symbols = symbolsLine.split(',');
        symbols.forEach((symbol) => {
          if (symbol.includes('/')) {
            this.symbols.push(symbol.trim());
          }
        });
      }
    }
    //Symbols could be set in derived class constructor
    // if (this.symbols.length === 0) {
    //   throw new BaseError('BaseScript::constructor symbols is not defined');
    // }

    this.marketType = getArgString('marketType', 'swap') as 'spot' | 'futures' | 'swap';
    const idPrefix = 'GL-'; //
    globals.script = this;

    globals.events = new EventEmitter({ idPrefix });
    globals.triggers = new TriggerService({ idPrefix });
    globals.report = new MainReport({ idPrefix });
    globals.storage = new Storage({ idPrefix });
    globals.candlesBufferService = new CandlesBufferService({ idPrefix });
    globals.indicators = new Indicators({ idPrefix });

    //TODO add to ARGS.isMultiSymbols when optimization run by symbols (then delete this code)
    if (ARGS.isMultiSymbols === undefined) {
      ARGS.isMultiSymbols = true;
    }
  }

  async onStop() {
    //override
  }
  async onInit() {
    //override
  }

  //async onBeforeTick() {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async onTick() {
    //override
  }

  // async onAfterTick() {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async onOrderChange(order: Order) {
    //override
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async onArgsUpdate(args: GlobalARGS) {
    //override
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async onReportAction(action: string, payload: any) {
    //override
  }

  async onTimer() {
    //override
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async onEvent(event: string, data: any) {
    //override
  }

  onError = async (e: any): Promise<never | void> => {
    throw e;
  };

  protected async init() {
    // try {
    //   await globals.storage.init();
    //   let balanceInfo = await getBalance();
    //   this.balanceTotal = balanceInfo.total.USDT;
    //   this.balanceFree = balanceInfo.free.USDT;
    //   log('BaseScript::init', 'getBalance', balanceInfo, true);
    // } catch (e) {
    //   throw new BaseError(e, {});
    // } finally {
    //   this.isInitialized = false;
    // }

    try {
      this.isInitialized = true;
      await this.onInit();
    } catch (e) {
      error(e);
      this.forceStop('Initialization error: ' + e.message);
    } finally {
      this.isInitialized = false;
    }
  }

  _isTickLocked = false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async runOnTick(data: Tick = {}) {
    // log('BaseScript::runOnTick', 'Run onTick', { data, iterator: this.iterator }, true);
    if (this._isTickLocked) {
      return;
    }
    if (this.isStop) {
      forceStop();
    }
    this._isTickLocked = true;
    try {
      //TODO delete all   await globals.events.emit('onBeforeTick');    await globals.events.emit('onAfterTick');
      // await this.onBeforeTick();
      //  await globals.events.emit('onBeforeTick');
      await this.onTick();
      // await globals.events.emit('onTick');
      await globals.events.emitOnTick();
      //  await this.onAfterTick();
      // await globals.events.emit('onAfterTick');
    } catch (e) {
      await this.runOnError(e);
    } finally {
      this._isTickLocked = false;
      this.iterator++;
    }
  }

  isStop = false;
  forceStop(reason: string) {
    this.isStop = true;
    this.stop()
      .catch((e) => {
        error('BaseScript::forceStop:stop', e, {});
      })
      .finally(() => {
        forceStop();
      });
    error('BaseScript::forceStop', reason, {});

    throw new BaseError(reason);
  }

  protected runTickEnded = async (data: Tick) => {
    try {
      void globals.events.emit('onTickEnded', data);
    } catch (e) {
      await this.runOnError(e);
    }
  };

  protected async runOnTimer() {
    try {
      this.iterator++;
      await this.onTimer();
      await globals.events.emit('onTimer');
    } catch (e) {
      await this.runOnError(e);
    }
  }

  protected runOnOrderChange = async (orders: Order[]) => {
    try {
      for (const order of orders) {
        if (!isTester()) {
          try {
            //TODO (Sometimes binance send closed order twice) investigate why!!!
            if (this.closedOrdersId[order.id]) {
              warning('BaseScript::runOnOrderChange', 'Closed order came twice', { order }, true);
              return;
            }
            if (order.status === 'closed') {
              this.closedOrdersId[order.id] = order.id;
            }
          } catch (e) {
            error(e);
          }
        } else {
          this.MAX_ORDERS--;
          if (this.MAX_ORDERS <= 0) {
            this.forceStop('Max orders reached');
          }
        }

        await this.onOrderChange(order);
        await globals.events.emitOnOrderChange(order); // emit for special symbol
        await globals.events.emit('onOrderChange', order); //for all symbols
      }
    } catch (e) {
      await this.runOnError(e);
    }
  };

  protected runOnError = async (e: any) => {
    if (this.isStop) {
      try {
        await this.stop();
      } catch (error) {
        console.log('BaseScript:runOnError ' + error.message, error.stack);
      }
      throw e;
    }
    error(e, { isStop: this.isStop });
  };

  protected runArgsUpdate = async (args: GlobalARGS) => {
    try {
      if (getArgBoolean('isDebug', false)) globals.isDebug = true;
      await this.onArgsUpdate(args);
      await globals.events.emit('onArgsUpdate', args);
    } catch (e) {
      await this.runOnError(e);
    }
  };

  async runOnEvent(event: string, data: any) {
    try {
      await this.onEvent(event, data);
      await globals.events.emit('onEvent', { event, data });
    } catch (e) {
      await this.runOnError(e);
    }
  }

  //TODO delete run method - because it is not used
  protected async run() {
    try {
      await globals.events.emit('onRun');
    } catch (e) {
      await this.runOnError(e);
    }
  }

  protected async stop() {
    log('Script:stop', '===========================Stop===========================', {}, true);
    this.isStop = true;
    try {
      await globals.events.emit('onBeforeStop');
      await globals.events.emit('onStop');
      await this.onStop();
      await globals.events.emit('onAfterStop');
    } catch (e) {
      await this.runOnError(e);
    }
    try {
      await globals.storage.storeState();
    } catch (e) {
      error(e, {});
    }
  }

  protected async runOnReportAction(action: string, value: any) {
    try {
      await this.onReportAction(action, value);
      await globals.events.emit('onReportAction', { action, value });
    } catch (e) {
      await this.runOnError(e);
    }
  }
}
