# Create Runtime Scenario
___


![image](./img/create-scanerio-runtime.jpg)

###### Required params

- `Name`: Name of the test scenario.
- `Prefix`: The prefix is used to generate unique keys. (For orders id, data storage, etc.)
- `Strategy`: Trading script file. The Strategy class is described inside the file.
- `type` - market or system. 
  - `market` - The script will have trading functions and will be able to send orders. 
  - `system` - The script will not have trading functions and will not be able to send orders, but get all notification orders, positions, balance is changing.
- `Exchange`: The exchange on which the script will be launched. Before launching the script, you need to configure API keys in the settings.

> 
###### Script parameters


###### Define default parameters
 ```typescript
class Strategy extends Script {
  static definedArgs = [
    {
      key: 'coins',
      defaultValue: 'BCH,XRP,EOS,TRX,XLM,XMR,DASH,ZEC,XTZ,ATOM,ONT,IOTA,BAT,VET,NEO,QTUM,IOST,THETA,ALGO,ZIL',
      mode: 'runtime',
    },
    {
      key: 'aggressionLevel',
      options: [
        { value: 'Very Conservative', label: 'Very Conservative' },
        { value: 'Conservative', label: 'Conservative' },
        { value: 'Balanced', label: 'Balanced' },
        { value: 'Aggressive', label: 'Aggressive' },
        { value: 'Very Aggressive', label: 'Very Aggressive' },
      ],
      defaultValue: 'Balanced',
    },
    {
      key: 'workingBalance',
      defaultValue: 500,
      mode: 'runtime',
    },
    {
      key: 'symbols',
      defaultValue:
        'BCH/USDT, BTC/USDT, ADA/USDT, ETH/USDT, XRP/USDT, TRX/USDT, SOL/USDT, LTC/USDT, BNB/USDT,DOGE/USDT',
      mode: 'tester',
    },
  ];
}
```


## Running the script

### Control buttons

- `Run`: Runs the script.
- `Stop`: Stops the script.
- `Report`: Opens the report window.
- `Config`: Updates the script configuration. You can change additional parameters without stopping the script. Changes will be sent to the script in the onArgsChange event.
- `Logs`: Opens the log window.
- `Delete`: Deletes a script.

>By default, the configurations do not change when the script is running. See the script specification for details. In order for the new parameters to be changed, the script must be restarted.


![image](./img/runtime-tab.jpg)




