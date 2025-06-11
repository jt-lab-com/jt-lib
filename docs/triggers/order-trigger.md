# OrderTrigger
___

A service for registering tasks by order.

* **Methods**
    - [addTask](#addTask)
    - [cancelTask](#cancelTask)
    - [getAllTasks](#getAllTasks)
    - [getActiveTasks](#getActiveTasks)
    - [getInactiveTasks](#getInactiveTasks)
    - [cancelAll](#cancelAll)


* **Interfaces**
  - [OrderTriggerTask](#orderTriggerTask)

<br>

## Methods

### [addTask](#addTask)

Registers a callback that will be called when the order is changed.

```typescript
addTask(params: CreateOrderTaskParams): string
```

* **Parameters**
    - `params`: \<_[CreateOrderTaskParams](#createOrderTaskParams)_> - Task params.


* **Returns:** <_string_> - Task id.

___

<br>

### [cancelTask](#cancelTask)

Cancels a task.

```typescript
cancelTask(taskId: string): void
```

* **Parameters**
    - `taskId`: \<_string_> - Task id.

___

<br>

### [getAllTasks](#getAllTasks)

Returns all active and completed tasks.

```typescript
getAllTasks(): OrderTriggerTask[]
```


* **Returns:** _Array<[OrderTriggerTask](#orderTriggerTask)>_ - Task array.

___

<br>

### [getActiveTasks](#getActiveTasks)

Returns all active tasks.

```typescript
getActiveTasks(): OrderTriggerTask[]
```


* **Returns:** _Array<[OrderTriggerTask](#orderTriggerTask)>_ - Task array.

___

<br>

### [getInactiveTasks](#getInactiveTasks)

Returns all completed tasks.

```typescript
getInactiveTasks(): OrderTriggerTask[]
```


* **Returns:** _Array<[OrderTriggerTask](#orderTriggerTask)>_ - Task array.

___

<br>

### [cancelAll](#cancelAll)

Cancels all active tasks.

```typescript
cancelAll(): void
```

___

<br>

## Interfaces

### [CreateOrderTaskParams](#createOrderTaskParams)

```typescript
interface CreateOrderTaskParams {
  name: string;
  orderId?: string;
  clientOrderId?: string;
  callbackArgs?: any;
  callback: (args?: any) => Promise<void>;
  status: 'open' | 'closed' | 'canceled';
  retry?: boolean | number;
  comment?: string;
  group?: string;
}
```
<br>

### [OrderTriggerTask](#orderTriggerTask)

```typescript
interface OrderTriggerTask {
  id: string;
  name: string;
  callbackArgs?: any;
  callback: (args?: any) => Promise<void>;
  type: TaskType;
  executedTimes: number;
  retry?: boolean | number;
  isTriggered: boolean;
  isActive: boolean;
  created: string;
  lastExecuted: string | null;
  createdTms: number;
  comment?: string;
  result?: any;
  error?: string;
  orderId?: string;
  clientOrderId?: string;
  status: 'open' | 'closed' | 'canceled';
  group?: string;
}
```
<br>