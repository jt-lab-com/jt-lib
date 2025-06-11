# PriceTrigger
___

A service for registering tasks by price.

* **Methods**
    - [addTask](#addTask)
    - [cancelTask](#cancelTask)
    - [getAllTasks](#getAllTasks)
    - [getActiveTasks](#getActiveTasks)
    - [getInactiveTasks](#getInactiveTasks)
    - [cancelAll](#cancelAll)


* **Interfaces**
  - [PriceTriggerTask](#priceTriggerTask)
  - [PriceTriggerDirection](#priceTriggerDirection)

<br>

## Methods

### [Constructor](#Constructor)

```typescript
const trigger = new PriceTrigger('ETH/USDT')
```

* **Parameters**
    - `symbol`: \<_string_> - Asset symbol.
___

<br>

### [addTask](#addTask)

Register a callback that will be called when the specified asset price is reached.

```typescript
addTask(params: CreatePriceTaskParams): string
```

* **Parameters**
    - `params`: \<_[CreatePriceTaskParams](#createPriceTaskParams)_> - Task params.


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
getAllTasks(): PriceTriggerTask[]
```


* **Returns:** _Array<[PriceTriggerTask](#priceTriggerTask)>_ - Task array.

___

<br>

### [getActiveTasks](#getActiveTasks)

Returns all active tasks.

```typescript
getActiveTasks(): PriceTriggerTask[]
```


* **Returns:** _Array<[PriceTriggerTask](#priceTriggerTask)>_ - Task array.

___

<br>

### [getInactiveTasks](#getInactiveTasks)

Returns all completed tasks.

```typescript
getInactiveTasks(): PriceTriggerTask[]
```


* **Returns:** _Array<[PriceTriggerTask](#priceTriggerTask)>_ - Task array.

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

### [CreatePriceTaskParams](#createPriceTaskParams)

```typescript
interface CreatePriceTaskParams {
  name: string;
  triggerTime: number;
  callbackArgs?: any;
  callback: (args?: any) => Promise<void>;
  retry?: boolean | number;
  interval?: number;
  comment?: string;
}
```
<br>

### [PriceTriggerTask](#priceTriggerTask)

```typescript
interface PriceTriggerTask {
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
  symbol: string;
  triggerPrice: number;
  direction: PriceTriggerDirection;
  group?: string;
}
```
<br>

### [PriceTriggerDirection](#priceTriggerDirection)

```typescript
enum PriceTriggerDirection {
  Up = 'up',
  Down = 'down',
}
```
<br>