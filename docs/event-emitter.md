# EventEmitter
___

EventEmitter provide functionality for subscribe to events and emit events.

**Base event names:**
 - `onInit` - when script is initialized.
 - `onTick` - on each tick.
 - `onBar` - on each bar.
 - `onOrderChange` - on each order changed (open, close, cancel, etc).
 - `onStop` - when script is stopped (by user or by error).
 - `onArgsChange` - when script args are changed (by user).

<br>

###### Example
```typescript
// This example illustrates how to use EventsEmitter to calculate trade volume
class TradeVolume extends BaseObject {
  volume = 0;
  volumeUsd = 0;
  
  constructor() {
    super();
    global.events.subscribe('onOrderChange', this.calcVolume, this);
  }

// This function will be called on each time when order changed
 calcVolume = async (order: Order) => {
    if (order.status === 'closed' && order.reduceOnly !== true) {
      this.volume += order.amount; // volume in base currency
      this.volumeUsd += order.amount * order.price; // volume in USDT
    }
  };
}
```


<br>

* **Methods**
  - [emit](#emit)
  - [on](#on)
  - [subscribe](#subscribe)
  - [unsubscribeById](#unsubscribeById)
  - [unsubscribeByObj](#unsubscribeByObj)
 
___

<br>

## Methods

### [emit](#emit)

Emit event with data.

```typescript
global.events.emit(event: string, data: any): Promise<void>
```

* **Parameters**
  - `event`: \<_string_> - event name.
  - `data`: \<_any_> - data for listeners.


* **Returns:** _Promise<_void_>_

___

<br>

### [on](#on)

Subscribe to event with listener. Returns the subscription id.

> Note: Listener (function) wouldn't be deleted even object witch has this listener is destroyed (you should unsubscribe manually).

```typescript
global.events.on(event: string, listener: (...args: any[]) => void, obj?: BaseObject): Promise<number>
```

* **Parameters**
  - `event`: \<_string_> - event name.
  - `listener`: \<_Function_> - will be called when an event occurs.
  - `obj?`: \<_[BaseObject](new/base-object.md)_> - object witch has this listener (for unsubscribing by object).


* **Returns:** _Promise<_number_>_

___

<br>

### [subscribe](#subscribe)

Subscribe to event with listener. Returns the subscription id.

> Note: Listener (function) wouldn't be deleted even object witch has this listener is destroyed (you should unsubscribe manually).
>> You can use on() instead of subscribe().

```typescript
global.events.subscribe(event: string, listener: (...args: any[]) => void, obj?: BaseObject): Promise<number>
```

* **Parameters**
  - `event`: \<_string_> - event name.
  - `listener`: \<_Function_> - will be called when an event occurs.
  - `obj?`: \<_[BaseObject](new/base-object.md)_> - object witch has this listener (for unsubscribing by object).


* **Returns:** _Promise<_number_>_

___

<br>

### [unsubscribeById](#unsubscribeById)

Unsubscribe from event by listener id.

```typescript
global.events.unsubscribeById(listenerId: number): boolean
```

* **Parameters**
  - `listenerId`: \<_number_> - listener id.


* **Returns:** _boolean_

___

<br>

### [unsubscribeByObj](#unsubscribeByObj)

Unsubscribe from event by object. Return count of unsubscribed listeners.

```typescript
global.events.unsubscribeByObj(obj: BaseObject): number
```

* **Parameters**
  - `obj`: \<_[BaseObject](new/base-object.md)_> - object witch has listeners.


* **Returns:** _number_

<br>



