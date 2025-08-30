import { error, log, trace, warning } from './log';
import { BaseObject } from './base-object';
import { getArgBoolean } from './base';
import { BaseError } from './errors';

type CacheObjectInfo = {
  key: string;
  className: string;
  props: string[];
  obj: object;
  objId: string;
};

export class Storage extends BaseObject {
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

  objects: Record<string, CacheObjectInfo> = {};
  state: Record<string, StateInfo> = {};
  isDebug = false;

  stateKey = getPrefix() + '-global-storage';

  constructor(args: any = {}) {
    super(args);

    if (getArgBoolean('isDebugStorage', false)) {
      this.isDebug = true;
    }
  }

  addObject(key, obj: BaseObject | object, props = []) {
    const objId = obj['id'] || null;
    let info: CacheObjectInfo = {
      key,
      objId,
      className: obj?.constructor?.name,
      props,
      obj,
    };

    this.objects[key] = info;

    log('Storage:addObject', 'Object added', { key, objId, props });
    if (this.state[key]) this.reStoreState(key, obj);
  }

  removeObject(key) {
    let info = this.objects[key];
    info.obj = undefined;
    delete this.objects[key];

    log('Storage:removeObject', 'Object removed', { key, info });
  }

  async init() {
    if (isTester()) return;
    await this.loadState();
  }

  private reStoreState(key: string, obj: object) {
    this.restoredPropsLevel1 = [];
    this.restoredPropsLevel2 = [];

    const state = this.state[key];

    if (!state) {
      warning('Storage::restoreState', 'state is empty for key ' + key);
      return;
    }

    this.applyState(state, obj);

    log('Storage::restoreState', obj.constructor.name + ' is restored from key = ' + key, {
      restoredPropsLevel1: this.restoredPropsLevel1,
    });
  }

  private getState(obj: object, i = 0, props = []): StateInfo {
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

    let storeProps = props.length > 0 ? props : this.getOnlyProps(obj, []);

    for (let propName of storeProps) {
      this.lastPropName = propName;
      if (propName.charAt(0) === '_') {
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
  async storeState() {
    if (isTester()) return false;

    this.statePropsInfoLv1 = [];
    const key = this.stateKey;

    for (let objInfo of Object.values(this.objects)) {
      this.state[objInfo.key] = this.getState(objInfo.obj, 0, objInfo.props);
    }

    let keyHour = key + '_h' + new Date().getHours();

    await this.saveStateCache(keyHour, Object.keys(this.state));
    warning('Storage::storeState', 'State is stored with key = ' + key, { state: this.state, keyHour, key }, true);

    return await this.saveStateCache(key, this.state);
  }

  private async saveStateCache(key, state) {
    try {
      let strState = JSON.stringify(state);
      return await setCache(key, strState);
    } catch (e) {
      error(e);
      return false;
    }
  }

  private debug(event, msg, params = {}) {
    if (this.isDebug) trace(event + '-debug', msg, params, true);
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
  restoredPropsLevel1 = {};
  ignoredPropsLevel1 = [];
  restoredPropsLevel2 = [];
  applyStep = 0;
  private applyState(state: StateInfo, obj: object, i = 0) {
    if (i == 0) this.restoredPropsLevel1 = {};
    let context = {};

    this.iterator++;
    if (this.restoredPropsLevel1['l' + i] === undefined) this.restoredPropsLevel1['l' + i] = [];
    const propsInfo = this.restoredPropsLevel1['l' + i];

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
            propsInfo.push(obj.constructor.name + '.' + propName + ' - IGNORED!');
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
        } else {
          obj[propName] = objProps[propName]; //i = 9
        }

        if (obj[propName]) {
          propsInfo.push(`(${i}) ` + obj.constructor.name + '.' + propName + ': ' + obj[propName].constructor.name);
        } else {
          propsInfo.push(obj.constructor.name + '.' + propName + ': ' + obj[propName]);
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

    this.callAfterRestore(obj);
    return obj;
  }

  callAfterRestore(obj: object) {
    if (typeof obj['afterReStore'] === 'function') {
      //log('Storage::callAfterRestore', '', { class: obj.constructor.name }, true);
      try {
        obj['afterReStore']();
      } catch (e) {
        error(e);
      }
    }
  }

  private async loadState(): Promise<Record<string, StateInfo>> {
    const key = this.stateKey;
    let strState = '';
    try {
      strState = await getCache<string>(key);
      if (strState) {
        this.state = JSON.parse(strState);
      }
    } catch (e) {
      error(e, { key, strState });
      return {};
    }
    log('Storage::loadState', 'State is loaded from key = ' + key, { stateKeys: Object.keys(this.state) }, true);

    return this.state;
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

  getOnlyProps(obj: object, exceptProps: string[]): string[] {
    let onlyProps = [];
    for (let prop of Object.keys(obj)) {
      if (!exceptProps.includes(prop) && prop.charAt(0) !== '_') {
        onlyProps.push(prop);
      }
    }
    return onlyProps;
  }

  getExceptProps(obj: object, onlyProps: string[]): string[] {
    let exceptProps = [];
    for (let prop of Object.keys(obj)) {
      if (!onlyProps.includes(prop) && prop.charAt(0) !== '_') {
        exceptProps.push(prop);
      }
    }
    return exceptProps;
  }
}

type StateInfo = {
  _c: string; // className
  _p: Record<string, StateInfo>; // properties
  _v: any; //
};

// async restoreStateB(key: string, obj: object, exceptProps: string[] = []) {
//   if (await this.dropState(key)) return;
//
//   this.restoredPropsLevel1 = [];
//   this.restoredPropsLevel2 = [];
//
//   let state = await this.loadState(key);
//   this.debug('Storage::restoreState', key, { state });
//
//   if (!state) {
//     warning('Storage::restoreState', 'state is empty for key ' + key);
//     return;
//   }
//
//   this.iterator = 0;
//
//   this.applyState(state , obj);
//
//   log('Storage::restoreState', obj.constructor.name + ' is restored from key = ' + key, {
//     restoredPropsLevel1: this.restoredPropsLevel1,
//   });
// }

// private async storeStateB(key: string, obj: object, exceptProps: string[] = [], onlyProps: string[] = []) {
//   this.statePropsInfoLv1 = [];
//
//   if (!Array.isArray(exceptProps)) exceptProps = [];
//
//   if (Array.isArray(onlyProps) && onlyProps.length > 0) {
//     for (let prop of Object.keys(obj)) {
//       if (!onlyProps.includes(prop)) {
//         exceptProps.push(prop);
//       }
//     }
//   }
//
//   let state = this.getState(obj, 0, exceptProps);
//   this.debug('Storage::storeState', key, { state });
//   let keyHour = key + '_hour' + new Date().getHours();
//
//   log('Storage::storeState', obj.constructor.name + ' is stored with key = ' + key, {
//     keyHour,
//     key,
//     getStatePropsLevel1: this.statePropsInfoLv1,
//   });
//
//   await this.saveStateCache(keyHour, { updated: currentTimeString(), ...state });
//
//   return await this.saveStateCache(key, { updated: currentTimeString(), ...state });
// }
