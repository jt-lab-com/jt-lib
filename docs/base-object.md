# BaseObject
___

It is advisable to inherit all classes created from the BaseObject class.
This will allow you to attach an event listener to the object.
> Note: You can remove all event listeners from an object by calling the `unsubscribe()` method.

###### Example
```typescript
class TradeVolume extends BaseObject {
  volume = 0;
  volumeUsd = 0;
  constructor() {
    super();
    global.events.subscribe('onOrderChange', this.calcVolume, this);
    global.events.subscribe('customEvent', this.customEventHandler, this);
  }

  // This function will be called on each time when order changed
  calcVolume = async (order: Order) => {
    if (order.status === 'closed' && order.reduceOnly !== true) {
      this.volume += order.amount; // volume in base currency
      this.volumeUsd += order.amount * order.price; // volume in USDT
    }
  };

  customEventHandler = () => {
    // ...
  }
}

const tradeVolume = new TradeVolume();

// unsubscribes from all listeners (calcVolume anda customEventHndler).
tradeVolume.unsubscribe();
```

| Method        | Description                               |
|---------------|-------------------------------------------|
| `unsubscribe` | Removes all event listeners on an object. |
