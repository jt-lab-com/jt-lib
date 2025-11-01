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

export interface PnlChangeEventData {
  type: 'pnl' | 'fee' | 'transfer';
  amount: number;
  symbol: string;
  order: Order;
}

export interface TimerEventData {
  // Timer events don't carry specific data
}

export interface TickEndedEventData {
  // Tick ended events don't carry specific data
}

export interface ArgsUpdateEventData {
  [key: string]: string | number | boolean | Date;
}

export interface CustomEventData {
  event: string;
  data: any;
}

export interface RunEventData {
  // Run events don't carry specific data
}

export interface StopEventData {
  // Stop events don't carry specific data
}

export interface ReportActionEventData {
  action: string;
  value: any;
}

// Event Names Union Type
export type EventName =
  | 'onOrderChange'
  | 'onTick'
  | 'onPnlChange'
  | 'onTimer'
  | 'onTickEnded'
  | 'onArgsUpdate'
  | 'onEvent'
  | 'onRun'
  | 'onBeforeStop'
  | 'onStop'
  | 'onAfterStop'
  | 'onReportAction'
  | 'onBeforeTick' // Deprecated
  | 'onAfterTick' // Deprecated
  | `onOrderChange_${string}` // Dynamic symbol-based order change events
  | `onTick_${string}`; // Dynamic symbol-based tick events

// Helper aliases for template-literal events
export type SymbolOrderChangeEvent = `onOrderChange_${string}`;
export type SymbolTickEvent = `onTick_${string}`;
export type TickEventName = 'onTick' | SymbolTickEvent;

// Event Data Union Type
export type EventData =
  | Order
  | PnlChangeEventData
  | TimerEventData
  | TickEndedEventData
  | ArgsUpdateEventData
  | CustomEventData
  | RunEventData
  | StopEventData
  | ReportActionEventData
  | undefined;

// Event Handler Type
export type EventHandler<T = EventData> = (data?: T) => Promise<any>;

// Conditional type to get event data type
export type GetEventData<T extends EventName> = T extends 'onOrderChange'
  ? Order
  : T extends `onOrderChange_${string}`
  ? Order
  : T extends 'onTick'
  ? undefined
  : T extends `onTick_${string}`
  ? undefined
  : T extends 'onPnlChange'
  ? PnlChangeEventData
  : T extends 'onTimer'
  ? undefined
  : T extends 'onTickEnded'
  ? undefined
  : T extends 'onArgsUpdate'
  ? ArgsUpdateEventData
  : T extends 'onEvent'
  ? CustomEventData
  : T extends 'onRun'
  ? undefined
  : T extends 'onBeforeStop'
  ? undefined
  : T extends 'onStop'
  ? undefined
  : T extends 'onAfterStop'
  ? undefined
  : T extends 'onReportAction'
  ? ReportActionEventData
  : T extends 'onBeforeTick'
  ? undefined
  : T extends 'onAfterTick'
  ? undefined
  : never;

// Typed Event Handler
export type TypedEventHandler<T extends EventName> = (data?: GetEventData<T>) => Promise<any>;

// Typed Subscribe Function
export type TypedSubscribe = <T extends EventName>(
  eventName: T,
  handler: TypedEventHandler<T>,
  owner: BaseObject,
) => string;

// Typed Emit Function
export type TypedEmit = <T extends EventName>(
  eventName: T,
  data?: GetEventData<T>,
  listeners?: EventListener[],
) => Promise<void>;

// Event Subscription Options
export interface EventSubscriptionOptions {
  symbol?: string;
  interval?: number;
}
