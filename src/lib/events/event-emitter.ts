import { BaseObject } from '../core/base-object';
import { EventListener, TickExecutionData, TickEventName, EventName, GetEventData, TypedEventHandler } from './types';
import { uniqueId } from '../core/base';
import { BaseError } from '../core/errors';
import { error, log, warning } from '../core/log';
import { currentTimeString, timeCurrent } from '../utils/date-time';
import { globals } from '../core/globals';

export class EventEmitter extends BaseObject {
  private readonly tickExecInterval = new Map<string, TickExecutionData>();
  private readonly _listeners = new Map<string, EventListener[]>();
  private _listenersDict = new Map<string, boolean>();

  private defaultTickInterval = 1000;

  constructor(args: { idPrefix: string }) {
    super(args);
  }

  subscribeOnOrderChange(handler: (order: Order) => Promise<any>, owner: BaseObject, symbol: string) {
    return this.subscribe(`onOrderChange_${symbol}` as `onOrderChange_${string}`, handler, owner);
  }

  subscribeOnTick(handler: (data?: undefined) => Promise<any>, owner: BaseObject, symbol: string, interval?: number) {
    const event: TickEventName = isTester() ? 'onTick' : `onTick_${symbol}`;

    if (!interval) {
      interval = this.defaultTickInterval;
    }

    interval = Math.max(interval, this.defaultTickInterval);

    this.tickExecInterval.set(event as string, {
      interval,
      symbol,
      nextTick: timeCurrent() + interval,
    });

    let result = this.subscribe(event as EventName, handler, owner);

    return result;
  }

  /**
   * Subscribe to event with listener. You can use on() instead of subscribe().
   * !important: function (listener) wouldn't be deleted even object witch has this function is destroyed (you should unsubscribe manually)
   * @param eventName - event name
   * @param handler - event handler
   * @param owner - object witch has this listener (for unsubscribing by object)
   * @returns {string} - listener id (for unsubscribing by id)
   */
  subscribe<T extends EventName>(eventName: T, handler: TypedEventHandler<T>, owner: BaseObject): string {
    //TODO EventEmitter::subscribe() - check if object subscribed twice to the same event with the same handler (it will be a memory leak and problems with unsubscribing)

    if (eventName === 'onBeforeTick' || eventName === 'onAfterTick') {
      warning(
        'EventEmitter::subscribe()',
        'onBeforeTick and onAfterTick are deprecated 25.01.2025. Use onTick instead',
        { eventName },
      );
    }

    if (typeof handler !== 'function') {
      throw new BaseError('EventEmitter::subscribe() handler should be a function  ', { eventName });
    }

    if (!handler.name) {
      throw new BaseError('EventEmitter::subscribe() Anonymous arrow functions are not supported', { eventName });
    }
    if (!(owner instanceof BaseObject)) {
      throw new BaseError('EventEmitter::subscribe() The owner must be an instance of the BaseObject class', {
        eventName,
      });
    }
    if (!owner[handler.name]) {
      throw new BaseError(
        `EventEmitter::subscribe() The handler ${handler.name} must be a method of the BaseObject class`,
        { eventName },
      );
    }

    const id = uniqueId(10);

    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, []);
    }

    const listeners = this._listeners.get(eventName);

    const listenerData: EventListener = {
      id,
      event: eventName,
      owner,
      handler: handler.bind(owner),
      handlerName: handler.name,
      ownerName: owner.constructor.name,
      ownerId: owner.id,
      result: {},
    };

    const uniqueKey = `${eventName}_${handler.name}_${owner.id}`;
    if (this._listenersDict.has(uniqueKey)) {
      warning('EventsEmitter:subscribe', `The owner ${owner.id} is already subscribed to the event ${eventName}`, {
        uniqueKey,
        listenerId: id,
        eventName,
        handlerName: handler.name,
        ownerId: owner.id,
      });
    }
    this._listenersDict.set(uniqueKey, true);

    listeners.push(listenerData);

    log('EventsEmitter:subscribe', `A handler for the ${eventName} event has been registered`, {
      eventName,
      id,
      ownerId: owner.id,
    });

    return id;
  }

  async emitOnOrderChange(order: Order) {
    await this.emit(`onOrderChange_${order.symbol}` as `onOrderChange_${string}`, order);
  }

  async emitOnTick() {
    if (isTester()) {
      await this.emit('onTick');
      // await this.emit('', '', this._testerOnTickListeners);
      return;
    }

    for (const [event, execData] of this.tickExecInterval.entries()) {
      if (tms(execData.symbol) >= execData.nextTick) {
        await this.emit(event as EventName);
        execData.nextTick = tms(execData.symbol) + execData.interval;
      }
    }
    await this.emit('onTick');
  }

  async emit<T extends EventName>(
    eventName: T,
    data?: GetEventData<T>,
    listeners: EventListener[] = [],
  ): Promise<void> {
    if (listeners.length === 0) {
      listeners = this._listeners.get(eventName);
      if (!listeners || !listeners.length) return;
    }

    for (const listener of listeners) {
      try {
        if (listener.owner?._isDestroyed === true) {
          error('EventEmitter::emit()', ' The owner of the listener is destroyed', {
            ...listener,
            owner: undefined,
            data,
          });
          listener.result = { error: 'The owner of the listener is destroyed', updated: currentTimeString() };
        } else {
          let result = await listener.handler(data);
          if (globals.isDebug) {
            listener.result = { result, updated: currentTimeString(), ownerId: listener.ownerId };
          }
        }
      } catch (e) {
        error(e, {});
      }
    }
  }

  setDefaultTickInterval(intervalMs: number) {
    intervalMs = Math.max(1000, intervalMs);
    this.defaultTickInterval = intervalMs;
  }

  getListenersCount() {
    return Array.from(this._listeners.values()).reduce((acc, listeners) => acc + listeners.length, 0);
  }

  getListeners() {
    return Array.from(this._listeners.values()).flat();
  }

  unsubscribeById(listenerId: string): boolean {
    //   const uniqueKey = `${eventName}_${handler.name}_${owner.id}`;
    //     if (this._listenersDict.has(uniqueKey)) {
    //       warning('EventsEmitter:subscribe', `The owner ${owner.id} is already subscribed to the event ${eventName}`, {
    //         uniqueKey,
    //         listenerId: id,
    //         eventName,
    //         handlerName: handler.name,
    //         ownerId: owner.id,
    //       });
    //     }
    //     this._listenersDict.set(uniqueKey, true);
    for (const [eventName, listeners] of this._listeners.entries()) {
      for (let i = listeners.length - 1; i >= 0; i--) {
        if (listeners[i].id !== listenerId) continue;
        const uniqueKey = `${eventName}_${listeners[i].handlerName}_${listeners[i].ownerId}`;
        const ownerId = listeners[i].ownerId;

        listeners.splice(i, 1);

        this._listenersDict.delete(uniqueKey);
        log('EventsEmitter:unsubscribe', `Listener ${listenerId} unsubscribed from event ${eventName}`, { ownerId });

        return true;
      }
    }

    error('EventsEmitter:unsubscribe', `Listener ${listenerId} was not found.`);

    return false;
  }

  unsubscribeByObjectId(objectId: string): number {
    let unsubscribedIds = 0;

    let unsubscribedListeners = [];
    let errorListeners = [];
    for (const [eventName, listeners] of this._listeners.entries()) {
      for (let i = listeners.length - 1; i >= 0; i--) {
        if (listeners[i].ownerId !== objectId) continue;

        let listenerInfo = { eventName: listeners[i].event, owner: listeners[i].ownerId, listenerId: listeners[i].id };

        if (this.unsubscribeById(listeners[i].id)) {
          unsubscribedIds++;
          unsubscribedListeners.push({ listenerInfo });
        } else {
          errorListeners.push({ listenerInfo });
        }
      }
    }

    log('EventsEmitter:unsubscribeByObjectId', `objectId ${objectId} `, {
      unsubscribedIds,
      unsubscribedListeners,
      errorListeners,
    });
    return unsubscribedIds;
  }
}
