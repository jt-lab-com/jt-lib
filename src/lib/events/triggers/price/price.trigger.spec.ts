import { PriceTrigger } from './price.trigger';
import { globals as libGlobal } from '../../../core/globals';
import { EventEmitter } from '../../event-emitter';
import { CreatePriceTaskParams } from './types';
import { BaseObject } from '../../../core/base-object';
import { timeCurrent } from '../../../utils/date-time';

jest.mock('../../../core/globals');
jest.mock('../../../utils/date-time', () => ({
  timeCurrent: jest.fn(),
  currentTime: jest.fn(),
  currentTimeString: jest.fn(),
}));

let trigger: PriceTrigger;
let nextId = 1;
let now = Date.now();

const callback = jest.fn();

const createTask = (options?: Partial<CreatePriceTaskParams>, withCallback?: boolean): CreatePriceTaskParams => ({
  name: `task #${nextId++}`,
  args: { foo: 'bar' },
  ...(withCallback && {
    callback,
  }),
  ...options,
  triggerPrice: options?.triggerPrice ?? 100,
});

beforeEach(() => {
  now = Date.now();

  globalThis.close = jest.fn();
  globalThis.tms = jest.fn();

  (global.tms as jest.Mock).mockReturnValue(now);
  (timeCurrent as jest.Mock).mockReturnValue(now);

  callback.mockClear();
  callback.mockResolvedValue({});
  libGlobal.events = new EventEmitter({ idPrefix: 'unit-test' });
  libGlobal.events.setDefaultTickInterval(1000);
  trigger = new PriceTrigger({ symbol: 'ETH/USDT' });
});

describe('PriceTrigger', () => {
  test('should return task id', () => {
    const id = trigger.addTask(createTask());

    expect(id).toBeDefined();
  });

  test('should trigger a handler when the price rises above the given price', async () => {
    class MockObject extends BaseObject {
      mockConstructor: Function;

      constructor() {
        super();

        this.mockConstructor = jest.fn();
        trigger.registerHandler('mockTask', this.mockConstructor, this);
      }
    }

    (global.close as jest.Mock).mockReturnValue(1);
    const mockObj = new MockObject();
    const task = createTask({ triggerPrice: 10, name: 'mockTask' });

    trigger.addTask(task);

    (global.close as jest.Mock).mockReturnValue(5);
    (global.tms as jest.Mock).mockReturnValue(now + 2000);
    (timeCurrent as jest.Mock).mockReturnValue(now + 2000);

    await libGlobal.events.emitOnTick();

    expect(mockObj.mockConstructor).not.toBeCalled();

    (global.close as jest.Mock).mockReturnValue(11);
    (global.tms as jest.Mock).mockReturnValue(now + 3000);
    (timeCurrent as jest.Mock).mockReturnValue(now + 3000);

    await libGlobal.events.emitOnTick();

    expect(mockObj.mockConstructor).toBeCalledTimes(1);
  });

  test('should trigger a callback when the price rises above the given price', async () => {
    (global.close as jest.Mock).mockReturnValue(10);

    const task1 = createTask({ triggerPrice: 20 }, true);
    const task2 = createTask({ triggerPrice: 21 }, true);

    trigger.addTask(task1);
    trigger.addTask(task2);

    (global.tms as jest.Mock).mockReturnValue(now + 3000);
    (timeCurrent as jest.Mock).mockReturnValue(now + 3000);

    (global.close as jest.Mock).mockReturnValue(25);
    await libGlobal.events.emitOnTick();
    await libGlobal.events.emitOnTick();

    expect(callback).toBeCalledTimes(2);
  });

  test('should trigger a callback when the price drops below a given price', async () => {
    (global.close as jest.Mock).mockReturnValue(10);

    const task1 = createTask({ triggerPrice: 7 }, true);
    const task2 = createTask({ triggerPrice: 6 }, true);

    trigger.addTask(task1);
    trigger.addTask(task2);

    (global.tms as jest.Mock).mockReturnValue(now + 3000);
    (timeCurrent as jest.Mock).mockReturnValue(now + 3000);

    (global.close as jest.Mock).mockReturnValue(5);
    await libGlobal.events.emitOnTick();
    await libGlobal.events.emitOnTick();

    expect(callback).toBeCalledTimes(2);
  });

  test('should not trigger callbacks until the current price has reached the trigger threshold', async () => {
    (global.close as jest.Mock).mockReturnValue(15);
    const task1 = createTask({ triggerPrice: 10 }, true);
    const task2 = createTask({ triggerPrice: 30 }, true);

    trigger.addTask(task1);
    trigger.addTask(task2);

    (global.close as jest.Mock).mockReturnValue(16);

    (global.tms as jest.Mock).mockReturnValue(now + 3000);
    (timeCurrent as jest.Mock).mockReturnValue(now + 3000);

    await libGlobal.events.emitOnTick();

    expect(callback).not.toBeCalled();
  });

  test('should be placed in inactive callbacks if one of the group of callbacks is executed', async () => {
    (global.close as jest.Mock).mockReturnValue(20);

    for (let i = 1; i < 4; i++) {
      trigger.addTask(createTask({ triggerPrice: i * 10, group: 'grouped' }, true));
    }

    (global.close as jest.Mock).mockReturnValue(22);
    (global.tms as jest.Mock).mockReturnValue(now + 3000);
    (timeCurrent as jest.Mock).mockReturnValue(now + 3000);
    await libGlobal.events.emitOnTick();

    expect(trigger.getActiveTasks().length).toEqual(0);
    expect(trigger.getInactiveTasks().length).toEqual(3);
  });

  test('should call the callback again if an error occurred and the number of attempts was passed', async () => {
    (global.close as jest.Mock).mockReturnValue(10);
    trigger.addTask(createTask({ triggerPrice: 10, retry: 3 }, true));

    callback.mockRejectedValue({ error: true });

    (global.tms as jest.Mock).mockReturnValue(now + 3000);
    (timeCurrent as jest.Mock).mockReturnValue(now + 3000);
    await libGlobal.events.emitOnTick();

    expect(callback).toBeCalledTimes(4);
  });

  test('should not call the handler if an error occurs and the number of attempts is not passed', async () => {
    (global.close as jest.Mock).mockReturnValue(10);
    trigger.addTask(createTask({ triggerPrice: 10 }, true));

    callback.mockRejectedValue({ error: true });

    (global.tms as jest.Mock).mockReturnValue(now + 3000);
    (timeCurrent as jest.Mock).mockReturnValue(now + 3000);
    await libGlobal.events.emitOnTick();

    expect(callback).toBeCalledTimes(1);
  });

  test('should cancel task', async () => {
    (global.close as jest.Mock).mockReturnValue(10);
    const taskId = trigger.addTask(createTask({ triggerPrice: 10 }, true));
    trigger.cancelTask(taskId);

    (global.tms as jest.Mock).mockReturnValue(now + 3000);
    (timeCurrent as jest.Mock).mockReturnValue(now + 3000);
    await libGlobal.events.emitOnTick();

    expect(callback).not.toBeCalled();
  });

  test('should unsubscribe from global events when all tasks are completed', async () => {
    (global.close as jest.Mock).mockReturnValue(10);
    trigger.addTask(createTask({ triggerPrice: 10 }, true));

    (global.tms as jest.Mock).mockReturnValue(now + 3000);
    (timeCurrent as jest.Mock).mockReturnValue(now + 3000);
    await libGlobal.events.emitOnTick();

    expect(libGlobal.events.getListenersCount()).toEqual(0);
  });

  test('should return tasks by name', async () => {
    const taskName = 'test_task_name';
    trigger.addTask(createTask({ name: taskName }, true));

    const tasks = trigger.getTasksByName(taskName);

    expect(tasks.length).toEqual(1);
    expect(tasks[0].name).toEqual(taskName);
  });

  test('should return all tasks', async () => {
    for (let i = 0; i < 3; i++) {
      trigger.addTask(createTask({}, true));
    }

    const tasks = trigger.getAllTasks();

    expect(tasks.length).toEqual(3);
  });

  test('should return active & inactive tasks', async () => {
    (global.close as jest.Mock).mockReturnValue(15);

    for (let i = 1; i <= 3; i++) {
      trigger.addTask(createTask({ triggerPrice: i * 10 }, true));
    }

    (global.close as jest.Mock).mockReturnValue(5);
    (global.tms as jest.Mock).mockReturnValue(now + 3000);
    (timeCurrent as jest.Mock).mockReturnValue(now + 3000);
    await libGlobal.events.emitOnTick();

    const activeTasks = trigger.getActiveTasks();
    const inactiveTasks = trigger.getInactiveTasks();

    expect(activeTasks.length).toEqual(2);
    expect(inactiveTasks.length).toEqual(1);
  });

  test('should clear the list of completed tasks', async () => {
    (global.close as jest.Mock).mockReturnValue(15);

    for (let i = 0; i < 103; i++) {
      trigger.addTask(createTask({ triggerPrice: 10 }, true));
    }

    (global.close as jest.Mock).mockReturnValue(9);
    (global.tms as jest.Mock).mockReturnValue(now + 3000);
    (timeCurrent as jest.Mock).mockReturnValue(now + 3000);
    await libGlobal.events.emitOnTick();

    const inactiveTasks = trigger.getInactiveTasks();

    expect(inactiveTasks.length).toEqual(100);
  });
});
