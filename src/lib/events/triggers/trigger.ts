import { BaseObject } from '../../core/base-object';
import { TriggerTask } from './types';

export abstract class Trigger extends BaseObject {
  abstract getAllTasks(): TriggerTask[];
  abstract getActiveTasks(): TriggerTask[];
  abstract getInactiveTasks(): TriggerTask[];
  abstract cancelTask(taskId: string): void;
  abstract cancelAll(): void;
  abstract registerHandler(taskName: string, handler: Function, owner: BaseObject): void;
  abstract getTasksByName(taskName: string): TriggerTask[];
}
