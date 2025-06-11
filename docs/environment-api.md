# Environment API

This documentation provides details on the environment functions available in the script. These functions assist in various tasks such as managing artifacts, registering callbacks, handling tester environments, reporting, caching, and more.

* **Properties**
  - [ARGS](#args)


* **Methods**
  - [getArtifactsKey](#getArtifactsKey)
  - [isTester](#isTester)
  - [getErrorTrace](#getErrorTrace)
  - [updateReport](#updateReport)
  - [setCache](#setCache)
  - [getCache](#getCache)
  - [getPrefix](#getPrefix)
  - [registerCallback](#registerCallback)


* **Interfaces**
  - [GlobalARGS](#globalArgs)

___

<br>

## Properties

### [ARGS](#args)

```typescript
  ARGS: GlobalARGS
```

* [Global Arguments](#globalArgs) object

___

<br>

## Methods

### [getArtifactsKey](#getArtifactsKey)

Returns the artifact key for the current script, which is used to store report data in the artifacts storage.

```typescript
getArtifactsKey(): string
```

* **Returns:** _<_string_>_.

___

<br>

### [isTester](#isTester)

Checks if the current script is running in a tester environment.

```typescript
isTester(): boolean
```


* **Returns:** _<_boolean_>_.

___

<br>

### [getErrorTrace](#getErrorTrace)

Retrieves the error trace.

```typescript
getErrorTrace(stack: string): Promise<string>
```

* **Parameters**
  - `stack`: \<_string>_ - The stack trace as a string.


* **Returns:** _Promise<_string_>_.

___

<br>

### [updateReport](#updateReport)

Update report for current script. Max update frequency 1 time per second. Max report size 1MB

```typescript
updateReport(data: ReportData): Promise<void>
```

* **Parameters**
  - `data`: _\<[ReportData](report.md#ReportData)>_. - Report data


* **Returns:** _Promise<_void_>_.

___


<br>


### [setCache](#setCache)

Sets a value in the cache.

```typescript
setCache(key: string, value: any): Promise<void>
```

* **Parameters**
  - `key`: \<_string>_ - The key for the cache entry.
  - `value`: \<_string | number | boolean_> -  The value to be stored.


* **Returns:** _Promise<_void_>_.

___

<br>

### [getCache](#getCache)

Retrieves a value from the cache.

```typescript
getCache<T>(key: string): Promise<T>
```

* **Parameters**
  - `key`: \<_string_> - The key for the cache entry.


* **Returns:** _Promise<_T_>_.

___

<br>

### [getPrefix](#getPrefix)

Returns the prefix of the current script scenario. The prefix is used in the `clientOrderId` when creating orders.

```typescript
getPrefix(): string
```

* **Returns:** _string_.

___

<br>


### [registerCallback](#registerCallback)

Registers a callback for trading functions. This is only available in developer mode.

```typescript
registerCallback(funcName: string, callback: Function): void
```

* **Parameters**
  - `funcName`: \<_string_> - Name of the function (e.g.: `createOrder`, `cancelOrder`. See the full list at [Trading API](trading-api.md)).
  - `callback`: \<_Function_> The callback function, which must be asynchronous.

###### Example
```typescript
registerCallback('createOrder', (order: Order) => {
  // this callback will be called every time the createOrder function is called
  console.log(order) // log order 
})
```
___

<br>

## Interfaces

### [GlobalARGS](#globalArgs)

Global arguments that are available in the ARGS global variable. These arguments are also passed to the constructor of the base script (`Strategy`).

```typescript
type GlobalARGS = {
  startDate: Date;
  endDate: Date;
  symbol: string;
  timeframe: string;
} & Record<string, string | number | boolean>;
```
___



