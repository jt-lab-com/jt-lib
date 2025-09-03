/*
 Gainers & Loosers Example

  This script scans all available USDT-quoted perpetual swap markets
  and detects symbols with strong daily moves ("gainers" or "losers").

  How it works:
  - On initialization, collects all active linear USDT swap symbols.
  - Iterates through each symbol, loads ~180 daily candles,
    and calculates the percent difference between daily high and low.
  - If the move is greater than or equal to minPercent (default 30%),
    the symbol is recorded as a potential gainer/loser.

  Output:
  - All results are placed into a report table called **"Gainers And Losers"**.
  - This table can be viewed in the report dashboard and contains:
    • symbol name
    • how many days ago the move happened
    • gain/loss percentage
    • link to the trading chart

  Purpose:
  - To provide a quick overview of the most volatile swap symbols,
    directly accessible in the report.
*/

import { globals } from '../lib/core/globals';
import { error, log, trace } from '../lib/core/log';
import { timeCurrent, timeToString } from '../lib/utils/date-time';
import { getArgNumber } from '../lib/core/base';
import { BaseScript } from '../lib/script/base-script';
import { StandardReportLayout } from '../lib/report/layouts/standart.report.layout';
import { BaseError } from '../lib/core/errors';
import { percentDifference } from '../lib/utils/numbers';

// Extended symbol info type with volume data
type MySymbolInfo = SymbolInfo & {
  baseVolume: string | number;   // Base asset volume
  quoteVolume: string | number;  // Quote asset volume (USDT)
};

class Script extends BaseScript {
  static definedArgs = [
    {
      key: 'symbols',
      defaultValue: 'XRP/USDT:USDT',
    },
    {
      key: 'minPercent',
      mode: 'runtime',
      defaultValue: 30,
    },
  ];

  // Script metadata
  name = 'Gainers & Losers Example';
  description =
    'Scans all USDT swap symbols for strong daily moves (gainers/losers). Results are in the report table "Gainers And Losers".';
  version = 16;
  
  // Strategy parameters
  minPercent = getArgNumber('minPercent', 30);  // Minimum percentage move to consider

  // Report and data components
  private reportLayout: StandardReportLayout;
  private swapSymbols: MySymbolInfo[];  // List of all USDT swap symbols
  lastId = 0;  // Current symbol index being analyzed

  // Analysis configuration
  preloadCandlesCount = 180;        // Number of daily candles to analyze
  timeframeNumber = 1440;           // 1 day in minutes
  timeframeString: TimeFrame = '1d'; // Daily timeframe

  constructor(args: GlobalARGS) {
    super(args);
  }

  /**
   * Called on every price tick
   * Analyzes candles for gainers/losers
   */
  async onTick(data: Tick): Promise<void> {
    await this.analyzeCandles();
  }

  /**
   * Initialize the script
   * Collects all USDT swap symbols and sets up reporting
   */
  async onInit() {
    await super.onInit();
    log('GainersLosers::onInit', 'Initializing', {}, true);

    // This script requires real exchange data, not backtesting
    if (isTester()) {
      throw new BaseError('This script works only on real exchange, not in tester mode.');
    }

    // Fetch current ticker data for all symbols
    let symbolsData = (await sdkCall('fetchTickers', [])) || {};

    log('GainersLosers::onInit', 'Ticker data loaded', { 
      symbolsData: symbolsData[this.symbols[0]] 
    }, true);

    // Initialize report layout
    this.reportLayout = new StandardReportLayout();

    // Get all available markets
    let markets = await sdkGetProp('markets');

    // Filter for USDT linear swap symbols
    this.swapSymbols = [];

    for (let symbol in markets) {
      const si = markets[symbol];
      const symbolData = symbolsData[symbol] || {};

      // Filter for active USDT linear swap symbols
      if (si.swap && si.active && si.linear && si.quote === 'USDT') {
        this.swapSymbols.push({
          ...si,
          info: undefined,
          quoteVolume: symbolData?.quoteVolume || 'n/a',
          baseVolume: symbolData?.baseVolume || 'n/a',
        });
      }
    }

    // Create report tables
    globals.report.createTable('Gainers And Losers');
    globals.report.tableUpdate('Available Swap Symbols', this.swapSymbols);
  }

  // Rate limiting: wait until next analysis cycle
  waitUntil = 0;

  /**
   * Analyze candles for significant price movements
   * Processes one symbol per call to avoid overwhelming the exchange
   */
  async analyzeCandles() {
    // Check if we should wait before next analysis
    if (timeCurrent() < this.waitUntil) {
      globals.report.cardSetValue('waitUntil', timeToString(this.waitUntil));
      return;
    }

    // Calculate time range for historical data
    const startTimestamp = timeCurrent();
    const startTime = startTimestamp - this.preloadCandlesCount * this.timeframeNumber * 1000 * 60;
    
    // Get current symbol to analyze
    const symbol = this.swapSymbols[this.lastId].symbol;
    const symbolInfo = this.swapSymbols[this.lastId];
    this.lastId++;
    
    // Reset to beginning when all symbols are processed
    if (this.lastId >= this.swapSymbols.length) {
      this.waitUntil = timeCurrent() + 2 * 60 * 60 * 1000; // Wait 2 hours before next cycle
      this.lastId = 0;
    }

    try {
      // Fetch historical daily candles
      const history = await getHistory(symbol, this.timeframeString, startTime, this.preloadCandlesCount + 1);

      // Analyze each candle for significant moves
      for (let i = history.length - 1; i >= 0; i--) {
        const [timestamp, open, high, low, close] = history[i];

        // Calculate percentage moves within the day
        const gain = percentDifference(low, high);    // Maximum gain from low to high
        const lose = percentDifference(high, low, true); // Maximum loss from high to low

        // Check if move exceeds minimum threshold
        if (gain >= this.minPercent || lose >= this.minPercent) {
          // Add to gainers/losers table
          globals.report.tableUpdate(
            'Gainers And Losers',
            {
              symbol,
              age: history.length,
              daysAgo: history.length - i,
              gain,
              lose,
              baseVolume: symbolInfo.baseVolume,
              quoteVolume: symbolInfo.quoteVolume,
              chart_link: 'https://www.gate.com/futures/USDT/' + symbol.replace('/', '_').replace(':USDT', ''),
            },
            'symbol',
          );
          break; // Found significant move, stop analyzing this symbol
        }
      }
    } catch (e) {
      throw new BaseError(e, { symbol });
    }
  }
}
