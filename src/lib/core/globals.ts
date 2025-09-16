import type { EventEmitter, TriggerService } from '../events';
import type { MainReport } from '../report';
import type { Storage } from './storage';
import type { BaseObject } from './base-object';
import type { CandlesBufferService } from '../candles';
import { Indicators } from '../indicators';
import { getArgBoolean, getArgNumber } from './base';
import { BaseScript } from '../script/base-script';

class GlobalScope {
  private _script: BaseScript = null;
  private _triggers: TriggerService = null;
  private _report: MainReport = null;
  private _events: EventEmitter = null;
  private _storage: Storage = null;
  private _candlesBufferService: CandlesBufferService = null;
  private _indicators: Indicators = null;
  private _isTradeAllowed = true;

  public balanceInfo = {};
  public positionsInfo = {};
  public _objects = {};

  public IS_NO_LOGS = 0;
  logOnce: Map<string, any> = new Map();
  loggedMessages: Map<string, number>;
  logOnceObj = {};
  params = {};
  logs = {};
  errorCount = 0;
  consoleLogCount = 0;
  lastErrorTime = 0;
  public userData: Map<string, any> = new Map();
  isDebug: boolean;

  constructor() {
    this.isTradeAllowed = getArgBoolean('isTradeAllowed', true);

    this.IS_NO_LOGS = getArgNumber('isNoLogs', 0); // 0 - logs are enabled, 1 - logs are disabled

    if (this.IS_NO_LOGS) console.warn('GlobalScope::constructor LOGS is disabled IS_NO_LOGS = 1');

    this.isDebug = getArgBoolean('isDebug', false);
  }

  public addNewObject(object: BaseObject) {
    this._objects[object.id] = object;
  }

  public removeObject(object: BaseObject) {
    if (this._objects[object.id] && this._objects[object.id] === object) {
      delete this._objects[object.id];
    } else {
      let stack = new Error().stack;
      console.error(`GlobalScope::removeObject Object with id ${object.id} not found`, stack.split('\n'));
    }
  }

  public hasObject(id: string) {
    return !!this._objects[id];
  }

  set isTradeAllowed(isTradeAllowed) {
    this._isTradeAllowed = isTradeAllowed;
  }

  get isTradeAllowed() {
    return this._isTradeAllowed;
  }

  set script(strategy) {
    this._script = strategy;
  }

  get script() {
    return this._script;
  }

  set candlesBufferService(service: CandlesBufferService) {
    if (this._candlesBufferService) {
      throw new Error('CandlesBufferService already exists');
    }

    this._candlesBufferService = service;
  }

  get candlesBufferService() {
    return this._candlesBufferService;
  }

  set indicators(indicators: Indicators) {
    if (this._indicators) {
      throw new Error('indicators already exists');
    }

    this._indicators = indicators;
  }

  get indicators() {
    return this._indicators;
  }

  set storage(storage: Storage) {
    if (this._storage) {
      throw new Error('Storage already set with id ' + this._storage?.id);
    }
    this._storage = storage;
  }

  get storage() {
    return this._storage;
  }

  set events(events) {
    if (this._events) {
      throw new Error('EventsEmitter already set with id ' + this._events?.id);
    }
    this._events = events;
  }

  get events() {
    return this._events;
  }

  set triggers(trigger) {
    if (this._triggers) {
      throw new Error('Triggers already set with id ' + this._triggers?.id);
    }
    this._triggers = trigger;
  }

  get triggers() {
    return this._triggers;
  }

  set report(report) {
    if (this._report) {
      throw new Error('Report already set with id ' + this._report?.id);
    }
    this._report = report;
  }

  get report(): MainReport {
    return this._report;
  }

  getClassName(obj: object) {
    return obj?.constructor?.name;
  }

  isObject(obj: object) {
    return typeof obj === 'object';
  }
}

export const globals = new GlobalScope();
