import { TriggerTask } from '../types';

export interface OrderTriggerInterface {
  addTask(params: CreateOrderTaskParams): void;
}

type AtLeastOne<T, Keys extends keyof T = keyof T> = Keys extends keyof T
  ? Partial<T> & Required<Pick<T, Keys>>
  : never;

export type CreateOrderTaskParams = CreateTaskBaseParams & AtLeastOne<OrderIdFields, 'orderId' | 'clientOrderId'>;

interface CreateTaskBaseParams {
  name: string;
  args?: any;
  callback?: (args?: any) => Promise<any>;
  status: 'open' | 'closed' | 'canceled';
  retry?: boolean | number;
  comment?: string;
  group?: string;
  canReStore?: boolean;
}

interface OrderIdFields {
  orderId?: string;
  clientOrderId?: string;
}

export interface OrderTriggerTask extends TriggerTask {
  orderId?: string;
  clientOrderId?: string;
  status: 'open' | 'closed' | 'canceled';
  group?: string;
}
