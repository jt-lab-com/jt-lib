# TriggerService
___

A service for registering tasks by time, orders or price. Combines [OrderTrigger](triggers/order-trigger.md), [PriceTrigger](triggers/price-trigger.md) and [TimeTrigger](triggers/time-trigger.md).

* **Methods**
    - [addTaskByTime](#addTaskByTime)
    - [addTaskByOrder](#addTaskByOrder)
    - [addTaskByPrice](#addTaskByPrice)
    - [cancelOrderTask](#cancelOrderTask)
    - [cancelPriceTask](#cancelPriceTask)
    - [cancelTimeTask](#cancelTimeTask)
    - [cancelAll](#cancelAll)
    - [cancelAllOrderTasks](#cancelAllOrderTasks)
    - [cancelAllPriceTasks](#cancelAllPriceTasks)
    - [cancelAllTimeTasks](#cancelAllTimeTasks)

<br>

## Methods

### [addTaskByTime](#addTaskByTime)

Register a callback that is called when the designated time is reached.

```typescript
addTaskByTime(params: CreateTimeTaskParams): string
```

* **Parameters**
    - `params`: \<_[CreateTimeTaskParams](time-trigger.md#createTimeTaskParams)_> - Task params.


* **Returns:** _string_ - Task id.

___

<br>

### [addTaskByOrder](#addTaskByOrder)

Register a callback that will be called when the order is changed.

```typescript
addTaskByOrder(params: CreateOrderTaskParams): string
```

* **Parameters**
  - `params`: \<_[CreateOrderTaskParams](order-trigger.md#createOrderTaskParams)_> - Task params.


* **Returns:** _string_ - Task id.

___

<br>

### [addTaskByPrice](#addTaskByPrice)

Register a callback that will be called when the specified asset price is reached.

```typescript
addTaskByPrice(params: CreateOrderTaskParams): string
```

* **Parameters**
  - `params`: \<_[CreatePriceTaskParams](price-trigger.md#createPriceTaskParams)_> - Task params.


* **Returns:** _string_ - Task id.

___

<br>

### [cancelOrderTask](#cancelOrderTask)

Cancels a task on an order.

```typescript
cancelOrderTask(taskId: string): void
```

* **Parameters**
  - `taskId`: \<_string_> - Task id.

___

<br>

### [cancelPriceTask](#cancelPriceTask)

Cancels the task based on the asset price.

```typescript
cancelPriceTask(taskId: string): void
```

* **Parameters**
  - `taskId`: \<_string_> - Task id.

___

<br>

### [cancelTimeTask](#cancelTimeTask)

Cancels a task based on time.

```typescript
cancelTimeTask(taskId: string): void
```

* **Parameters**
  - `taskId`: \<_string_> - Task id.

___

<br>

### [cancelAll](#cancelAll)

Cancels active tasks for all triggers.

```typescript
cancelAll(): void
```

___

<br>

### [cancelAllOrderTasks](#cancelAllOrderTasks)

Cancels all active [OrderTrigger](order-trigger.md) tasks.

```typescript
cancelAllOrderTasks(): void
```

___

<br>

### [cancelAllPriceTasks](#cancelAllPriceTasks)

Cancels all active [PriceTrigger](price-trigger.md) tasks.

```typescript
cancelAllPriceTasks(): void
```

___

<br>

### [cancelAllTimeTasks](#cancelAllTimeTasks)

Cancels all active [TimeTrigger](time-trigger.md) tasks.

```typescript
cancelAllTimeTasks(): void
```

___

<br>