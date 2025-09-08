import { BaseObject } from '../../core/base-object';
import { TriggerTask } from './types';
import { BaseError } from '../../core/errors';
import { error, log } from '../../core/log';
import { globals } from '../../core/globals';

export abstract class Trigger extends BaseObject {
  abstract getAllTasks(): TriggerTask[];
  abstract getActiveTasks(): TriggerTask[];
  abstract getInactiveTasks(): TriggerTask[];
  abstract cancelTask(taskId: string): void;
  abstract cancelAll(): void;
  abstract registerHandler(taskName: string, handler: Function, owner: BaseObject): void;
  abstract getTasksByName(taskName: string): TriggerTask[];
  abstract addTask(params: any): string;
  abstract inactivateTask(task: TriggerTask): void;
  abstract storageTasks: TriggerTask[];

  _args: any = {};

  constructor(args: any = {}) {
    super(args);

    this._args = args;
  }

  isInit = false;
  init() {
    if (this.isInit) return;

    this.isInit = true;
    const storageKey = this._args?.storageKey;
    if (storageKey && !isTester()) {
      try {
        const symbol = this._args?.symbol ? `#${this._args.symbol}` : '';

        const className = this.constructor.name;
        const key = className + storageKey + symbol;
        globals.storage.addObject(key, this, ['storageTasks']);
        //log('Trigger::init', `Object added to storage with key ${key}`, { args: this._args });
      } catch (e) {
        error(e, { args: this._args });
      }
    }
  }
  beforeStore() {
    this.updateStorageTasks();
  }
  updateStorageTasks() {
    let tasks = this.getActiveTasks().filter((task) => task?.canReStore);
    //log('TimeTrigger::updateStorageTasks', 'updating storage tasks', { tasks }, true);
    this.storageTasks = tasks;
  }

  afterReStore() {
    const className = this.constructor.name;
    log('Trigger::afterReStore', 'restoring tasks from storage', { storageTasks: this.storageTasks, className }, true);
    if (this.storageTasks?.length) {
      for (const task of this.storageTasks) {
        this.addTask(task);
      }
    }
  }
}
