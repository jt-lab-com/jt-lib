# OrdersBasket
___

OrdersBasket class for working with orders on exchange. In this class realized next features:
  * Triggered orders
  * Automate cancel stop orders if one of them executed

___

* **Methods**
  - [createOrder](#createOrder)
  - [createTriggeredOrder](#createTriggeredOrder)
  - [createReduceOrder](#createReduceOrder)
  - [createStopLossOrder](#createStopLossOrder)
  - [createTakeProfitOrder](#createTakeProfitOrder)
  - [cancelOrder](#cancelOrder)
  - [modifyOrder](#modifyOrder)
  - [buyMarket](#buyMarket)
  - [sellMarket](#sellMarket)
  - [buyLimit](#buyLimit)
  - [sellLimit](#sellLimit)
  - [getContractsAmount](#getContractsAmount)
  - [getUsdAmount](#getUsdAmount)
  - [ask](#ask)
  - [askVolume](#askVolume)
  - [bid](#bid)
  - [bidVolume](#bidVolume)
  - [high](#high)
  - [low](#low)
  - [open](#open)
  - [close](#close)
  - [volume](#volume)
  - [unsubscribe](#unsubscribe)

<br>

## [Constructor](#Constructor)

```typescript
const ordersBasket = new OrdersBasket({ symbol: 'ETH/USDT', exchange: 'binance', hedgeMode: true })
```

* **Parameters**
  - `exchange`: \<_string_> - Exchange on which trading will take place.
  - `hedgeMode?`: \<_boolean_> - Determines whether the mode of opening a position in both directions is enabled on the exchange.
  - `prefix?`: \<_string_> - The prefix is used to generate the clientOrderId. Scripts with the market launch type will only receive orders created with this prefix.
  - `triggerType?`: \<_string_> - This parameter is responsible for the method of creating stop orders. If you set the type to `script`, then the Exchange class will be responsible for creating and controlling execution. If you set `exchange`, then when the main order is executed, stop orders will be created directly on the exchange. The default is `script`.
  - `leverage?`: <_number_> - Exchange leverage
___

<br>

## [createOrder](#createOrder)

Create order on exchange.

```typescript
createOrder(type: OrderType, side: OrderSide, amount: number, price: number, params?: Record<string, unknown>): Promise<Order>
```

* **Parameters**
  - `type`: \<_[OrderType](trading-api.md#OrderType)_> - `market` or `limit`.
  - `side`: \<_[OrderSide](trading-api.md#OrderSide)_> - `buy` or `sell`.
  - `amount`: \<_number_> - Order amount.
  - `price`: \<_number_> - Order price.
  - `params?`: \<_Record<string, unknown>_> - Params for [createOrder](trading-api.md#createOrder) function.


* **Returns:** _Promise<[Order](trading-api.md#order)>_.


###### Example
```typescript
const ordersBasket = new OrdersBasket({ symbol: 'ETH/USDT', exchange: 'binance', hedgeMode: true });
const order = await ordersBasket.createOrder('market', 'buy', 0.5, 2200);
```

___

<br>

## [createTriggeredOrder](#createTriggeredOrder)

Creates a trigger order (market or limit) that is sent to the exchange when the price reaches the specified trigger price. 

> Note:
This function uses our own library for working with trigger orders.
It is important to note that these **orders are not placed directly into the exchange's order book**. 
Instead, they are **stored locally** and are activated only when the market price reaches the specified trigger price. 
Once activated, the corresponding order (market or limit) is sent to the exchange for execution.

```typescript
createTriggerOrder(type: OrderType, side: OrderSide, amount: number, triggerPrice: number, params: Record<string, unknown>): Promise<Order>
```

* **Parameters**
  - `type`: \<_[OrderType](trading-api.md#OrderType)_> - `market` or `limit`.
  - `side`: \<_[OrderSide](trading-api.md#OrderSide)_> - `buy` or `sell`.
  - `amount`: \<_number_> - Order amount.
  - `price`: \<_number_> - Order price (used only for limit orders).
  - `triggerPrice`: \<_number_> - Trigger price.
  - `params?`: \<_Record<string, unknown>_> - Params for [createOrder](trading-api.md#createOrder) function.


* **Returns:** _Promise<[Order](trading-api.md#order)>_.

###### Example
```typescript
const ordersBasket = new OrdersBasket({ symbol: 'ETH/USDT', exchange: 'binance', hedgeMode: true });
const triggeredOrder = await ordersBasket.createTriggeredOrder('market', 'buy', 0.5, 2200, 2200);
```

___

<br>

## [createReduceOrder](#createReduceOrder)

Create reduce only order (close position).

```typescript
createReduceOrder(type: OrderType, sideToClose: OrderSide, amount: number, price: number, params?: Record<string, unknown>): Promise<Order>
```

* **Parameters**
  - `type`: \<_[OrderType](trading-api.md#OrderType)_> - `market` or `limit`.
  - `sideToClose`: \<_[OrderSide](trading-api.md#OrderSide)_> - `buy` or `sell`.
  - `amount`: \<_number_> - Order amount.
  - `price`: \<_number_> - Order price.
  - `params?`: \<_Record<string, unknown>_> - Params for [createOrder](trading-api.md#createOrder) function.


* **Returns:** _Promise<[Order](trading-api.md#order)>_.

###### Example
```typescript
const ordersBasket = new OrdersBasket({ symbol: 'ETH/USDT', exchange: 'binance', hedgeMode: true });
const reduceOrder = await ordersBasket.createReduceOrder('market', 'buy', 0.5, 2200);
```

___

<br>

## [createStopLossOrder](#createStopLossOrder)

Create stop loss order (close position).
> Note: Stop loss order could be only `market` type

```typescript
createStopLossOrder(sideToClose: OrderSide, amount: number, stopLossPrice: number, params?: Record<string, unknown>): Promise<Order>
```

* **Parameters**
  - `sideToClose`: \<_[OrderSide](trading-api.md#OrderSide)_> - `buy` or `sell` - side of order to close. If you want to close buy order, you need pass 'buy' to this param so stop loss order will be sell order.
  - `amount`: \<_number_> - Order amount.
  - `stopLossPrice`: \<_number_> - Trigger price (stop loss price).
  - `params?`: \<_Record<string, unknown>_> - Params for [createOrder](trading-api.md#createOrder) function.


* **Returns:** _Promise<[Order](trading-api.md#order)>_.

###### Example
```typescript
const ordersBasket = new OrdersBasket({ symbol: 'ETH/USDT', exchange: 'binance', hedgeMode: true });
const slOrder = await ordersBasket.createStopLossOrder('market', 'sell', 0.5, 2200);
```

___

<br>

## [createTakeProfitOrder](#createTakeProfitOrder)

Create take profit order (close position).
> Note: Take profit order could be only `market` type

```typescript
createTakeProfitOrder(sideToClose: OrderSide, amount: number, takeProfitPrice: number, params?: Record<string, unknown>): Promise<Order>
``` 

* **Parameters**
  - `sideToClose`: \<_[OrderSide](trading-api.md#OrderSide)_> - `buy` or `sell` - side of order to close. If you want to close buy order, you need pass 'buy' to this param so stop loss order will be sell order.
  - `amount`: \<_number_> - Order amount.
  - `takeProfitPrice`: \<_number_> - Trigger price (take profit price).
  - `params?`: \<_Record<string, unknown>_> - Params for [createOrder](trading-api.md#createOrder) function.


* **Returns:** _Promise<[Order](trading-api.md#order)>_.

###### Example
```typescript
const ordersBasket = new OrdersBasket({ symbol: 'ETH/USDT', exchange: 'binance', hedgeMode: true });
const slOrder = await ordersBasket.createTakeProfitOrder('market', 'sell', 0.5, 2200);
```

___

<br>

## [cancelOrder](#cancelOrder)

Cancel order by id

```typescript
cancelOrder(orderId: string): Promise<Order>
```

* **Parameters**
  - `orderId`: \<_string_> - Order id.


* **Returns:** _Promise<[Order](trading-api.md#order)>_.

###### Example
```typescript
const ordersBasket = new OrdersBasket({ symbol: 'ETH/USDT', exchange: 'binance', hedgeMode: true });
const order = await ordersBasket.createOrder('limit', 'buy', 0.5, 2200);
// ...

await ordersBasket.cancelOrder(order.id);
```

___

<br>

## [modifyOrder](#modifyOrder)

Modify order by id (change price, amount).

```typescript
modifyOrder(orderId: string, type: OrderType, side: OrderSide, amount: number, price: number): Promise<Order>
```

* **Parameters**
  - `orderId`: \<_string_> - Order id.
  - `type`: \<_[OrderType](trading-api.md#OrderType)_> - `market` or `limit`.
  - `side`: \<_[OrderSide](trading-api.md#OrderSide)_> - `buy` or `sell`.
  - `amount`: \<_number_> - Order amount.
  - `price`: \<_number_> - Order price.


* **Returns:** _Promise<[Order](trading-api.md#order)>_.

###### Example
```typescript
const ordersBasket = new OrdersBasket({ symbol: 'ETH/USDT', exchange: 'binance', hedgeMode: true });
const order = await ordersBasket.createOrder('ETH/USDT', 'market', 'buy', 0.5, 2200);
// ..

const modifiedOrder = await ordersBasket.modifyOrder(order.id, 'buy', 1, 2200);
```

___

<br>

## [buyMarket](#buyMarket)

Create market buy order.

```typescript
buyMarket(amount: number, sl?: number, tp?: number, params?: Record<string, unknown>): Promise<Order>
```

* **Parameters**
  - `amount`: \<_number_> - Order amount.
  - `sl?`: \<_number_> - Stop loss price. If `sl = 0`, stop loss order will not be created.
  - `tp?`: \<_number_> - Take profit price. If `tp = 0`, take profit order will not be created.
  - `params?`: \<_Record<string, unknown>_> - Params for [createOrder](trading-api.md#createOrder) function.


* **Returns:** _Promise<[Order](trading-api.md#order)>_.

###### Example
```typescript
const ordersBasket = new OrdersBasket({ symbol: 'ETH/USDT', exchange: 'binance', hedgeMode: true });
const order = await ordersBasket.buyMarket(1, 2150, 2200);
```

___

<br>

## [sellMarket](#sellMarket)

Create market sell order.

```typescript
sellMarket(amount: number, sl: number, tp: number, params?: Record<string, unknown>): Promise<Order>
```

* **Parameters**
  - `amount`: \<_number_> - Order amount.
  - `sl?`: \<_number_> - Stop loss price. If `sl = 0`, stop loss order will not be created.
  - `tp?`: \<_number>_ - Take profit price. If `tp = 0`, take profit order will not be created.
  - `params?`: \<_Record<string, unknown>_> - Params for [createOrder](trading-api.md#createOrder) function.


* **Returns:** _Promise<[Order](trading-api.md#order)>_.

###### Example
```typescript
const ordersBasket = new OrdersBasket({ symbol: 'ETH/USDT', exchange: 'binance', hedgeMode: true });
const order = await ordersBasket.sellMarket(1, 2200, 2150);
```

___

<br>

## [buyLimit](#buyLimit)

Create limit buy order.

```typescript
butLimit(amount: number, limitPrice: number, sl?: number, tp?: number, params?: Record<string, unknown>): Promise<Order>
```

* **Parameters**
  - `amount`: \<_number_> - Order amount.
  - `limitPrice`: \<_number_> - Order execution price.
  - `sl?`: \<_number_> - Stop loss price. If `sl = 0`, stop loss order will not be created.
  - `tp?`: \<_number_> - Take profit price. If `tp = 0`, take profit order will not be created.
  - `params?`: \<_Record<string, unknown>_> - Params for [createOrder](trading-api.md#createOrder) function.


* **Returns:** _Promise<[Order](trading-api.md#order)>_.

###### Example
```typescript
const ordersBasket = new OrdersBasket({ symbol: 'ETH/USDT', exchange: 'binance', hedgeMode: true });
const order = await ordersBasket.buyLimit(1, 2200, 2150, 2300);
```

___

<br>

## [sellLimit](#sellLimit)

Create limit sell order.

```typescript
sellLimit(amount: number, limitPrice: number, sl?: number, tp?: number, params?: Record<string, unknown>): Promise<Order>
```

* **Parameters**
  - `amount`: \<_number_> - Order amount.
  - `limitPrice`: \<_number_> - Order execution price.
  - `sl?`: \<_number_> - Stop loss price. If `sl = 0`, stop loss order will not be created.
  - `tp?`: \<_number_> - Take profit price. If `tp = 0`, take profit order will not be created.
  - `params?`: \<_Record<string, unknown>_> - Params for [createOrder](trading-api.md#createOrder) function.


* **Returns:** _Promise<[Order](trading-api.md#order)>_.

###### Example
```typescript
const ordersBasket = new OrdersBasket({ symbol: 'ETH/USDT', exchange: 'binance', hedgeMode: true });
const order = await ordersBasket.sellLimit(1, 2200, 2300, 2150);
```

___

<br>

## [getContractsAmount](#getContractsAmount)

Converts a currency into the number of available contracts for purchase.

```typescript
getContractsAmount(usdAmount: number, executionPrice?: number): number
```

* **Parameters**
  - `usdAmount`: \<_number_> - USD amount.
  - `executionPrice?`: \<_number_> - Order execution price. If not specified, the current price will be used.


* **Returns:** _number_.

###### Example
```typescript
const ordersBasket = new OrdersBasket({ symbol: 'ETH/USDT', exchange: 'binance', hedgeMode: true });
const amount = ordersBasket.getContractsAmount(10, 2200);

await ordersBasket.buyMarket(amount);
```

___

<br>

## [getUsdAmount](#getUsdAmount)

Converts number of contracts to currency.

```typescript
getUsdAmount(contractsAmount: number, executionPrice?: number): number
```

* **Parameters**
  - `contractsAmount`: \<_number_> - USD amount.
  - `executionPrice?`: \<_number_> - Order execution price. If not specified, the current price will be used.


* **Returns:** _number_.

###### Example
```typescript
const ordersBasket = new OrdersBasket({ symbol: 'ETH/USDT', exchange: 'binance', hedgeMode: true });
const usdSize = ordersBasket.getUsdAmount(10);
```

___

<br>

## [ask](#ask)

Offer (purchase) price.

```typescript
ask(): number
```


* **Returns:** _number_.

___

<br>

## [askVolume](#askVolume)

Ask volume.

```typescript
askVolume(): number
```


* **Returns:** _number_.

___

<br>

## [bid](#bid)

Bid (sale) price.

```typescript
bid(): number
```


* **Returns:** _number_.

___

<br>

## [bidVolume](#bidVolume)

Bid volume.

```typescript
bidVolume(): number
```


* **Returns:** _number_.

___

<br>

## [high](#high)

Highest price of the current candle. In real trading, returns the highest price in the last 24 hours.

```typescript
high(): number
```


* **Returns:** _number_.

___

<br>

## [low](#low)

Lowest price of the current candle. In real trading, returns the lowest price in the last 24 hours.

```typescript
low(): number
```


* **Returns:** _number_.

___

<br>

## [open](#open)

Opening price of the current candle. In real trading, returns the price that was 24 hours ago.

```typescript
open(): number
```


* **Returns:** _number_.

___

<br>

## [close](#close)

Returns the current price.

```typescript
close(): number
```


* **Returns:** _number_.

___

<br>

## [volume](#volume)

Number of transactions concluded on the asset. In real trading, returns the trading volume for the last 24 hours.

```typescript
volume(): number
```


* **Returns:** _number_.

___

<br>

## [unsubscribe](#unsubscribe)

When this method is called, the OrdersBasket instance unsubscribes from global events and cancels all price triggers.

```typescript
unsubscribe(): void
```

___

<br>
















