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

  constructor(args: any = {}) {
    super(args);

    if (args?.storageKey && !isTester()) {
      try {
        const className = this.constructor.name;
        const symbol = args?.symbol ? '-' + args.symbol : '';
        const key = className + args.storageKey + symbol;
        globals.storage.addObject(key, this);
        log('Trigger::constructor', `Object added to storage with key ${key}`, { args });
      } catch (e) {
        error(e, { args });
      }
    }
  }

  beforeStore() {
    this.updateStorageTasks();
  }
  updateStorageTasks() {
    let tasks = this.getActiveTasks().filter((task) => task?.canReStore);
    log('TimeTrigger::updateStorageTasks', 'updating storage tasks', { tasks }, true);
    this.storageTasks = tasks;
  }
  afterReStore() {
    if (this.storageTasks?.length) {
      for (const task of this.storageTasks) {
        this.addTask(task);
      }
    }
  }
}
