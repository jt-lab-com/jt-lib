import { BaseObject } from '../core/base-object';

export interface EventListener {
  id: string;
  event: string;
  handlerName: string;
  handler: (data?: any) => Promise<void>;
  owner: BaseObject;
  ownerName: string;
  ownerId: string;
  result?: any;
}

export interface TickExecutionData {
  interval: number;
  symbol: string;
  nextTick: number;
}
