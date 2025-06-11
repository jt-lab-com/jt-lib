# ExtendedScript
___

This is a base class for all strategies with extended functionality.  
> Note: Strategy class should be extended from this class.
>> Works for both tester and live trading.


| Method             | Description                                                                                    |
|--------------------|------------------------------------------------------------------------------------------------|
| `init`             | In this method, initialization occurs before the main functionality of the script is launched. |
| `runOnTick`        | This method is called on every tick.                                                           |
| `runTickEnded`     | This method is called after every tick.                                                        |
| `runOnTimer`       | This method will be called instead of `onTick` if interval is passed to the script arguments.  |
| `runOnOrderChange` | This method is called when the order has been changed.                                         |
| `runOnError`       | This method is called when an error has been caught.                                           |
| `runArgsUpdate`    | This method is called when the script's arguments change.                                      |
| `run`              | This method is called immediately after initialization.                                        |
| `stop`             | This method is called after the script completes.                                              |