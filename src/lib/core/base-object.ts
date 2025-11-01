import { uniqueId } from './base';
import { globals } from './globals';
import { error, log, warning } from './log';
import { BaseError } from './errors';
import { currentTime } from '../utils/date-time';

export class BaseObject {
  _id: string = '';
  _isDestroyed = false;

  _created = currentTime();
  _children: BaseObject[] = [];

  constructor(args: any = {}) {
    let idPrefix = args.idPrefix ?? '';

    this.id = idPrefix + '_' + this.constructor.name + '#' + uniqueId(2);

    log('BaseObject::constructor', 'Object created with id ' + this.id, { args });

    return this;
  }

  addChild(child: BaseObject) {
    this._children.push(child);
  }

  async call(functionName: string, data?: any) {
    if (this._isDestroyed) {
      throw new BaseError('BaseObject::call this object is destroyed ');
    }
    return await this[functionName](data);
  }

  //ID is used for unsubscribing from events by object if you change id - you will not be able to unsubscribe from events
  set id(id: string) {
    if (globals.hasObject(id)) {
      this.id = id + uniqueId(2);
      log('BaseObject::id', `Object with id = ${id} already exists , new id = ${this._id}`);
      return;
    }
    if (this._id) {
      //TODO add unsubscribe from events and triggers and tests for it
      warning('BaseObject::id', `ID has been changed ${id} ->${this._id}`);
      globals.removeObject(this);
    }

    this._id = id;
    globals.addNewObject(this);
  }

  get id() {
    return this._id;
  }

  unsubscribe() {
    globals.events.unsubscribeByObjectId(this._id);
  }

  notForDestroy = [];
  public destroy() {
    let children = [];
    for (let child of this._children) {
      try {
        child.destroy();
        children.push({ childId: child?.id, parentId: this.id, destroyed: child._isDestroyed });
      } catch (e) {
        error(e, { childId: child?.id, parentId: this.id });
      }
    }

    this._isDestroyed = true;
    globals.removeObject(this);
    this.unsubscribe();

    log('BaseObject::destroy', 'Object destroyed with id ' + this.id + ' ' + this.constructor.name, { info: children });
    return;
  }

  error(msg: string | Error, context: any = {}) {
    let e = msg instanceof Error ? msg : new BaseError(msg, context);
    let className = this.constructor.name;
    let functionName = new Error().stack.split('\n')[2].split(' ')[3];
    context.objectId = context.objectId ?? this.id;

    let event = className + '::' + functionName + ' ' + (this['symbol'] ?? '');

    if (msg instanceof Error) {
      error(e, context);
    } else {
      error(event, msg, context);
    }

    this.onError(e, context);
  }

  onError(e: Error, context: any) {}

  afterReStore() {}

  beforeStore() {}
}
