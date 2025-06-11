# [Strategy Tester](#strategy-tester)

The Strategy Tester is a tool designed to evaluate the performance of trading strategies based on historical data. By using historical data, it becomes possible to simulate how a strategy would have performed under past market conditions, providing insight into its potential future performance.

## [Creating a Test Scenario](#scenario-creation)

### Required Parameters

* `Name`: The name of the test scenario.
* `Strategy`: The strategy script to be tested.
* `Symbol`: The trading symbol on which the strategy will be tested.
* `Spread`: The size of the spread.
* `Period`: Candle timeframe.
* `Leverage`: The leverage to be used.
* `Taker fee`: Fee for executing market orders.
* `Maker fee`: Fee for executing limit orders.
* `StartTime`: Start date and time of the test.
* `EndTime`: End date and time of the test.

### `Strategy` Class Constructor Parameters

Parameters that must be passed when creating an instance of the `Strategy` class:

> These parameters will be passed to the Strategy class constructor as `string` type.

### Optimizer Parameters

Parameters used by the optimizer when testing a strategy:

* `Begin`: Start value of the optimization range.
* `End`: End value of the optimization range.
* `Step`: Step size for parameter variation within the range.

A total of `N` scenarios will be generated, where `N` is the number of optimization parameter combinations calculated based on the provided values.
The maximum number of scenarios may be limited.

> These parameters will be passed to the Strategy class constructor as `numbers`.

## [Working Principle of the Strategy Tester](#working-principle-of-the-strategy-tester)

1. **Quote Loading**: Quotes for the selected time period (M1) are loaded into the system.

2. **Strategy Instance Creation**: An instance of the `Strategy` class is initialized.

3. **Strategy Initialization**:

    * The `init` method of the strategy is called to prepare necessary data and settings.
    * If the `isInited` parameter is set to `true`, testing is ready to begin.

4. **Testing Loop**:

    * A loop starts and runs until the test end date is reached.
    * On each iteration, the strategy’s `onTick` method is called.
    * The `onTick` method is called for each quote.

5. **Order Processing**:

    * When an order is executed, the `onOrderChange` method is called.
    * Market orders are executed on the current candle.
    * Limit orders are executed on the next candle or later.

6. **Test Completion**:

    * Once testing is complete, the strategy’s `stop` method is called.
    * The `stop` method is also invoked in case of a critical error during the test.

## [Synchrony and Asynchrony](#synchrony-and-asynchrony)

* The asynchronous tester requires significantly more time to run compared to the synchronous one.
* In real-time mode, scripts operate with asynchronous functions; therefore, both synchronous and asynchronous versions of the tester were developed.
* In the synchronous tester, asynchronous functions are transformed into synchronous ones, and `await` statements are removed to ensure smooth synchronous execution.
* To ensure proper functioning of the synchronous tester, avoid using `then()` for asynchronous functions.

## [Important Details](#important-details)

* The `tms()` function returns the candle start time (e.g., 2022-01-01 00:00:00); however, technically the current time corresponds to the end of the candle (2022-01-01 00:00:59), since all key candle data points (high, low, open, close) are already known.
* If the necessary quotes for testing are missing, the system will automatically download them.
* It is recommended to pre-load quotes for single scenario testing rather than for mass optimization, to reduce system load and speed up the testing process.