import { OrderTrigger } from './order.trigger';
import { CreateOrderTaskParams } from './types';
import { globals as libGlobal } from '../../../core/globals';
import { EventEmitter } from '../../event-emitter';
import { BaseObject } from '../../../core/base-object';

jest.mock('../../../core/globals');

class MockObject extends BaseObject {
  mockConstructor: Function;

  constructor() {
    super();

    this.mockConstructor = jest.fn();
    trigger.registerHandler('mockTask', this.mockConstructor, this);
  }
}

let trigger: OrderTrigger;
let mockObject: MockObject;
let nextId = 1;

const callback = jest.fn();

const createTask = (params?: Partial<CreateOrderTaskParams>, withCallback?: boolean): CreateOrderTaskParams => ({
  ...params,
  status: params?.status ?? 'closed',
  name: params?.name ?? `task#${nextId++}`,
  ...(withCallback && {
    args: { foo: 'bar' },
    callback: params?.callback ?? callback,
  }),
  clientOrderId: params?.clientOrderId ?? 'clientOrderId',
  orderId: params?.orderId ?? 'orderId',
});

beforeEach(() => {
  callback.mockClear();
  trigger = new OrderTrigger({});
  mockObject = new MockObject();
  libGlobal.events = new EventEmitter({ idPrefix: 'unit-test' });
});

describe('OrderTrigger', () => {
  test('should return task id', () => {
    const listenerId = trigger.addTask(createTask());

    expect(listenerId).toBeDefined();
  });

  test('should trigger a handler when the order changes with specific status', async () => {
    const task = createTask({ orderId: 'order #1', clientOrderId: 'client #1', status: 'closed', name: 'mockTask' });
    trigger.addTask(task);

    await libGlobal.events.emit('onOrderChange', { id: 'order #1', clientOrderId: 'client #1', status: 'open' });

    expect(mockObject.mockConstructor).not.toBeCalled();

    await libGlobal.events.emit('onOrderChange', { id: 'order #1', clientOrderId: 'client #1', status: 'closed' });

    expect(mockObject.mockConstructor).toHaveBeenCalledTimes(1);
  });

  test('should trigger a callback when the order changes with specific status', async () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    const task1 = createTask({
      orderId: 'order #1',
      clientOrderId: 'client #1',
      callback: callback1,
      status: 'closed',
    });
    const task2 = createTask({
      orderId: 'order #2',
      clientOrderId: 'client #2',
      callback: callback2,
      status: 'closed',
    });

    trigger.addTask(task1);
    trigger.addTask(task2);

    await libGlobal.events.emit('onOrderChange', { id: 'order #1', clientOrderId: 'client #1', status: 'open' });
    await libGlobal.events.emit('onOrderChange', { id: 'order #2', clientOrderId: 'client #2', status: 'open' });

    expect(callback1).not.toBeCalled();
    expect(callback2).not.toBeCalled();

    await libGlobal.events.emit('onOrderChange', { id: 'order #1', clientOrderId: 'client #1', status: 'closed' });
    await libGlobal.events.emit('onOrderChange', { id: 'order #2', clientOrderId: 'client #2', status: 'closed' });

    expect(callback1).toBeCalledTimes(1);
    expect(callback1).toBeCalledWith(task1.args);
    expect(callback2).toBeCalledTimes(1);
    expect(callback2).toBeCalledWith(task2.args);
  });

  test('should be placed in inactive task if one of the group of tasks is executed', async () => {
    const task1 = createTask({ orderId: 'order #1', clientOrderId: 'client #1', group: 'grouped' }, true);
    const task2 = createTask({ orderId: 'order #2', clientOrderId: 'client #2', group: 'grouped' }, true);

    trigger.addTask(task1);
    trigger.addTask(task2);

    await libGlobal.events.emit('onOrderChange', { id: 'order #1', clientOrderId: 'client #1', status: 'closed' });

    expect(trigger.getActiveTasks().length).toEqual(0);
    expect(trigger.getInactiveTasks().length).toEqual(2);
  });

  test('should call the callback again if an error occurred and the number of attempts was passed', async () => {
    callback.mockRejectedValue({ error: true });

    trigger.addTask(createTask({ retry: 3 }, true));

    await libGlobal.events.emit('onOrderChange', { id: 'orderId', clientOrderId: 'clientOrderId', status: 'closed' });

    expect(callback).toBeCalledTimes(4);
  });

  test('should cancel task', async () => {
    const taskId = trigger.addTask(createTask());

    trigger.cancelTask(taskId);

    await libGlobal.events.emit('onOrderChange', { id: 'orderId' });

    expect(callback).not.toBeCalled();
  });

  test('should unsubscribe from global events when all tasks are completed', async () => {
    trigger.addTask(createTask({}, true));

    await libGlobal.events.emit('onOrderChange', { id: 'orderId', clientOrderId: 'clientOrderId', status: 'closed' });

    expect(libGlobal.events.getListenersCount()).toEqual(0);
  });

  test('should return all tasks', async () => {
    trigger.addTask(createTask({ orderId: 'order #1' }));
    trigger.addTask(createTask());

    expect(trigger.getAllTasks().length).toEqual(2);
  });

  test('should return active & inactive tasks', async () => {
    trigger.addTask(createTask({ clientOrderId: 'client #1', orderId: 'order #1' }, true));
    trigger.addTask(createTask({}, true));
    trigger.addTask(createTask({}, true));

    await libGlobal.events.emit('onOrderChange', { clientOrderId: 'client #1', id: 'order #1', status: 'closed' });

    expect(trigger.getInactiveTasks().length).toEqual(1);
    expect(trigger.getActiveTasks().length).toEqual(2);
  });
});
