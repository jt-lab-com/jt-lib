# TimeTrigger
___

A service for registering tasks by time.

* **Methods**
    - [addTask](#addTask)
    - [cancelTask](#cancelTask)
    - [getAllTasks](#getAllTasks)
    - [getActiveTasks](#getActiveTasks)
    - [getInactiveTasks](#getInactiveTasks)
    - [cancelAll](#cancelAll)


* **Interfaces**
  - [TimeTriggerTask](#timeTriggerTask)

<br>

## Methods

### [addTask](#addTask)

Register a callback that is called when the designated time is reached.

```typescript
addTask(params: CreateTimeTaskParams): string
```

* **Parameters**
    - `params`: \<_[CreateTimeTaskParams](#createTimeTaskParams)_> - Task params.


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
getAllTasks(): TimeTriggerTask[]
```


* **Returns:** _Array<[TimeTriggerTask](#timeTriggerTask)>_ - Task array.

___

<br>

### [getActiveTasks](#getActiveTasks)

Returns all active tasks.

```typescript
getActiveTasks(): TimeTriggerTask[]
```


* **Returns:** _Array<[TimeTriggerTask](#timeTriggerTask)>_ - Task array.

___

<br>

### [getInactiveTasks](#getInactiveTasks)

Returns all completed tasks.

```typescript
getInactiveTasks(): TimeTriggerTask[]
```


* **Returns:** _Array<[TimeTriggerTask](#timeTriggerTask)>_ - Task array.

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

### [CreateTimeTaskParams](#createTimeTaskParams)

```typescript
interface CreateTimeTaskParams {
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

### [TimeTriggerTask](#timeTriggerTask)

```typescript
interface TimeTriggerTask {
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
  triggerTime: number;
  interval?: number;
}
```
<br>