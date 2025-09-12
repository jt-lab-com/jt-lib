# JT Lib

JT Lib is a comprehensive TypeScript library for creating algorithmic trading strategies. It is the **core component** of the **JT Trader** platform, providing a powerful and intuitive API for market data access, technical indicators, order management, and strategy execution.

> **Part of JT Trader** - This library is designed to work seamlessly with the [JT Trader](https://github.com/jt-lab-com/jt-trader) trading platform and is installed together with it.

## 📋 Table of Contents

- [🚀 Key Features](#-key-features)
- [📋 Requirements](#-requirements)
- [🛠 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
    - [DCA Strategy Example](#dca-dollar-cost-averaging-strategy-example)
    - [RSI Trading Strategy Example](#rsi-trading-strategy-example)
    - [Multi-Currency Trading Bots](#multi-currency-trading-bots)
- [📚 Core Architecture](#-core-architecture)
- [📖 Documentation](#-documentation)
- [🔧 Configuration](#-configuration)
- [🧪 Testing](#-testing)
- [📄 License](#-license)
- [🤝 Support](#-support)
- [🔗 Related Projects](#-related-projects)
- [📈 Examples](#-examples)
- [🏗️ Architecture Overview](#️-architecture-overview)

## 🚀 Key Features

- **Trading Operations** - Buying, selling, placing orders with automatic contract conversion
- **Market Data** - Real-time and historical market data access with candle buffering
- **Technical Indicators** - Built-in collection of popular technical indicators (RSI, SMA, ATR, etc.)
- **Event System** - Event-driven architecture with triggers for automated strategy execution
- **Order Management** - Complete order lifecycle management with OrdersBasket
- **Strategy Framework** - Robust BaseScript framework for strategy development
- **Reporting System** - Comprehensive reporting with charts, tables, and real-time monitoring
- **Multi-Symbol Trading** - Support for trading multiple symbols simultaneously
- **Error Handling** - Comprehensive error handling and logging system
- **TypeScript Support** - Full TypeScript support with type definitions

## 📋 Requirements

- Node.js v18.x
- TypeScript 4.x+
- JT Trader platform

## 🛠 Installation

JT Lib is installed together with the JT Trader platform. See installation instructions:

- **[JT Trader Repository](https://github.com/jt-lab-com/jt-trader)** - Main platform repository
- **[Installation Guide](https://docs.jt-lab.com/installation/)** - Complete installation documentation

## 🚀 Quick Start

### DCA (Dollar Cost Averaging) Strategy Example

Here's a complete DCA strategy example using JT Lib:

```typescript
class Script extends BaseScript {
  static definedArgs = [
    { key: 'symbols', defaultValue: 'BTC/USDT:USDT' },
    { key: 'sizeUsd', defaultValue: 100 },
    { key: 'intervalHours', defaultValue: 168 }, // 1 week
  ];

  dcaBasket: OrdersBasket;
  sizeUsd = getArgNumber('sizeUsd', 100);
  intervalHours = getArgNumber('intervalHours', 168);

  async onInit() {
    // Create basket for trading
    this.dcaBasket = new OrdersBasket({
      symbol: this.symbols[0],
    });
    await this.dcaBasket.init();

    // Register purchase trigger
    globals.triggers.registerTimeHandler('dcaPurchase', this.buyDCA, this);
    
    // Start regular purchases
    globals.triggers.addTaskByTime({
      name: 'dcaPurchase',
      triggerTime: currentTime() + 60 * 1000, // In 1 minute
      interval: this.intervalHours * 60 * 60 * 1000, // Repeat every intervalHours hours
      canReStore: true,
    });
  }

  // Purchase function
  buyDCA = async () => {
    const amount = this.dcaBasket.getContractsAmount(this.sizeUsd);
    await this.dcaBasket.buyMarket(amount);
    log('DCA purchase executed', `amount: ${amount}, price: ${this.dcaBasket.close()}`);
  };
}
```

### RSI Trading Strategy Example

```typescript
class Script extends BaseScript {
  private rsi: RelativeStrengthIndex;
  private sma: SimpleMovingAverageIndicator;
  private basket: OrdersBasket;
  private isPositionOpened = false;

  async onInit() {
    // Create OrdersBasket for trading
    this.basket = new OrdersBasket({
      symbol: this.symbols[0],
    });
    await this.basket.init();

    // Create indicators
    this.rsi = await globals.indicators.rsi(this.symbols[0], '1h', 14);
    this.sma = await globals.indicators.sma(this.symbols[0], '1h', 20);
  }

  async onTick() {
    if (this.isPositionOpened) return;

    const currentPrice = this.basket.close();
    const rsiValue = this.rsi.getValue();
    const smaValue = this.sma.getValue();

    // Buy signal: RSI oversold + price above SMA
    if (rsiValue < 30 && currentPrice > smaValue) {
      const amount = this.basket.getContractsAmount(100);
      const stopLoss = currentPrice * 0.95; // 5% stop loss
      const takeProfit = currentPrice * 1.1; // 10% take profit
      
      await this.basket.buyMarket(amount, takeProfit, stopLoss);
      this.isPositionOpened = true;
      log('Strategy', 'Buy signal executed', { 
        rsiValue, smaValue, price: currentPrice, stopLoss, takeProfit 
      });
    }

    // Sell signal: RSI overbought + price below SMA
    if (rsiValue > 70 && currentPrice < smaValue) {
      const amount = this.basket.getContractsAmount(100);
      const stopLoss = currentPrice * 1.05; // 5% stop loss
      const takeProfit = currentPrice * 0.9; // 10% take profit
      
      await this.basket.sellMarket(amount, takeProfit, stopLoss);
      this.isPositionOpened = true;
      log('Strategy', 'Sell signal executed', { 
        rsiValue, smaValue, price: currentPrice, stopLoss, takeProfit 
      });
    }
  }

  async onOrderChange(order: Order) {
    if (order.status === 'closed' && order.reduceOnly) {
      // Only reset position flag when closing order is executed
      this.isPositionOpened = false;
      log('Strategy', 'Position closed', { orderId: order.id, side: order.side });
    }
  }
}
```

### Multi-Currency Trading Bots

**Multi-currency bot architecture:**

```typescript
// Main script - coordinator
class Script extends BaseScript {
  baskets: Record<string, OrdersBasket> = {};
  
  async onInit() {
    // Creates OrdersBasket for each symbol
    for (const symbol of this.symbols) {
      this.baskets[symbol] = new OrdersBasket({ symbol });
      await this.baskets[symbol].init();
    }
  }
}

// Each OrdersBasket manages its own strategy
class GridBasket extends OrdersBasket {
  // Trading logic for specific symbol
  async onTick() { /* strategy */ }
  async onOrderChange() { /* order handling */ }
}
```

**Principle:** Script creates OrdersBasket for each symbol → each basket works independently → centralized management through Script.

📖 **Details:** [Script Development Best Practices](https://docs.jt-lab.com/jt-lib/script-best-practices/)

## 📚 Core Architecture

### BaseScript - Strategy Framework
- **Lifecycle Management** - `onInit()`, `onTick()`, `onOrderChange()`, `onStop()`
- **Parameter System** - `static definedArgs` for strategy configuration
- **Global Services** - Automatic initialization of all JT Lib services
- **Multi-Symbol Support** - Trade multiple symbols simultaneously

### OrdersBasket - Trading Operations
- **Order Management** - Market, limit, stop-loss, take-profit orders
- **Contract Conversion** - Automatic USD to contracts conversion
- **Position Management** - Long/short position tracking
- **Hedge Mode** - Support for bidirectional trading
- **Trigger Orders** - Local and exchange-based stop orders

### Event System & Triggers
- **EventEmitter** - Reactive programming with typed events
- **Time Triggers** - Scheduled task execution
- **Price Triggers** - Action execution on price levels
- **Order Triggers** - Action execution on order status changes
- **Automatic Restoration** - Triggers persist after strategy restart

### Market Data & Indicators
- **CandlesBuffer** - Efficient historical data management
- **Technical Indicators** - RSI, SMA, ATR, and more
- **Real-time Data** - Live price feeds and order book
- **Multi-timeframe** - Support for different timeframes

### Reporting System
- **Widgets** - Cards, tables, charts, text blocks
- **Real-time Updates** - Live strategy monitoring
- **Data Export** - Results in various formats
- **Interactive Controls** - Action buttons for strategy management

## 📖 Documentation

### Main Documentation
- **[JT Trader Documentation](https://docs.jt-lab.com/jt-trader/)** - Complete platform documentation
- **[JT Lib API Reference](https://docs.jt-lab.com/jt-lib/)** - Detailed API documentation
- **[Getting Started Guide](https://docs.jt-lab.com/jt-trader/getting-started/)** - Platform setup and first steps

### JT Lib Specific Documentation
- **[Introduction & Architecture](https://docs.jt-lab.com/jt-lib/introduction-architecture/)** - Library overview and system architecture
- **[Core Fundamentals](https://docs.jt-lab.com/jt-lib/core-fundamentals/)** - BaseObject, Globals, Storage, Logging
- **[Trading Scripts](https://docs.jt-lab.com/jt-lib/trading-scripts/)** - BaseScript and strategy development
- **[Exchange Operations](https://docs.jt-lab.com/jt-lib/exchange-orders-basket/)** - OrdersBasket for trading operations
- **[Technical Indicators](https://docs.jt-lab.com/jt-lib/technical-indicators/)** - Built-in indicators and market analysis
- **[Event System](https://docs.jt-lab.com/jt-lib/events-system/)** - EventEmitter and reactive programming
- **[Triggers System](https://docs.jt-lab.com/jt-lib/triggers-system/)** - Automated task execution
- **[Market Data](https://docs.jt-lab.com/jt-lib/market-data-candles/)** - Historical data and candle management
- **[Reporting System](https://docs.jt-lab.com/jt-lib/reporting-system/)** - Charts, tables, and real-time monitoring
- **[Best Practices](https://docs.jt-lab.com/jt-lib/script-best-practices/)** - Development guidelines and patterns

### Quick Links
- **[Installation Guide](https://docs.jt-lab.com/installation/)** - Platform installation
- **[Configuration](https://docs.jt-lab.com/jt-trader/configuration/)** - Platform configuration
- **[Examples](https://docs.jt-lab.com/examples-guide/)** - Strategy examples and templates

## 🔧 Configuration

JT Lib configuration is handled through JT Trader platform. No separate configuration is required.

**Strategy Parameters:**
```typescript
class Script extends BaseScript {
  static definedArgs = [
    { key: 'symbols', defaultValue: 'BTC/USDT:USDT' },
    { key: 'sizeUsd', defaultValue: 100 },
    { key: 'leverage', defaultValue: 1 },
    { key: 'hedgeMode', defaultValue: false },
  ];

  async onInit() {
    // Parameters are automatically available through getArg* functions
    const symbols = getArgString('symbols');
    const sizeUsd = getArgNumber('sizeUsd', 100);
    const leverage = getArgNumber('leverage', 1);
    const hedgeMode = getArgBoolean('hedgeMode', false);
  }
}
```

## 🧪 Testing

JT Lib strategies can be tested using the JT Trader tester:

1. **Create New Scenario** in JT Trader
2. **Select Strategy** and configure parameters
3. **Set Test Period** and initial balance
4. **Run Test** and analyze results
5. **View Report** with detailed statistics



## 📄 License

- 🟢 **Free** for personal, educational, and open-source use (AGPLv3)


## 🤝 Support

- [Official Website](https://jt-lab.com)
- [Documentation](https://docs.jt-lab.com) - Complete documentation
- [GitHub Issues](https://github.com/jt-lab-com/jt-lib/issues) - Report bugs and request features

## 🔗 Related Projects

- **[JT Trader](https://github.com/jt-lab-com/jt-trader)** - Main trading platform (uses jt-lib)
- **[JT Lab Documentation](https://github.com/jt-lab-com/jt-lab-docs)** - Complete project documentation
- **[Live Documentation](https://docs.jt-lab.com)** - Online documentation portal

## 📈 Examples

Available example strategies in the codebase:

- **[GridBot Example](https://github.com/jt-lab-com/jt-lib/tree/main/examples/GridBot-Example.ts)** - Multi-coin grid trading strategy with automatic position management and profit taking
- **[RSI Bot Example](https://github.com/jt-lab-com/jt-lib/tree/main/examples/RsiBot-Example.ts)** - RSI momentum strategy that buys when oversold (<30) and sells when overbought (>70)
- **[Gainers-Losers Example](https://github.com/jt-lab-com/jt-lib/tree/main/examples/Gainers-Losers-Example.ts)** - Market scanner that finds symbols with significant daily price movements (≥30%)
- **[Indicators Example](https://github.com/jt-lab-com/jt-lib/tree/main/examples/Indicators-Example.ts)** - Technical indicators demonstration with SMA and ATR on real-time charts
- **[Trading API Example](https://github.com/jt-lab-com/jt-lib/tree/main/examples/Trading-Api-Example.ts)** - Interactive trading interface with callback buttons for all exchange operations

All examples are ready to run and demonstrate different aspects of JT Lib functionality.

## 🏗️ Architecture Overview

JT Lib follows a modular architecture with clear separation of concerns:

- **BaseScript** - Strategy coordination and lifecycle management
- **OrdersBasket** - Trading operations for individual symbols
- **Event System** - Reactive programming with typed events
- **Trigger System** - Automated task execution
- **Reporting System** - Real-time monitoring and analytics
- **Storage System** - Persistent state management

---

**JT Lab** - Professional tools for algorithmic trading


