import { StandardReportLayout } from '../lib/report/layouts/standart.report.layout';
import { BaseScript } from '../lib/script/base-script';
import { globals } from '../lib/core/globals';
import { SimpleMovingAverageIndicator } from '../lib/indicators';
import { log, trace } from '../lib/core/log';
import { AverageTrueRange } from '../lib/indicators/atr';
import { CandlesBuffer } from '../lib/candles';
import { BaseIndicator } from '../lib/indicators/base-indicator';
import { timeCurrent } from '../lib/utils/date-time';

/*
Indicators Example

This example demonstrates how to use technical indicators in trading strategies.
It shows how to:
- Create and initialize indicators (SMA, ATR)
- Access indicator values in real-time
- Display indicator data in charts and tables
- Use candles buffer for historical data

Indicators used:
- SMA (Simple Moving Average): 200-period on 1-hour timeframe
- ATR (Average True Range): 14-period on 1-hour timeframe

The script displays indicator values in real-time charts and provides
historical data in tables when the script stops.
*/

class Script extends BaseScript {
  // Define script parameters with default values
  static definedArgs = [
    {
      key: 'symbols',
      defaultValue: 'XRP/USDT:USDT',
    },
  ];

  // Technical indicators
  private sma14: SimpleMovingAverageIndicator; // 200-period SMA
  private art14: AverageTrueRange; // 14-period ATR

  // Report and data components
  private reportLayout: StandardReportLayout;
  private buffer: CandlesBuffer; // Candles buffer for historical data
  private nextTime = 0;

  constructor(params: GlobalARGS) {
    super(params);
  }

  async onInit() {
    // Initialize standard report layout
    this.reportLayout = new StandardReportLayout({
      title: 'Indicators Example',
      description: `Exchange: ${this.connectionName}, marketType: ${this.marketType} Symbol: ${this.symbols[0]}`,
    });

    // Create SMA indicator: 25-period on 1m timeframe
    this.sma14 = await globals.indicators.sma(this.symbols[0], '1m', 25);
    globals.report.tableUpdate('sma14 onInit', this.sma14.getIndicatorValues());
    this.showChart('SMA', this.sma14, true);

    // Create ATR indicator: 14-period on 1m timeframe
    this.art14 = await globals.indicators.atr(this.symbols[0], '1m', 14);
    this.showChart('ATR', this.art14);

    //natr
    const natr14 = await globals.indicators.natr(this.symbols[0], '1m', 14);
    this.showChart('NATR', natr14);

    // Get candles buffer for historical data access
    this.buffer = await globals.candlesBufferService.getBuffer({
      symbol: this.symbols[0],
      timeframe: '1h',
    });

    // Log indicator information for debugging
    trace('Script:onInit', 'Indicator info', this.sma14.getInfo());
  }

  showChart(chartName, indicator: BaseIndicator, isAddPrice = false) {
    const len = indicator.length;
    trace('Script:showChart', `Adding ${len} points to chart ${chartName}`, {}, true);
    let candleBuff = indicator.getCandlesBuffer();
    for (let i = len - 1; i >= 0; i--) {
      const val = indicator.getValue(i);

      const time = indicator.getTimestamp(i);
      const name = indicator.constructor?.name ?? 'Indicator';

      // if (!val || !time) {
      //   debugger;
      // }
      globals.report.chartAddPointXY(chartName, name, time, val);
      if (isAddPrice) {
        globals.report.chartAddPointXY(chartName, 'Price', time, candleBuff.close(i));
      }
    }
  }

  iterator = 0;

  /**
   * Called when script stops
   * Displays historical indicator data in tables
   */
  async onStop(): Promise<void> {
    // Display ATR indicator values in table
    // (Candles buffer table is commented out to avoid clutter)
    // globals.report.tableUpdate('CandlesBuffer onStop', this.buffer.getCandles());
    globals.report.tableUpdate('atr14 onStop', this.art14.getIndicatorValues());
    log('Script:onStop', 'Indicators Example', {}, true);
  }
}
