import { currentTimeString } from '../utils/date-time';
import { error, log, trace, warning } from './log';
import { Report } from '../report';
import { EventEmitter, TriggerService, TimeTrigger, OrderTrigger, PriceTrigger } from '../events';
import { ReportCard } from '../report/widgets/report-card';
import { ReportTable } from '../report/widgets/report-table';
import { TradingViewChart } from '../report/widgets/report-tv';
import { OrdersBasket } from '../exchange';
import { ReportChart } from '../report/widgets/report-chart';
import { BaseObject } from './base-object';
import { getArgBoolean } from './base';
import { BaseError } from './errors';

export class Storage extends BaseObject {
  exceptProps = [];
  name = 'Storage';
  version = 9;
  _baseClasses = {
    Array: Array,
    Date: Date,
    Map: Map,
    Set: Set,
    Object: Object,
    RegExp: RegExp,
  };

  isDebug = false;

  constructor(args: any = {}) {
    super(args);
    try {
      let { exceptProps, classes } = args;
      if (exceptProps && Array.isArray(exceptProps)) {
        this.exceptProps = [...this.exceptProps, ...exceptProps];
      }
      if (classes) {
        classes.forEach((_class) => {
          this.addClass(_class);
        });
      }
    } catch (e) {
      error('Storage::constructor', e.message, { e });
    }
    if (0) {
      this.addClass(TriggerService);
      this.addClass(TimeTrigger);
      this.addClass(OrderTrigger);
      this.addClass(PriceTrigger);
      this.addClass(EventEmitter);
      this.addClass(OrdersBasket);
      this.addClass(Report);
      this.addClass(ReportCard);
      this.addClass(ReportTable);
      this.addClass(TradingViewChart);
      this.addClass(ReportChart);
    }
    if (getArgBoolean('isDebugStorage', false)) {
      this.isDebug = true;
    }
  }

  async restoreState(key: string, obj: object, exceptProps: string[] = []) {
    if (await this.dropState(key)) return;

    this.restoredPropsLevel1 = [];
    this.restoredPropsLevel2 = [];

    let state = await this.loadState(key);
    this.debug('Storage::restoreState', key, { state });

    if (!state) {
      warning('Storage::restoreState', 'state is empty for key ' + key);
      return;
    }

    this.iterator = 0;
    this.applyState(state, obj);

    log('Storage::restoreState', obj.constructor.name + ' is restored from key = ' + key, {
      restoredPropsLevel1: this.restoredPropsLevel1,
    });
  }

  async storeState(key: string, obj: object, exceptProps: string[] = [], onlyProps: string[] = []) {
    this.statePropsInfoLv1 = [];

    if (!Array.isArray(exceptProps)) exceptProps = [];

    if (Array.isArray(onlyProps) && onlyProps.length > 0) {
      for (let prop of Object.keys(obj)) {
        if (!onlyProps.includes(prop)) {
          exceptProps.push(prop);
        }
      }
    }

    let state = this.getState(obj, 0, exceptProps);
    this.debug('Storage::storeState', key, { state });
    let keyHour = key + '_hour' + new Date().getHours();

    log('Storage::storeState', obj.constructor.name + ' is stored with key = ' + key, {
      keyHour,
      key,
      getStatePropsLevel1: this.statePropsInfoLv1,
    });

    await this.saveState(keyHour, { updated: currentTimeString(), ...state });

    return await this.saveState(key, { updated: currentTimeString(), ...state });
  }

  private debug(event, msg, params = {}) {
    if (this.isDebug) trace(event + '-debug', msg, params, true);
  }

  addClass(_class) {
    let name = _class.name;

    if (!name) {
      throw new Error('Class name is empty');
    }

    this._baseClasses[name] = _class;
  }

  statePropsInfoLv1 = [];
  lastPropName = '';

  dropState = async (key: string) => {
    if (getArgBoolean('isDropState', false)) {
      log('Storage::dropState', 'State is dropped for key = ' + key, {}, true);
      await setCache(key, '[]');
      return true;
    }
    return false;
  };

  iterator = 0;
  propName = '';
  restoredPropsLevel1 = [];
  ignoredPropsLevel1 = [];
  restoredPropsLevel2 = [];
  applyStep = 0;
  private applyState(state: StateInfo, obj: object, i = 0) {
    let context = {};

    this.iterator++;
    i++;
    let className;

    if (!state || !state._c) {
      warning('Storage::applyState', 'Wrong state ', { propName: this.propName, i: i, msg: 'null' });
      return null;
    }

    if (state._c === 'Date') {
      return new Date(state._v);
    }

    if (state._c === 'Map') {
      let MapEntries = {};
      MapEntries = this.applyState(state._v, MapEntries, i);
      log('Storage::applyState', 'MapEntries --- ', { state: state._v });
      return new Map(Object.entries(MapEntries));
    }

    if (state._c === 'Set') {
      let SetEntries = {};
      SetEntries = this.applyState(state._v, SetEntries, i);
      return new Set(Object.entries(SetEntries));
    }

    if (state._c === 'Array') {
      return state._v;
    }

    try {
      let objProps = state._p; // properties;
      for (let propName of Object.keys(objProps)) {
        this.iterator++;
        this.propName = propName;
        this.applyStep = 0;
        if (propName.charAt(0) === '_') {
          if (i === 1) {
            this.restoredPropsLevel1.push(obj.constructor.name + '.' + propName + ' - IGNORED!');
          }
          continue;
        }
        if (objProps[propName] && objProps[propName]._c) {
          className = objProps[propName]._c;

          if (obj[propName]?.constructor?.name === className) {
          } else {
            if (this._baseClasses[className]) {
              obj[propName] = new this._baseClasses[className]();
              // this.debug('Storage::applyState', 'class = ' + className + '  - CREATED', { propName });
            } else {
              warning(
                'Storage::applyState',
                `Property ${propName} of ${className}  will not be restored. Object should be created before state is applied`,
                {
                  propName,
                  className,
                },
              );
              continue;
            }
          }
          obj[propName] = this.applyState(objProps[propName], obj[propName], i);
          // this.debug('Storage::applyState', 'class = ' + className + '  - FILED', { propName });

          this.callAfterRestore(obj[propName]);
        } else {
          obj[propName] = objProps[propName]; //i = 9
        }

        if (i === 1) {
          if (obj[propName]) {
            this.restoredPropsLevel1.push(
              obj.constructor.name + '.' + propName + ': ' + obj[propName].constructor.name,
            );
          } else {
            this.restoredPropsLevel1.push(obj.constructor.name + '.' + propName + ': ' + obj[propName]);
          }
        }
      }
    } catch (e) {
      context['type_state'] = typeof state;
      if (state) {
        context['class'] = state?._c + '';
        context['props'] = Object.keys(state._p);
        context['type_p'] = typeof state?._p;
        context['type_v'] = typeof state?._v;
        context['propName'] = this.propName;
        context['levelDeep'] = this.iterator;
        context['applyStep'] = this.applyStep;
      }

      throw new BaseError(e, { context });
    }
    return obj;
  }

  callAfterRestore(obj: object) {
    if (typeof obj['afterRestore'] === 'function') {
      try {
        obj['afterRestore']();
      } catch (e) {
        error(e);
      }
    }
  }

  private async saveState(key, state) {
    try {
      let strState = JSON.stringify(state);
      return await setCache(key, strState);
    } catch (e) {
      error(e);
      return false;
    }
  }

  private async loadState(key) {
    try {
      let strState = await getCache<string>(key);
      let state = JSON.parse(strState);
      return state;
    } catch (e) {
      error(e);
      return false;
    }
  }

  private getState(obj: object, i = 0, exceptProps = []): StateInfo {
    if (!obj) return null;

    let state: StateInfo = {
      _c: 'unknown', // className
      _p: {}, // properties
      _v: null, //
    };
    i++;

    try {
      state._c = obj.constructor.name;
    } catch (e) {
      error(e, { obj, lastPropName: this.lastPropName });
      return null;
    }
    // if (!this.classes[state._className]) {
    //   _trace('Storage::getState', 'not stored className ' + state._className, {});
    //   return state;
    // }

    //TODO add check class exist in this.classes if not error

    // //Map and Set
    if (obj instanceof Map) {
      state._v = this.getState(Object.fromEntries(obj.entries()), i);
      return state;
      // return this.getState();
    }

    if (obj instanceof Set) {
      state._v = this.getState(Object.fromEntries(obj.entries()), i);
      return state;
    }

    if (obj instanceof Array) {
      state._v = obj;
      return state;
    }

    if (obj instanceof Date) {
      state._v = obj.toISOString();

      return state;
    }

    // if (typeof obj === 'object' && typeof obj['beforeStore'] === 'function') {
    //   try {
    //     log('Storage::getState', 'beforeStore ', { objId: obj['id'] + '' }, true);
    //     obj['beforeStore']();
    //   } catch (e) {
    //     error('Storage::getState', e.message + ' [beforeStore]', { e, objId: obj['id'] + '' });
    //   }
    // }

    for (let propName of Object.keys(obj)) {
      this.lastPropName = propName;
      if (this.exceptProps.includes(propName) || propName.charAt(0) === '_' || exceptProps.includes(propName)) {
        continue;
      }
      if (typeof obj[propName] === 'function' || obj[propName] === undefined) continue;

      if (typeof obj[propName] === 'object') {
        state._p[propName] = this.getState(obj[propName], i);
      } else {
        state._p[propName] = obj[propName];
      }

      if (i === 1) {
        try {
          this.statePropsInfoLv1.push(
            obj.constructor.name +
              '.' +
              propName +
              ':' +
              (obj[propName]?.constructor ? obj[propName].constructor.name : obj[propName]),
          );
        } catch (e) {
          error('Storage::getState', 'Fill getStatePropsLevel1 error - ' + e.message, { e, obj: obj, propName });
        }
      }
    }

    return state;
  }

  async get(key: string): Promise<any> {
    return await getCache(key);
  }

  async set(key: string, value: any): Promise<void> {
    await setCache(key, value);
  }

  async getNumber(key: string): Promise<number> {
    return getCache(key);
  }
}

type StateInfo = {
  _c: string; // className
  _p: Record<string, StateInfo>; // properties
  _v: any; //
};
