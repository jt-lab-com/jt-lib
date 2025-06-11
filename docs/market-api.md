# Market API

This section documents the functions related to market data in a trading platform or financial data API. Each function is designed to provide specific market-related information, such as symbol information, price data, and trading fees.


* **Methods**
  - [symbolInfo](#symbolInfo)
  - [getHistory](#getHistory)
  - [tms](#tms)
  - [open](#open)
  - [high](#high)
  - [low](#low)
  - [close](#close)
  - [getFee](#getFee)
  - [ask](#ask)
  - [bid](#bid)


* **Interfaces**
  - [Symbol](#symbol)
  - [Candle](#candle)

---

<br>


## Methods

### [symbolInfo](#symbolInfo)

```typescript
symbolInfo(symbol: string): Promise<Symbol>
```

* **Parameters**
  - `symbol`: \<_string_> - The trading symbol (e.g., BTC/USDT for spot or BTC/USDT:USDT for futures).


* **Returns:** _Promise<[Symbol](#symbol)>_.

___

<br>

### [getHistory](#getHistory)

Returns an array of historical candle data.

```typescript
getHistory(timeframe: number, startTime: number, limit?: number): Promise<Candle[]>
```
* **Parameters**
  - `timeframe`: \<_number_> - Candle timeframe in minutes.
  - `startTime`: \<_number_> - Start time of the candles.
  - `limit`: \<_number_> - Number of candles to return.


* **Returns:** _Promise<Array<[Candle](#candle)>>_.

###### Example
```typescript
    const candles = await getHistory(1, 1703073753618, 100);
```

___

<br>

### [tms](#tms)

Returns the timestamp of the current candle.

```typescript
tms(): number
```

* **Returns:** _number_.

___

<br>

### [open](#open)

Returns the opening price of the current candle. In real trading, returns the price that was 24 hours ago.

```typescript
open(): number
```

* **Returns:** _number_.

___

<br>

### [high](#high)

Returns the highest price of the current candle. In real trading, returns the highest price in the last 24 hours.

```typescript
high(): number
```

* **Returns:** _number_.

___

<br>

### [low](#low)

Returns the volume of the current candle.

```typescript
low(): number
```

* **Returns:** _number_.

___

<br>

### [close](#close)

Returns the closing price of the current candle.

```typescript
close(): number
```

* **Returns:** _number_.

___

<br>

### [getFee](#getFee)

Returns the total fee for all executed orders in the current script. Applicable only in a testing environment.

```typescript
getFee(): number
```

* **Returns:** _number_.

___

<br>

### [ask](#ask)

Returns the ask price, which is the first price in the order book, for the current symbol.

```typescript
ask(): number
```

* **Returns:** _number_.

___

<br>

### [bid](#bid)

Returns the bid price, which is the first price in the order book, for the current symbol.

```typescript
bid(): number
```

* **Returns:** _number_.

___

<br>

## Interfaces

### [Symbol](#symbol)

```typescript
interface Symbol {
  symbol: string;
  settleId: string;
  precision: { amount: number; quote: number; price: number; base: number };
  settle: string;
  baseId: string;
  type: string;
  lowercaseId: string;
  quote: string;
  percentage: boolean;
  contractSize: number;
  id: string;
  taker: number;
  limits: {
    market: { min: number; max: number };
    leverage: { min: number; max: number };
    amount: { min: number; max: number };
    cost: { min: number; max: number };
    price: { min: number; max: number };
  };
  inverse: boolean;
  margin: boolean;
  linear: boolean;
  swap: boolean;
  contract: boolean;
  active: boolean;
  maker: number;
  quoteId: string;
  future: boolean;
  feeSide: string;
  spot: boolean;
  tierBased: boolean;
  base: string;
  option: boolean;
}
```
<br>

### [Candle](#candle)

```typescript
interface Candle {
  timestamp: number;
  high: number;
  low: number;
  open: number;
  close: number;
  volume: number;
}
```

<br>