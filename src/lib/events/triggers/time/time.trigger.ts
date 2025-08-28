import { globals } from '../../../core/globals';
import { Trigger } from '../trigger';
import { error, log, warning } from '../../../core/log';
import { currentTime, currentTimeString, timeToString } from '../../../utils/date-time';
import { CreateTimeTaskParams, TimeTriggerTask } from './types';
import { BaseObject } from '../../../core/base-object';
import { BaseError } from '../../../core/errors';
import { TriggerHandler, TriggerTask } from '../types';
import { validateNumbersInObject } from '../../../utils/numbers';

const MAX_INACTIVE_TASKS = 100;

export class TimeTrigger extends Trigger implements TimeTrigger {
  private readonly _registeredHandlers = new Map<string, TriggerHandler>();
  private readonly activeTasks = new Map<string, TimeTriggerTask>();
  private readonly inactiveTasks = new Map<string, TimeTriggerTask>();

  private _eventListenerId: string | null = null;
  private nextId: number = 1;

  private minTriggerTime: number;

  registerHandler(taskName: string, handler: Function, owner: BaseObject) {
    if (typeof handler !== 'function') {
      // in typescript function.name is not defined for arrow functions
      throw new BaseError('TimeTrigger::subscribe() Arrow function is not allowed in callback', { taskName });
    }
    if (!(owner instanceof BaseObject)) {
      throw new BaseError('TimeTrigger::subscribe() The owner must be an instance of the BaseObject class', {
        taskName,
      });
    }
    if (!owner[handler.name] || typeof owner[handler.name] !== 'function') {
      throw new BaseError(
        `TimeTrigger::subscribe() ${handler.name} should be a function of ${owner.constructor.name}`,
        { taskName },
      );
    }
    if (this._registeredHandlers.get(taskName)) {
      throw new BaseError(`TimeTrigger::subscribe() The handler for the task ${taskName} is already registered`, {
        taskName,
      });
    }

    log('TimeTrigger::registerHandler', 'New handler registered', { taskName });
    this._registeredHandlers.set(taskName, { callback: handler.bind(owner), funcName: handler.name });
  }

  addTask(params: CreateTimeTaskParams): string {
    //TODO validate callback it should be an arrow function
    const { triggerTime } = params;

    if (!validateNumbersInObject({ triggerTime: triggerTime })) {
      error(TimeTrigger.name, 'Error adding a task. The trigger time must be a number', {
        args: arguments,
      });
      return null;
    }

    if (triggerTime <= currentTime()) {
      warning(TimeTrigger.name, 'triggerTime less than current time This task will be executed immediately', {
        args: arguments,
        msDiff: currentTime() - triggerTime,
        triggerTime: timeToString(triggerTime),
        currentTime: timeToString(currentTime()),
      });
    }

    const id = `time#${this.nextId++}`;

    this.minTriggerTime = this.minTriggerTime ? Math.min(triggerTime, this.minTriggerTime) : triggerTime;

    this.activeTasks.set(id, {
      ...params,
      id,
      type: 'time',
      isTriggered: false,
      isActive: true,
      created: currentTimeString(),
      createdTms: currentTime(),
      lastExecuted: null,
      executedTimes: 0,
      result: null,
    });

    if (!this._eventListenerId) {
      this._eventListenerId = globals.events.subscribe('onTick', this.onTick, this);
    }

    log('TimeTrigger::addTask', 'New task registered', { task: params });

    return id;
  }

  private async onTick() {
    if (!this.minTriggerTime || this.minTriggerTime > currentTime()) return;

    for (const task of this.activeTasks.values()) {
      if (currentTime() < task.triggerTime) continue;
      await this.executeTask(task);
    }

    this.recalculateMinTriggerTime();

    if (!this.minTriggerTime) {
      globals.events.unsubscribeById(this._eventListenerId);
      this._eventListenerId = null;
    }

    this.clearInactive();

    return { minTriggerTime: this.minTriggerTime, activeTasks: this.activeTasks.size };
  }

  recalculateMinTriggerTime() {
    const activeTasks = Array.from(this.activeTasks.values());

    this.minTriggerTime = activeTasks.reduce<number | null>((res, task) => {
      if (!res) return task.triggerTime;

      if (res > task.triggerTime) {
        res = task.triggerTime;
      }

      return res;
    }, null);
  }
  private async executeTask(task: TimeTriggerTask) {
    if (!task.callback && !this._registeredHandlers.get(task.name)) {
      task.isActive = false;

      this.activeTasks.delete(task.id);
      this.inactiveTasks.set(task.id, task);

      throw new BaseError(`There is no registered handler or callback for the task`, { taskName: task.name });
    }

    try {
      if (task.callback) {
        task.result = await task.callback(task.args);
      } else {
        const handler = this._registeredHandlers.get(task.name);
        task.result = await handler.callback(task.args);
      }
      task.lastExecuted = currentTimeString();
      task.executedTimes++;
      task.isTriggered = true;

      if (!task.interval) {
        task.isActive = false;

        this.inactiveTasks.set(task.id, task);
        this.activeTasks.delete(task.id);

        return;
      }

      task.triggerTime = tms() + task.interval;
    } catch (e) {
      let registeredHandlers = Array.from(this._registeredHandlers.values());
      error(e, { task, registeredHandlers });

      if (!task.retry) {
        task.isActive = false;
        task.isTriggered = true;
        task.error = e.message;

        this.inactiveTasks.set(task.id, task);
        this.activeTasks.delete(task.id);

        return;
      }

      if (typeof task.retry === 'number') {
        task.retry -= 1;
      }

      // await this.executeTask(task);
    }
  }

  hasHandler(taskName: string): boolean {
    return this._registeredHandlers.has(taskName);
  }

  cancelTask(taskId: string) {
    const task = this.activeTasks.get(taskId);

    if (!task) {
      error(TimeTrigger.name, 'An error occurred while canceling the task: Task not found', { taskId });
      return;
    }

    this.inactiveTasks.set(taskId, task);
    this.activeTasks.delete(taskId);
    this.clearInactive();

    this.recalculateMinTriggerTime();
    log('TimeTrigger::cancelTask', 'Task canceled ' + taskId, { taskId, task });
  }

  getTasksByName(taskName: string): TriggerTask[] {
    return [...this.activeTasks.values()].filter((task) => task.name === taskName);
  }

  getAllTasks(): TimeTriggerTask[] {
    return [...this.inactiveTasks.values(), ...this.activeTasks.values()];
  }

  getActiveTasks(): TimeTriggerTask[] {
    return Array.from(this.activeTasks.values());
  }

  getInactiveTasks(): TimeTriggerTask[] {
    return Array.from(this.inactiveTasks.values());
  }

  cancelAll() {
    for (const task of this.activeTasks.values()) {
      this.inactiveTasks.set(task.id, task);
      this.activeTasks.delete(task.id);
    }

    this.recalculateMinTriggerTime();
    this.clearInactive();
  }

  private clearInactive() {
    if (this.inactiveTasks.size < MAX_INACTIVE_TASKS) return;

    Array.from(this.inactiveTasks.values())
      .sort((a, b) => b.createdTms - a.createdTms)
      .slice(0, -100)
      .forEach((task) => this.inactiveTasks.delete(task.id));
  }

  beforeStore() {
    Array.from(this.activeTasks.entries()).forEach(([taskId, task]) => {
      if (!!task.callback) {
        this.activeTasks.delete(taskId);
      }
    });
    this.inactiveTasks.clear();
  }

  afterReStore() {
    for (let task of this.getActiveTasks()) {
      if (task.callback) {
        this.cancelTask(task.id);
        warning('PriceTrigger::afterRestore', 'Task with callback was canceled', { task });
      }
    }
    //TODO make a better algorithm for restoring tasks from storage
    if (!this._eventListenerId) {
      this._eventListenerId = globals.events.subscribe('onTick', this.onTick, this);
    }
  }
}
