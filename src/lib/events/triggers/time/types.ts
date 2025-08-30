import { TriggerTask } from '../types';

export interface TimeTrigger {
  addTask: (params: CreateTimeTaskParams) => void;
}

export interface CreateTimeTaskParams {
  name: string;
  triggerTime: number;
  args?: any;
  callback?: (args?: any) => Promise<any>;
  retry?: boolean | number;
  interval?: number;
  comment?: string;
  canReStore?: boolean;
}

export interface TimeTriggerTask extends TriggerTask {
  triggerTime: number;
  interval?: number;
  comment?: string;
}
