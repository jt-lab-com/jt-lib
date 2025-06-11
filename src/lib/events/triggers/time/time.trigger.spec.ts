import { TimeTrigger } from './time.trigger';
import { globals as libGlobal } from '../../../core/globals';
import { EventEmitter } from '../../event-emitter';
import { CreateTimeTaskParams } from './types';
import { BaseObject } from '../../../core/base-object';

jest.mock('../../../core/globals');

let nextId = 1;
let trigger: TimeTrigger;

const callback = jest.fn();

const createTask = (options?: Partial<CreateTimeTaskParams>, withCallback?: boolean): CreateTimeTaskParams => ({
  name: `task #${nextId++}`,
  ...(withCallback && {
    args: { foo: 'bar' },
    callback,
  }),
  triggerTime: options?.triggerTime ?? Date.now() + 300,
  ...options,
});

beforeEach(() => {
  callback.mockClear();
  libGlobal.events = new EventEmitter({ idPrefix: 'unit-test' });
  trigger = new TimeTrigger();
});

describe('TimeTrigger', () => {
  test('should return task id', () => {
    const id = trigger.addTask(createTask());

    expect(id).toBeDefined();
  });

  test('should call a handler when the time comes', async () => {
    class MockObject extends BaseObject {
      mockConstructor: Function;

      constructor() {
        super();

        this.mockConstructor = jest.fn();
        trigger.registerHandler('mockTask', this.mockConstructor, this);
      }
    }

    const mockObj = new MockObject();
    const task = createTask({ name: 'mockTask', triggerTime: Date.now() + 500 });
    trigger.addTask(task);

    expect(mockObj.mockConstructor).not.toBeCalled();

    await new Promise((res) => setTimeout(res, 2000));

    await libGlobal.events.emit('onTick');

    expect(mockObj.mockConstructor).toBeCalledTimes(1);
  });

  test('should call a callback when the time comes', async () => {
    const task = createTask({}, true);
    trigger.addTask(task);

    await libGlobal.events.emit('onTick');

    expect(callback).not.toBeCalled();

    await new Promise((res) => setTimeout(res, 2000));

    await libGlobal.events.emit('onTick');

    expect(callback).toBeCalled();
    expect(callback).toBeCalledWith(task.args);
    expect(callback).toBeCalledTimes(1);
  });

  test('should call a callback at an interval of time', async () => {
    const task = createTask({ interval: 500 }, true);
    trigger.addTask(task);

    await libGlobal.events.emit('onTick');
    expect(callback).not.toBeCalled();

    await new Promise((res) => setTimeout(res, 300));

    expect(callback).not.toBeCalled();

    await new Promise((res) => setTimeout(res, 200));
    await libGlobal.events.emit('onTick');

    await new Promise((res) => setTimeout(res, 500));
    await libGlobal.events.emit('onTick');

    expect(callback).toBeCalledTimes(2);
    expect(callback).toBeCalledWith(task.args);
  });

  test('should call the callback again if an error occurred and the number of attempts was passed', async () => {
    const task = createTask({ retry: 3 }, true);
    callback.mockRejectedValue({ error: true });

    trigger.addTask(task);

    await new Promise((res) => setTimeout(res, 310));
    await libGlobal.events.emit('onTick');

    expect(callback).toBeCalledTimes(4);
  });

  test('should not be called again unless the number of attempts is passed', async () => {
    const task = createTask({}, true);

    callback.mockRejectedValue({ error: true });

    trigger.addTask(task);

    for (let i = 0; i < 2; i++) {
      await new Promise((res) => setTimeout(res, 310));
      await libGlobal.events.emit('onTick');
    }

    expect(callback).toBeCalledTimes(1);
  });

  test('should cancel task', async () => {
    const taskId = trigger.addTask(createTask({}, true));

    trigger.cancelTask(taskId);

    await new Promise((res) => setTimeout(res, 500));
    await libGlobal.events.emit('onTick');

    expect(callback).not.toBeCalled();
  });

  test('should unsubscribe from global events when all tasks are completed', async () => {
    trigger.addTask(createTask({}, true));

    await new Promise((res) => setTimeout(res, 300));
    await libGlobal.events.emit('onTick');

    expect(libGlobal.events.getListenersCount()).toEqual(0);
  });

  test('should return all tasks', () => {
    const task = createTask({}, true);

    trigger.addTask(task);
    trigger.addTask(task);
    trigger.addTask(task);

    const tasks = trigger.getAllTasks();

    expect(tasks.length).toEqual(3);
  });

  test('should return active & inactive tasks', async () => {
    callback.mockResolvedValue('resolved');

    const task = createTask({}, true);
    const anotherTask = createTask({ interval: 300 });

    trigger.addTask(task);
    trigger.addTask(anotherTask);

    for (let i = 0; i < 2; i++) {
      await new Promise((res) => setTimeout(res, 310));
      await libGlobal.events.emit('onTick');
    }

    const allTasks = trigger.getAllTasks();
    const activeTasks = trigger.getActiveTasks();
    const inactiveTasks = trigger.getInactiveTasks();

    expect(allTasks.length).toEqual(2);
    expect(activeTasks.length).toEqual(1);
    expect(inactiveTasks.length).toEqual(1);
  });

  test('should clear the list of completed tasks', async () => {
    const triggerTime = Date.now() + 500;

    for (let i = 0; i < 102; i++) {
      trigger.addTask(createTask({ triggerTime }, true));
    }

    await new Promise((res) => setTimeout(res, 500));
    await libGlobal.events.emit('onTick');

    const activeTasks = trigger.getActiveTasks();
    const inactiveTasks = trigger.getInactiveTasks();

    expect(activeTasks.length).toEqual(0);
    expect(inactiveTasks.length).toEqual(100);
  });
});
