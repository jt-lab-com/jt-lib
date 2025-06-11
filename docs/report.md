# Report
___

Report - provide functionality for create report of trading strategy. Report can be viewed in web interface.

> Note: For tester report should be updated in OnStop() function when script is finished.
>> For real trading report could be updated by time interval. But it is not recommended to update report too often. Default interval: 5 sec.

* **Available Widgets**
  - `Cards` - show value of some variable.
  - `Tables` - show data in table.
  - `Charts` - show chart.
  - `TradingView` - show [TradingView](https://www.tradingview.com/) chart with indicators and shapes.


* **Methods**
  - [setDescription](#setDescription)
  - [optimizedSetValue](#optimizedSetValue)
  - [cardSetValue](#cardSetValue)
  - [tableUpdate](#tableUpdate)
  - [chartAddPointAgg](#chartAddPointAgg)
  - [tvChartAddOrders](#tvChartAddOrders)
  - [tvChartAddShape](#tvChartAddShape)
  - [tvChartAddIndicator](#tvChartAddIndicator)
  - [tvChartAddOscillator](#tvChartAddOscillator)
  - [updateReport](#updateReport)


* **Interfaces**
  - [ReportData](#reportData)
  - [ReportBlock](#ReportBlock)
  - [ReportBlockType](#ReportBlockType)
  - [ReportBlockData](#ReportBlockData)
  - [AggType](#aggType)
  - [Shape](#tradingViewShapes)
  - [Shape params](#addShapeParams)
  - [Indicator data](#bufferIndicatorItem)

___

<br>

## Methods

### [setDescription](#setDescription)

Set description for report.

```typescript
setDescription(description: string): void
```

* **Parameters**
    - `description`: \<_string_> - Description for report. Displayed in web interface.


* **Returns:** _void_.

___

<br>

### [optimizedSetValue](#optimizedSetValue)

Add value to optimization table in report. This used only for optimization.

> Note: Only for [Tester](tester.md)

```typescript
optimizedSetValue(name: string, value: number | string, aggType?: AggType): void
```

* **Parameters**
    - `name`: \<_string_> - Optimization parameter name.
    - `value`: \<_number | string_> - Value of parameter.
    - `aggType`: \<_[AggType](#aggType)_> - Aggregation type. Default: `last`.


* **Returns:** _void_.

###### Example
```typescript
// after optimization you will see table with results 2 columns: Max Profit and Max Drawdown and Profit
// and values for each optimization iteration.
onTick() {
  global.report.optimizedSetValue('Max Profit', getProfit(), 'max');
  global.report.optimizedSetValue('Max Drawdown', getCurrentUnrealizedPnl(), 'min');
}

onStop() {
  global.report.optimizedSetValue('Profit', getProfit());
  global.report.updateReport();
}
```

___

<br>

### [cardSetValue](#cardSetValue)

Add card with value to report.

```typescript
cardSetValue(cardName: string, value: number | string, aggType?: AggType): void
```

* **Parameters**
    - `cardName`: \<_string_> - Name of card.
    - `value`: \<_string | number_> - Value of card. If value with the same `cardName` passed several times, then aggregation will be applied.
    - `aggType`: \<_[AggType](#aggType)_> - Aggregation type. Default: `last`.


* **Returns:** _void_.

###### Example
```typescript
report.cardSetValue('profit', 100, 'sum');
report.cardSetValue('profit', 200, 'sum'); //profit card will be 300
```

___

<br>

### [tableUpdate](#tableUpdate)

Add or update row in table widget in report.

> Max rows specified in `report-table.ts`. Default: 100.

```typescript
tableUpdate(tableName: string, data: TableRow[] | TableRow, idField?: string): void
```

* **Parameters**
    - `tableName`: \<_string_> - Name of table widget.
    - `data`: \<_Array<[TableRow](#TableRow)>_> - Data to insert or update by `idField`. Format: `[{ id: 1, name: 'test' }, { id: 2, name: 'test2' }]`
    - `idField?`: \<_string_> - Field name to use as id. Default: `id`.


* **Returns:** _void_.

###### Example
```typescript
report.tableUpdate('ExampleTable', [{ id: 1, name: 'test' }, { id: 2, name: 'test2' }]);
report.tableUpdate('ExampleTable', { id: 1, name: 'test' }, 'id'); // update row with id=1
report.tableUpdate('ExampleTable', { id: 3, name: 'test3' }, 'id'); // insert row with id=3

// Orders table example
report.tableUpdate('Orders', await getOrders());

//Positions table example
report.tableUpdate('Positions', await getPositions());
```

___

<br>

### [chartAddPointAgg](#chartAddPointAgg)

Add point to chart widget in report. If chart with chartName not exists, then it will be created.

> Max points specified `report-chart.ts`. Default: 5000.

```typescript
chartAddPointAgg(chartName: string, lineName: string, pointValue: number, aggType?: AggType): void
```

* **Parameters**
    - `chartName`: \<_string_> - Name of chart widget.
    - `lineName`: \<_string_> - Name of line in chart.
    - `pointValue`: \<_number_> - Value of point. By default, points aggregated every day (see `AGG_PERIOD` in `report-chart.ts`).
    - `aggType?`: \<_[AggType](#aggType)_> - Aggregation type. Default: `last`.


* **Returns:** _void_.

###### Example
```typescript
// To show price you need add point every tick or every time interval
onTick() {
  // Price chart
  // on the chart you will see 2 lines: Price and Avg price
  report.chartAddPoint('Price chart', 'Price', close()); //add point to chart every tick
  report.chartAddPointAgg('Price chart', 'Avg price', close(),'avg'); // average price in a Day, technically it will be SMA by 1440 period for 1m timeframe
}


onOrderChange(order: Order) {
  if(order.status === 'closed' && order.reduceOnly === true) {
    // Profit chart 
    // you need add point every time you get profit
    report.chartAddPointAgg('Profit chart', 'Profit', getProfit(), 'last'); // only for tester
    //for real trading you need to calculate profit from orders and position info
  }
}
```

___

<br>

### [tvChartAddOrders](#tvChartAddOrders)

Add shape (arrow by default) to TradingView chart widget for each order.

```typescript
tvChartAddOrders(orders: Order[], timeframe?: number): void
```

* **Parameters**
    - `orders`: \<_Array<[Order](trading-api.md#order)>_> - Array of orders.
    - `timeframe`: \<_number_> - Timeframe of chart in minutes. Default: 240 (4h).


* **Returns:** _void_.

___

<br>

### [tvChartAddShape](#tvChartAddShape)

Add shape to TradingView chart widget.

```typescript
tvChartAddShape(shape: TradingViewShapes, shapeParams: AddShapeParams, props?: Record<string, any>, timeframe?: number): void
```

* **Parameters**
    - `shape`: \<_[Shape](#tradingViewShapes)_> - Shape type.
    - `shapeParams`: \<[AddShapeParams](#addShapeParams)_> - Shape params.
    - `props?`: \<_Record<string, any>_> - Additional properties they will be added to table.
    - `timeframe?`: \<_number_> - Timeframe of chart in minutes. Default: 240 (4h).


* **Returns:** _void_.

___

<br>

### [tvChartAddIndicator](#tvChartAddIndicator)

Add shape to TradingView chart widget.

```typescript
tvChartAddIndicator(indicatorName: string, description: string, data: BufferIndicatorItem[]): void
```

* **Parameters**
    - `indicatorName`: \<_string_> - Indicator name.
    - `description`: \<_string_> - Description text.
    - `data?`: \<_Array<[BufferIndicatorItem](#bufferIndicatorItem)>_> - Array of indicator data.


* **Returns:** _void_.

___

<br>

### [tvChartAddOscillator](#tvChartAddOscillator)

Add shape to TradingView chart widget.

```typescript
tvChartAddOscillator(oscillatorName: string, description: string, data: BufferIndicatorItem[]): void
```

* **Parameters**
    - `oscillatorName`: \<_string_> - Oscillator name.
    - `description`: \<_string_> - Description text.
    - `data?`: \<_Array<[BufferIndicatorItem](#bufferIndicatorItem)>_> - Array of oscillator data.


* **Returns:** _void_.

___

<br>

### [updateReport](#updateReport)

Updated report data on server. All logs will be added to report by default.

```typescript
updateReport(): void
```


* **Returns:** _void_.

___

<br>

## Interfaces

### [ReportData](#ReportData)

```typescript
interface ReportData {
  id: string;
  symbol: string;
  description?: string;
  blocks: ReportBlock[];
}
```

___

<br>

### [ReportBlock](#ReportBlock)

```typescript
interface ReportBlock {
  type: ReportBlockType;
  name?: string;
  data: ReportBlockData;
}
```

___

<br>

### [ReportBlockType](#ReportBlockType)

```typescript
type ReportBlockType = 'trading_view_chart' | 'table' | 'chart' | 'card' | 'optimizer_results';
```

___

<br>

### [ReportBlockData](#ReportBlockData)

```typescript
type ReportBlockData = TableRow[] | CardData | ChartData | TVChartData | Record<string, unknown>;
```

___

<br>

### [AggType](#AggType)

```typescript
type AggType = 'last' | 'min' | 'max' | 'sum' | 'avg';
```

___

<br>

### [TradingViewShapes](#TradingViewShapes)

```typescript
enum TradingViewShapes {
  ARROW_UP = 'arrow_up',
  ARROW_DOWN = 'arrow_down',
  FLAG = 'flag',
  VERTICAL_LINE = 'vertical_line',
  HORIZONTAL_LINE = 'horizontal_line',
  ICON = 'icon',
  EMOJI = 'emoji',
  STICKER = 'sticker',
  ANCHORED_TEXT = 'anchored_text',
  ANCHORED_NOTE = 'anchored_note',
}
```

___

<br>

### [AddShapeParams](#AddShapeParams)

```typescript
interface AddShapeParams {
  coords?: ShapeCoords;
  color?: string;
  text?: string;
  props?: Record<string, string | number | boolean>;
}
```

___

<br>

### [ShapeCoords](#ShapeCoords)

```typescript
interface ShapeCoords {
  price: number;
  time: number;
}
```

___

<br>

### [BufferIndicatorItem](#BufferIndicatorItem)

```typescript
interface BufferIndicatorItem {
  timestamp: number;
  value: number;
}
```



