## JT-LIB

JT-Lib is a TypeScript library designed for writing trading robots for JT-Trader. It provides a simplified interface for interacting with exchanges and implementing trading strategies.


## Setup environment

After your JT-LAB developer account is created. 
Go to Servers page and find new server with type 'Mixed' on this server you can run and test your strategies.
Click on server link and open JT-Trader

**Update JT-Lib.** Go to JT-Trader:code-editor and click 'Pull' button to update JT-Lib to the latest version.

### Configure local environment

To start developing trading strategies, you can use any code editor with ftp sync support. 
Developing process is similar to developing web applications. You can write your code in your favorite code editor and then upload it to the server.

Ftp credentials can be found in email you received after server creation.

#### Configure WebStorm as an example:

1. Create a new folder for your project.
2. Open this folder in WebStorm.
3. Go to Tools -> Deployment -> Configuration -> add new SFTP server.
4. Go to Tools -> Deployment -> Upload from Server
5. Go to Tools -> Deployment -> Automatic Upload (optional if you want to upload files automatically)

Now you can start developing your trading strategies.


___
* **Get Started**
  - [Script Execution](https://docs.jt-lab.com/jt-lib/script-execution)
  - [Best practice](https://docs.jt-lab.com/jt-lib/best-practice)


* **Global API**
  - [Environment API](environment-api.md)
  - [Market API](market-api.md)
  - [Trading API](trading-api.md)


* **Lib Interfaces**
  - [BaseObject](new/base-object.md)
  - [Script](new/extended-script.md)
  - [EventEmitter](event-emitter.md)
  - [Exchange](exchange.md)
  - [TriggerService](trigger-service.md)
  - [Report](report.md)
 
  
