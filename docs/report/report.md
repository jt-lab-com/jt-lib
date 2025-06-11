# Report
___

Report - provide functionality for create report of trading strategy. Report can be viewed in web interface.

> Note: For tester report should be updated in onStop() function when script is finished.
>> For real trading report could be updated by time interval. But it is not recommended to update report too often. Default interval: 5 sec.

* **Available Widgets**
  - `Text` - text blocks in report layout.
  - `Card` - card widget.
  - `Table` - show data in table.
  - `Chart` - show chart.
  - `ActionButton` - sends the action to the running runtime. Used only for real-time trading robots.


* **Methods**
  - [setTitle](#setTitle)
  - [setDescription](#setDescription)
  - [optimizedSetValue](#optimizedSetValue)
  - [createText](#createText)
  - [createCard](#createCard)
  - [createTable](#createTable)
  - [createChart](#createChart)
  - [createActionButton](#createActionButton)
  - [addText](#addText)
  - [addCard](#addCard)
  - [addTable](#addTable)
  - [addChart](#addChart)
  - [addActionButton](#addActionButton)
  - [getTextByName](#getTextByName)
  - [getCardByName](#getCardByName)
  - [getTableByName](#getTableByName)
  - [getChartByName](#getChartByName)
  - [getActionButtonByName](#getActionButtonByName)
  - [dropText](#dropText)
  - [dropCard](#dropCard)
  - [dropTable](#dropTable)
  - [dropChart](#dropChart)
  - [dropActionButton](#dropActionButton)
  - [cardSetValue](#cardSetValue)
  - [tableUpdate](#tableUpdate)
  - [chartAddPointAgg](#chartAddPointAgg)
  - [updateReport](#updateReport)


* **Interfaces**
  - [ReportData](#reportData)
  - [ReportBlock](#ReportBlock)
  - [ReportBlockType](#ReportBlockType)
  - [ReportBlockData](#ReportBlockData)
  - [CardOptions](#CardOptions)
  - [CardIcon](#CardIcon)
  - [AggType](#aggType)
  - [Shape](#tradingViewShapes)
  - [Shape params](#addShapeParams)
  - [Indicator data](#bufferIndicatorItem)

___

<br>

## Methods

### [setTitle](#setTitle)

Set report title.

```typescript
setTitle(title: string): void
```

* **Parameters**
  - `title`: \<_string_> - Report title. Displayed in web interface.


* **Returns:** _void_.

___

<br>

### [setDescription](#setDescription)

Set report description.

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

### [createText](#createText)

Create text widget.

```typescript
createText(textName: string, text: string, textOptions?: TextOptions): void
```

* **Parameters**
  - `textName`: \<_string_> - Name of the text. Used for further modification.
  - `text`: \<_string_> - The text that will be rendered in the report.
  - `textOptions`: \<_string_> - [Text options](report-text.md#TextOptions).


* **Returns:** _void_.

###### Example
```typescript
report.createText('important', 'some text', { variant: 'body1', align: 'center' })
```

___

<br>

### [createCard](#createCard)

Create card widget.

```typescript
createCard(cardName: string, params?: ReportCardParams): void
```

* **Parameters**
  - `cardName`: \<_string_> - Name of the card. Used for further modification.
  - `params?`: \<_[ReportCardParams](#reportCardParams)_> - [Card parameters](#reportCardParams).


* **Returns:** _void_.

###### Example
```typescript
report.createCard('profit', { title: 'Profit', variant: CardVariant.Number, options: { format: CardNumberFormat.Currency }})
```

___

<br>

### [createTable](#createTable)

Create table widget.

```typescript
createTable(tableName: string): void
```

* **Parameters**
  - `tableName`: \<_string_> - Name of the card. Used for further modification.


* **Returns:** _void_.

___

<br>

### [createChart](#createChart)

Create chart widget.

```typescript
createChart(chartName: string, options?: ReportChartOptions): void
```

* **Parameters**
  - `chartName`: \<_string_> - Name of the card. Used for further modification.
  - `options?`: \<_[ReportChartOptions](#reportChartOptions)_> - [Chart options](#reportChartOptions).


* **Returns:** _void_.

###### Example
```typescript
report.createChart('profit', { chartType: ChartType.Area, colors: ["#3F51B5", "#13D8AA", "#FD6A6A"] });
```

___

<br>

### [createActionButton](#createActionButton)

Create action button.

```typescript
createActionButton(title: string, action: string, payload: string | number | object): void
```

* **Parameters**
  - `title`: \<_string_> - button title.
  - `action`: \<_string_> - Action that will be sent to runtime.
  - `payload`: \<_string_ | _number_ | _object_> - Payload of action that will be sent to runtime.

* **Returns:** _void_.

###### Example
```typescript
report.createActionButton('Close Position', 'closePosition', 'BTC/USDT');
```

___

<br>

### [addText](#addText)

Adds a text widget to the report.

```typescript
addText(textName: string, text: ReportText): void
```

* **Parameters**
  - `textName`: \<_string_> - Name of the text widget. Used for further modification.
  - `text`: \<_[ReportText](#reportText)_> - [ReportText](#reportText) instance.

* **Returns:** _void_.

###### Example
```typescript
const textWidget = new ReportText('Important information', 'subtitle1', 'center');

report.addText('importantInfo', textWidget);
```

___

<br>

### [addCard](#addCard)

Adds a card widget to the report.

```typescript
addCard(cardName: string, card: ReportCard): void
```

* **Parameters**
  - `cardName`: \<_string_> - Name of the card widget. Used for further modification.
  - `card`: \<_[ReportCard](#reportCard)_> - [ReportCard](#reportCard) instance.

* **Returns:** _void_.

###### Example
```typescript
const cardWidget = new ReportCard({
  title: 'Profit',
  variant: CardVariant.Number,
  options: {
    format: CardNumberFormat.Currency
  }
});

report.addCard('profitCard', cardWidget);
```

___

<br>

### [addTable](#addTable)

Adds a table widget to the report.

```typescript
addTable(tableName: string, table: ReportTable): void
```

* **Parameters**
  - `tableName`: \<_string_> - Name of the table widget. Used for further modification.
  - `table`: \<_[ReportTable](#reportTable)_> - [ReportTable](#reportTable) instance.

* **Returns:** _void_.

###### Example
```typescript
const tableWidget = new ReportTable('Orders');

report.addTable('orders', tableWidget);
```

___

<br>

### [addChart](#addChart)

Adds a chart widget to the report.

```typescript
addChart(chartName: string, chart: ReportChart): void
```

* **Parameters**
  - `chartName`: \<_string_> - Name of the chart widget. Used for further modification.
  - `chart`: \<_[ReportChart](#ReportChart)_> - [ReportChart](#reportChart) instance.

* **Returns:** _void_.

###### Example
```typescript
const chartWidget = new ReportChart('Profit Chart', { chartType: ChartType.Line });

report.addChart('profitChart', chartWidget);
```

___

<br>

### [addActionButton](#addActionButton)

Adds a action button to the report.

```typescript
addActionButton(actionButtonName: string, actionButton: ReportActionButton): void
```

* **Parameters**
  - `actionButtonName`: \<_string_> - Name of the action button. Used for further modification.
  - `actionButton`: \<_[ReportActionButton](#reportActionButton)_> - [ReportActionButton](#reportActionButton) instance.

* **Returns:** _void_.

###### Example

```typescript
const actionButton = new ReportActionButton('Close Position', 'closePosition', 'BTC/USDT');

report.addActionButton('actionButton', actionButton);
```

___

<br>

### [getTextByName](#getTextByName)

Get text widget by name.

```typescript
getTextByName(name: string): ReportText | undefined
```

* **Parameters**
  - `name`: \<_string_> - Name of the text widget.

* **Returns:** _[ReportText](#ReportText)_ | _undefined_.

___

<br>

### [getCardByName](#getCardByName)

Get card widget by name.

```typescript
getCardByName(name: string): ReportCard | undefined
```

* **Parameters**
  - `name`: \<_string_> - Name of the card widget.

* **Returns:** _[ReportCard](#ReportCard)_ | _undefined_.

___

<br>

### [getCardByName](#getCardByName)

Get card widget by name.

```typescript
getCardByName(name: string): ReportCard | undefined
```

* **Parameters**
  - `name`: \<_string_> - Name of the card widget.

* **Returns:** _[ReportCard](#ReportCard)_ | _undefined_.

___

<br>

### [getTableByName](#getTableByName)

Get table widget by name.

```typescript
getTableByName(name: string): ReportTable | undefined
```

* **Parameters**
  - `name`: \<_string_> - Name of the table widget.

* **Returns:** _[ReportTable](#ReportTable)_ | _undefined_.

___

<br>

### [getChartByName](#getChartByName)

Get chart widget by name.

```typescript
getChartByName(name: string): ReportChart | undefined
```

* **Parameters**
  - `name`: \<_string_> - Name of the chart widget.

* **Returns:** _[ReportChart](#ReportChart)_ | _undefined_.

___

<br>

### [getActionButtonByName](#getActionButtonByName)

Get action button by name.

```typescript
getActionButtonByName(name: string): ReportActionButton | undefined
```

* **Parameters**
  - `name`: \<_string_> - Name of the action button.

* **Returns:** _[ReportActionButton](#ReportActionButton)_ | _undefined_.

___

<br>

### [dropText](#dropText)

Delete text widget from report.

```typescript
dropText(textName: string): void
```

* **Parameters**
  - `textName`: \<_string_> - Name of the text widget.

* **Returns:** _void_.

___

<br>

### [dropCard](#dropCard)

Delete card widget from report.

```typescript
dropCard(cardName: string): void
```

* **Parameters**
  - `cardName`: \<_string_> - Name of the card widget.

* **Returns:** _void_.

___

<br>

### [dropTable](#dropTable)

Delete table widget from report.

```typescript
dropTable(tableName: string): void
```

* **Parameters**
  - `tableName`: \<_string_> - Name of the table widget.

* **Returns:** _void_.

___

<br>

### [dropChart](#dropChart)

Delete chart widget from report.

```typescript
dropChart(chartName: string): void
```

* **Parameters**
  - `chartName`: \<_string_> - Name of the chart widget.

* **Returns:** _void_.

___

<br>

### [dropActionButton](#dropActionButton)

Delete action button from report.

```typescript
dropActionButton(c: string): void
```

* **Parameters**
  - `dropActionButton(action: string)`: \<_string_> - Name of the action button.

* **Returns:** _void_.

___

<br>

### [cardSetValue](#cardSetValue)

Add card with value to report.

```typescript
cardSetValue(cardName: string, value: number | string, aggType?: AggType, cardOptions?: CardOptions): void
```

* **Parameters**
    - `cardName`: \<_string_> - Name of card.
    - `value`: \<_string | number_> - Value of card. If value with the same `cardName` passed several times, then aggregation will be applied.
    - `aggType?`: \<_[AggType](#aggType)_> - Aggregation type. Default: `last`.
    - `cardOptions?`: \<_[CardOptions](#CardOptions)_> - Settings for visual display of the card. You can set formatting, currency, icon or caption.


* **Returns:** _void_.

###### Example

```typescript
report.cardSetValue('profit', 100, 'sum', { format: 'currency', currency: 'USD' });
report.cardSetValue('profit', 200, 'sum', { icon: CardIcon.ChartUp }); //profit card will be 300
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

### [CardOptions](#CardOptions)

```typescript
interface CardOptions {
  format?: CardFormat;
  currency?: string;
  icon?: CardIcon;
  caption?: string;
}
```

___

<br>

### [CardIcon](#CardIcon)

```typescript
enum CardIcon {
  ChartUp = 'chart-up',
  ChartDown = 'chart-down',
}
```

___

<br>




