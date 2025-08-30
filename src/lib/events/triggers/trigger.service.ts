import { BaseObject } from '../../core/base-object';
import { PriceTrigger } from './price/price.trigger';
import { CreateOrderTaskParams } from './order/types';
import { CreatePriceTaskParams } from './price/types';
import { CreateTimeTaskParams } from './time/types';
import { TaskType, TriggerServiceInterface, TriggerTask } from './types';
import { TimeTrigger } from './time/time.trigger';
import { OrderTrigger } from './order/order.trigger';
import { error } from '../../core/log';

export class TriggerService extends BaseObject implements TriggerServiceInterface {
  private readonly _timeTrigger: TimeTrigger;
  private readonly _orderTrigger: OrderTrigger;
  private readonly _priceTriggers: Record<string, PriceTrigger> = {};

  idPrefix = '';
  constructor(args: { idPrefix?: string; symbol?: string; storageKey?: string } = {}) {
    super(args);
    this.idPrefix = args?.idPrefix ?? '';
    this._timeTrigger = new TimeTrigger({ idPrefix: this.idPrefix, storageKey: args?.storageKey });
    this._orderTrigger = new OrderTrigger({ idPrefix: this.idPrefix });

    if (args?.symbol) {
      let symbol = args.symbol;
      this.createNewPriceTrigger(symbol);
    }

    this.addChild(this._timeTrigger);
    this.addChild(this._orderTrigger);
  }

  private createNewPriceTrigger(symbol: string) {
    let trigger = new PriceTrigger({ symbol });
    this.addChild(trigger);
    this._priceTriggers[symbol] = trigger;
    return trigger;
  }

  getPriceTrigger(symbol: string) {
    if (this._priceTriggers[symbol]) {
      return this._priceTriggers[symbol];
    } else {
      return this.createNewPriceTrigger(symbol);
    }
  }

  registerOrderHandler(taskName: string, handler: Function, owner: BaseObject) {
    this._orderTrigger.registerHandler(taskName, handler, owner);
  }

  hasOrderHandler(taskName: string) {
    return this._orderTrigger.hasHandler(taskName);
  }

  registerPriceHandler(symbol: string, taskName: string, handler: Function, owner: BaseObject) {
    let trigger = this.getPriceTrigger(symbol);

    trigger.registerHandler(taskName, handler, owner);
  }

  hasPriceHandler(symbol: string, taskName: string) {
    const trigger = this._priceTriggers[symbol];

    if (!trigger) return false;

    return trigger.hasHandler(taskName);
  }

  registerTimeHandler(taskName: string, handler: Function, owner: BaseObject) {
    this._timeTrigger.registerHandler(taskName, handler, owner);
  }

  hasTimeHandler(taskName: string) {
    return this._timeTrigger.hasHandler(taskName);
  }

  /**
   * Add a task to the time trigger
   * @param params - task parameters (name, triggerTime,callback args, retry, interval, comment)
   * name - task name - (if handler is registered for this task, it will be executed)
   * triggerTime - time in milliseconds when the task should be executed
   * callback - function to be executed (if not provided, the task will be executed by the handler)
   * args - arguments for the callback function
   * retry - count of retries if the task fails
   * interval - time in milliseconds  for the task to be repeated
   * comment - task comment
   */
  addTaskByTime(params: CreateTimeTaskParams) {
    return this._timeTrigger.addTask(params);
  }

  /**
   * Add a task to the order trigger
   * @param params - task parameters (name, callback,orderId args, retry, comment)
   * name - task name - (if handler is registered for this task, it will be executed)
   * orderId or clientOrderId - order id or client order id
   * callback - function to be executed (if not provided, the task will be executed by the handler)
   * args - arguments for the callback function
   * retry - count of retries if the task fails
   * comment - task comment
   */
  addTaskByOrder(params: CreateOrderTaskParams) {
    return this._orderTrigger.addTask(params);
  }

  /**
   * Add a task to the price trigger
   * @param params - task parameters (name, symbol, triggerPrice, callback, args, retry, comment, group)
   * name - task name - (if handler is registered for this task, it will be executed)
   * symbol - symbol for the task
   * triggerPrice - price when the task should be executed
   * callback - function to be executed (if not provided, the task will be executed by the handler)
   * args - arguments for the callback function
   * retry - count of retries if the task fails
   * group - group name for the task
   * comment - task comment
   *
   */
  addTaskByPrice(params: CreatePriceTaskParams & { symbol: string }) {
    let trigger = this.getPriceTrigger(params.symbol);

    return trigger.addTask(params);
  }

  getActiveTasks(): TriggerTask[] {
    const timeTasks = this._timeTrigger.getActiveTasks();
    const orderTasks = this._orderTrigger.getActiveTasks();
    const priceTasks = Object.values(this._priceTriggers).reduce((acc, trigger) => {
      return [...acc, ...trigger.getActiveTasks()];
    }, []);

    return [...timeTasks, ...orderTasks, ...priceTasks];
  }

  getInactiveTasks() {
    const timeTasks = this._timeTrigger.getInactiveTasks();
    const orderTasks = this._orderTrigger.getInactiveTasks();
    const priceTasks = Object.values(this._priceTriggers).reduce((acc, trigger) => {
      return [...acc, ...trigger.getInactiveTasks()];
    }, []);

    return [...timeTasks, ...orderTasks, ...priceTasks];
  }

  getTasksByName(taskName: string, type: TaskType): TriggerTask[] {
    if (type === 'price') {
      let priceTasks = [];
      for (const priceTrigger of Object.values(this._priceTriggers)) {
        const tasks = priceTrigger.getTasksByName(taskName);
        priceTasks = [...priceTasks, ...tasks];
      }

      return priceTasks;
    }

    if (type === 'order') return this._orderTrigger.getTasksByName(taskName);

    if (type === 'time') return this._timeTrigger.getTasksByName(taskName);

    return [];
  }

  cancelOrderTask(taskId: string) {
    return this._orderTrigger.cancelTask(taskId);
  }

  cancelPriceTask(taskId: string, symbol: string) {
    const trigger = this._priceTriggers[symbol];

    if (!trigger) {
      error(TriggerService.name, 'Price trigger not found', { taskId, symbol });
      return;
    }

    return trigger.cancelTask(taskId);
  }

  cancelTimeTask(taskId: string) {
    return this._timeTrigger.cancelTask(taskId);
  }

  cancelAll() {
    this.cancelAllOrderTasks();
    this.cancelAllPriceTasks();
    this.cancelAllTimeTasks();
  }

  cancelAllOrderTasks(): void {
    this._orderTrigger.cancelAll();
  }

  cancelAllPriceTasks(): void {
    for (const priceTrigger of Object.values(this._priceTriggers)) {
      priceTrigger.cancelAll();
    }
  }

  cancelAllTimeTasks(): void {
    this._timeTrigger.cancelAll();
  }
}
