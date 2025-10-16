import { StandardReportLayout } from '../lib/report/layouts/standart.report.layout';
import { BaseScript } from '../lib/script/base-script';
import { globals } from '../lib/core/globals';
import { SimpleMovingAverageIndicator } from '../lib/indicators';
import { trace } from '../lib/core/log';
import { AverageTrueRange } from '../lib/indicators/atr';
import { CandlesBuffer } from '../lib/candles';

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
    {
      key: 'sizeUsd',
      defaultValue: 5,
    },
  ];

  // Strategy configuration
  hedgeMode = true;  // Enable hedge mode for futures trading
  sizeUsd: number;   // Position size in USD

  // Technical indicators
  private sma14: SimpleMovingAverageIndicator;  // 200-period SMA
  private art14: AverageTrueRange;              // 14-period ATR
  
  // Report and data components
  private reportLayout: StandardReportLayout;
  private buffer: CandlesBuffer;                // Candles buffer for historical data

  constructor(params: GlobalARGS) {
    super(params);
  }

  async onInit() {
    // Initialize standard report layout
    this.reportLayout = new StandardReportLayout();

    // Create SMA indicator: 200-period on 1-hour timeframe
    this.sma14 = await globals.indicators.sma(this.symbols[0], '1h', 200);
    
    // Create ATR indicator: 14-period on 1-hour timeframe
    this.art14 = await globals.indicators.atr(this.symbols[0], '1h', 14);
    
    // Get candles buffer for historical data access
    this.buffer = await globals.candlesBufferService.getBuffer({ 
      symbol: this.symbols[0], 
      timeframe: '1h' 
    });

    // Log indicator information for debugging
    trace('Script:onInit', 'Indicator info', this.sma14.getInfo());
  }

  /**
   * Called on every price tick
   * Updates charts with current indicator values
   */
  async onTick(): Promise<void> {
    // Add SMA value to chart
    globals.report.chartAddPointAgg('SMA', 'sma14', this.sma14.getValue());
    
    // Add current price to chart
    globals.report.chartAddPointAgg('SMA', 'price', close());
    
    // Add ATR value to chart
    globals.report.chartAddPointAgg('ATR', 'atr14', this.art14.getValue());
  }

  /**
   * Called when script stops
   * Displays historical indicator data in tables
   */
  async onStop(): Promise<void> {
    await super.onStop();

    // Display ATR indicator values in table
    // (Candles buffer table is commented out to avoid clutter)
    // globals.report.tableUpdate('CandlesBuffer onStop', this.buffer.getCandles());
    globals.report.tableUpdate('atr14 onStop', this.art14.getIndicatorValues());
  }
}
