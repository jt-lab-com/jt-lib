import { BaseObject } from '../core/base-object';
import { EventEmitter } from './event-emitter';

class Mock extends BaseObject {
  mockConstructor: () => Promise<void>;

  constructor() {
    super();

    this.mockConstructor = jest.fn();
  }
}

let emitter: EventEmitter;
let mockObj: Mock;

beforeEach(() => {
  mockObj = new Mock();
  emitter = new EventEmitter({ idPrefix: 'event-emitter' });
});

describe('EventEmitter v2', () => {
  test('subscribe & emit', () => {
    emitter.subscribe('event #1', mockObj.mockConstructor, mockObj);
    emitter.subscribe('event #2', mockObj.mockConstructor, mockObj);

    emitter.emit('event #1');
    emitter.emit('event #2');

    expect(mockObj.mockConstructor).toHaveBeenCalledTimes(2);
  });

  test('subscribe & emit on order change', () => {
    emitter.subscribeOnOrderChange(mockObj.mockConstructor, mockObj, 'BTC/USDT');
    emitter.emitOnOrderChange({ symbol: 'BTC/USDT' } as Order);

    expect(mockObj.mockConstructor).toHaveBeenCalled();
  });

  test('subscribe & emit on tick', async () => {
    const mockObj2 = new Mock();

    emitter.subscribeOnTick(mockObj.mockConstructor, mockObj, 'ETH/USDT', 1000);
    emitter.subscribeOnTick(mockObj2.mockConstructor, mockObj2, 'BTC/USDT');

    await new Promise((res) => setTimeout(res, 1300));

    await emitter.emitOnTick();
    expect(mockObj.mockConstructor).toBeCalledTimes(1);
    expect(mockObj2.mockConstructor).not.toBeCalled();

    await new Promise((res) => setTimeout(res, 1300));

    await emitter.emitOnTick();
    await emitter.emitOnTick();

    expect(mockObj.mockConstructor).toBeCalledTimes(2);
    expect(mockObj2.mockConstructor).toBeCalledTimes(1);
  });

  test('should return correct listeners count', () => {
    emitter.subscribe('event #1', mockObj.mockConstructor, mockObj);
    emitter.subscribe('event #2', mockObj.mockConstructor, mockObj);
    emitter.subscribe('event #3', mockObj.mockConstructor, mockObj);

    const count = emitter.getListenersCount();
    expect(count).toEqual(3);
  });

  test('should return all listeners', () => {
    emitter.subscribe('event #1', mockObj.mockConstructor, mockObj);
    emitter.subscribe('event #2', mockObj.mockConstructor, mockObj);

    const listeners = emitter.getListeners();

    expect(listeners.length).toEqual(2);

    listeners.forEach((listener) => {
      expect(listener.event).toMatch(/event #\d/);
      expect(listener.owner).toEqual(mockObj);
    });
  });

  test('should unsubscribe by listener id', () => {
    emitter.subscribe('event #1', mockObj.mockConstructor, mockObj);

    let listeners = emitter.getListeners();

    emitter.unsubscribeById(listeners[0].id);

    listeners = emitter.getListeners();

    expect(listeners.length).toEqual(0);
  });

  test('should unsubscribe by object id', () => {
    emitter.subscribe('event #1', mockObj.mockConstructor, mockObj);

    let listeners = emitter.getListenersCount();

    expect(listeners).toEqual(1);

    const deletedListeners = emitter.unsubscribeByObjectId(mockObj.id);
    listeners = emitter.getListenersCount();

    expect(deletedListeners).toEqual(1);
    expect(listeners).toEqual(0);
  });
});
