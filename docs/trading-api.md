# Trading API
___

This section documents the functions related to trading operations. These functions enable the retrieval and manipulation of trading data, including positions, orders, balances, and historical data.

* **Methods**
  - [getPositions](#getPositions)
  - [getBalance](#getbalance)
  - [getOrders](#getOrders)
  - [getOpenOrders](#getOpenOrders)
  - [getClosedOrders](#getClosedOrders)
  - [getOrder](#getOrder)
  - [getProfit](#getProfit)
  - [createOrder](#createOrder)
  - [cancelOrder](#cancelOrder)
  - [modifyOrder](#modifyOrder)

* **Interfaces**
  - [Position](#position)
  - [Balance](#balance)
  - [Order](#order)
  - [Trade](#trade)
  - [Fee](#fee)
  - [OrderType](#ordertype)
  - [OrderSide](#orderside)



## Methods

### [getPositions](#getPositions)

Returns an array of positions for the current script.

```typescript
 getPositions(): Promise<Position[]>
```

* **Returns:** _Promise<Array<[Position](#position)>>_.

___



### [getBalance](#getBalance)

Returns the balance for the current script, including total, used, and free balances.

```typescript
getBalance(): Promise<Balance>
```

* **Returns:** _Promise<[Balance](#balance)>_.

###### Example
```typescript
    const balance = await getBalance();
    console.log(balance.free) // log free balance
```

<br>


### [getOrders](#getOrders)
Returns an array of orders for a specified symbol.

```typescript
getOrders(symbol: string, since: number, limit = 500): Promise<Order[]>
```

* **Parameters**
  - `symbol`: \<_string_> - Trading symbol name.
  - `since`: \<_number_> - Start time for the orders (timestamp).
  - `limit`: \<_number_> - Number of orders to return.


* **Returns:** _Promise<Array<[Order](#order)>>_.

###### Example
```typescript
    const orders = await getOrders('ETH/USDT', 1703073753618, 100);
```

<br>

### [getOrder](#getOrder)

Returns an order by its ID for a specified symbol.

```typescript
getOrder(id: string, symbol: string): Promise<Order>
```

* **Parameters**
  - `id`: \<_string_> - Order id.
  - `symbol`: \<_string_> - Trading symbol name.


* **Returns:** _Promise<[Order](#order)>_.

<br>

### [getProfit](#getProfit)

Returns the profit for all closed positions for the current script. Only applicable for testing environments.

```typescript
getProfit(): Promise<number>
```

* **Returns:** _Promise<number>_.

<br>

### [createOrder](#createOrder)

Creates an order and returns an order object or an error message.

> **Important**: Stop Loss or Take Profit order must be canceled if one of them is executed.  
>> Use the [createOrder](exchange.md#createOrder) method of the [Exchange](exchange.md) class to automate this process.

```typescript
createOrder(symbol: string, type: OrderType, side: OrderSide, amount: number, price: number, params: Record<string, unknown>): Promise<Order>
```

* **Parameters**
  - `symbol`: \<_string_> - Trading symbol name.
  - `type`: \<_[OrderType](#orderType)_> - Order type.
  - `side`: \<_[OrderSide](#orderSide)_> - Order side.
  - `amount`: \<_number_> - Order amount (quantity) in base currency (BTC/USDT - amount in BTC, ETH/USDT - amount in ETH).
  - `price`: \<_number_> - Order price (for limit order).
  - `params`: \<_object_> - Additional params.


* **Returns:** _Promise<[Order](#order)>_.


###### Example
```typescript
// create market order - execute immediately
const order = await createOrder('BTC/USDT', 'market', 'buy', 0.01, 10000);

//create stop loss order
const sl = await createOrder('BTC/USDT', 'market', 'sell', 0.01, 9000, { stopLossPrice: 9000, reduceOnly: true });

//create take profit order
const tp = await createOrder('BTC/USDT', 'market', 'sell', 0.01, 11000, { takeProfitPrice: 11000, reduceOnly: true });
```

___

<br>

### [cancelOrder](#cancelOrder)

Cancels an order and returns the order object or an error message.

```typescript
cancelOrder(id: string, symbol: string): Promise<Order>
```

* **Parameters**
  - `id`: \<_string_> - Order id.
  - `symbol`: \<_string_> - Trading symbol name.


* **Returns:** _Promise<[Order](#order)>_.

___

<br>


### [modifyOrder](#modifyOrder)

Modifies an existing order and returns the updated order object or an error message.

```typescript
modifyOrder(id: string, symbol: string, type: OrderType, side: OrderSide, amount: number, price: number, params?: Record<string, unknown>): Promise<Order>
```

* **Parameters**
  - `id`: \<_string_> - Order id.
  - `symbol`: \<_string_> - Trading symbol name.
  - `type`: \<_[OrderType](#orderType)_> - Order type.
  - `side`: \<_[OrderSide](#orderSide)_> - Order side.
  - `amount`: \<_number_> - Order amount (quantity) in base currency (BTC/USDT - amount in BTC, ETH/USDT - amount in ETH).
  - `price`: \<_number_> - Order price (for limit order).
  - `params`: \<_object_> - Additional params.


* **Returns:** _Promise<[Order](#order)>_.

___

<br>

## Interfaces

### [Position](#position)

```typescript
interface Position {
  id?: string;
  symbol?: string;
  contracts?: number; // amount base currency (contracts)
  contractSize?: number;
  unrealizedPnl?: number;
  leverage?: number;
  liquidationPrice?: number;
  collateral?: number; // amount quote currency (collateral)
  notional?: number;
  markPrice?: number;
  entryPrice?: number;
  timestamp?: number; // unix timestamp milliseconds
  initialMargin?: number;
  initialMarginPercentage?: number;
  maintenanceMargin?: number;
  maintenanceMarginPercentage?: number;
  marginRatio?: number;
  datetime?: string;
  marginMode?: 'cross' | 'isolated';
  marginType?: 'cross';
  side?: 'short' | 'long' | string;
  hedged?: boolean;
  percentage?: number;
}
```
<br>

### [Balance](#balance)

```typescript
interface Balance {
  total: { 
    USDT: number;
    [currency: string]: number;
  } 
  used: { 
    USDT: number;
    [currency: string]: number;
  }
  free: { 
    USDT: number;
    [currency: string]: number;
  }
}
```
<br>

### [Order](#order)

```typescript
interface Order {
  id: string;
  clientOrderId: string;
  datetime: string;
  timestamp: number;
  lastTradeTimestamp: number;
  lastUpdateTimestamp?: number;
  status: 'open' | 'closed' | 'canceled' | string;
  symbol: string;
  type: string;
  timeInForce?: string;
  side: 'buy' | 'sell' | string;
  price: number;
  average?: number;
  amount: number;
  filled: number;
  remaining: number;
  stopPrice?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  cost: number;
  trades: Trade[];
  fee: Fee;
  info: any;
}
```
<br>

### [Trade](#trade)

```typescript
interface Trade {
  amount: number;
  datetime: string;
  id: string;
  info: any;
  order?: string;
  price: number;
  timestamp: number;
  type?: string;
  side: 'buy' | 'sell' | string;
  symbol: string;
  takerOrMaker: 'taker' | 'maker' | string;
  cost: number;
  fee: Fee;
}
```
<br>

### [Fee](#fee)

```typescript
interface Fee {
  type?: 'taker' | 'maker' | string;
  currency: string;
  rate?: number;
  cost: number;
}
```
<br>

### [OrderType](#orderType)

```typescript
type OrderType = 'market' | 'limit';
```
<br>

### [OrderSide](#orderSide)

```typescript
type OrderSide = 'buy' | 'sell';
```
<br>
