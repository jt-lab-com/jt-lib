import { BaseObject } from '../../core/base-object';
import { globals } from '../../core/globals';
import { currentTime, timeCurrent, timeToStrHms, timeToString } from '../../utils/date-time';
import { error, log } from '../../core/log';
import { ChartType } from '../widgets/report-chart';
import { getArgBoolean, getArgString } from '../../core/base';
import { abs, max, min, normalize, numberToCurrency, validateNumbersInObject } from '../../utils/numbers';

export class TesterReportLayout extends BaseObject {
  version = '2.08';

  lastTimeUpdated = 0;
  startTimeTester = 0;
  endTimeTester = 0;
  symbol = '';

  private _startDate: number;
  private iterator = 0;
  private testTable = {};
  private maxUpl = 0;
  private maxUsdSize = 0;

  constructor(args = {}) {
    super(args);

    this.startTimeTester = new Date().getTime();

    globals.events.subscribe('onArgsUpdate', this.onArgsUpdate, this);

    //--------------------------TESTER--------------------------
    globals.events.subscribe('onAfterStop', this.onStopTester, this);

    globals.triggers.addTaskByTime({
      name: 'collectDataTester',
      triggerTime: timeCurrent() + 1000,
      interval: 1000 * 60 * 60, // hour
      callback: this.collectDataTester,
    });

    globals.events.subscribe('onReportAction', this.onReportAction, this);

    this._startDate = currentTime();

    globals.report.createChart('Profit/Drawdown', { chartType: ChartType.Area });

    //set default Title and description
    // Note: globals.strategy is not available in current type definitions
  }

  updateReport = async (args) => {
    await globals.report.updateReport();
  };

  async onStopTester() {
    try {
      const fee = getFee();
      let feeCalc = 0;
      const profit = await getProfit();
      let volumeUsd = 0;
      let orders = await getOrders(ARGS.symbol);

      for (let order of orders) {
        if (order.status === 'closed') {
          if (order.type === 'market') {
            feeCalc += order.price * order.amount * ARGS.takerFee;
          }

          if (order.type === 'limit') {
            feeCalc += order.price * order.amount * ARGS.makerFee;
          }
          volumeUsd += order.price * order.amount;
        }
      }
      let recoveryFactor = this.maxUpl ? (await getProfit()) / abs(this.maxUpl) : 'n/a';

      // global.report.optimizedSetValue('Fee calc', feeCalc);
      globals.report.cardSetValue('Symbol', ARGS.symbol);

      globals.report.cardSetValue('Fee', feeCalc);
      //  global.report.cardSetValue('Fee calc', feeCalc);
      globals.report.cardSetValue('Profit', profit);

      globals.report.cardSetValue('Max Drawdown', abs(this.maxUpl));
      globals.report.cardSetValue('RF', recoveryFactor);
      globals.report.cardSetValue('Orders', orders.length);
      globals.report.cardSetValue('Trade Volume', volumeUsd);

      //Optimization DATA
      globals.report.optimizedSetValue('Symbol', ARGS.symbol);
      globals.report.optimizedSetValue('Max size', numberToCurrency(this.maxUsdSize), 'max');
      globals.report.optimizedSetValue('Max Drawdowm', numberToCurrency(abs(this.maxUpl)));
      globals.report.optimizedSetValue('Orders', orders.length);
      globals.report.optimizedSetValue('Fee', fee);
      globals.report.optimizedSetValue('Profit', profit);
      globals.report.optimizedSetValue('RF', recoveryFactor);

      // minus stdArgs
      let opParamsList = getArgString('opParamsList', '').split(',');
      for (let param of opParamsList) {
        if (ARGS[param] !== undefined) {
          globals.report.optimizedSetValue(param, ARGS[param]);
        }
      }

      let testedDays = normalize((tms() - this._startDate) / 1000 / 60 / 60 / 24, 0);
      globals.report.optimizedSetValue('Days', testedDays);
      globals.report.optimizedSetValue('Spend (min)', this.getTesterSpend());

      if (orders.length > 100) {
        orders = orders.slice(1, 50).concat(orders.slice(-50));
      } else {
        orders = orders.slice(0, 100);
      }
      //@ts-ignore
      globals.report.tableUpdate('Orders real', orders);

      let sTimeStart = timeToString(this.startTimeTester);
      let sTimeEnd = timeToString(this.endTimeTester);
      let secSpend = normalize((this.endTimeTester - this.startTimeTester) / 1000, 0);

      //

      log(
        'TesterReportLayout::onStopTester',
        'onStopTester',
        { fee, feeCalc, profit, volumeUsd, sTimeStart, sTimeEnd, secSpend, testedDays },
        true,
      );
    } catch (e) {
      error(e, {});
    }

    await this.updateReport({ isChartOptimazer: true });
  }

  collectDataTester = async () => {
    let buyPrice = 0;
    let sellPrice = 0;
    let posSizeBuy = 0;
    let posSizeSell = 0;
    let uPnl = 0;

    try {
      this.iterator++;

      // get first basket
      let positions = await getPositions();

      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        if (pos.side === 'long') {
          buyPrice = pos.entryPrice;
          posSizeBuy = pos.contracts;
        }
        if (pos.side === 'short') {
          sellPrice = pos.entryPrice;
          posSizeSell = pos.contracts;
        }

        uPnl += pos.unrealizedPnl;

        pos['uPnl'] = uPnl;
        pos['id'] = timeToStrHms(tms()) + ' - ' + pos.side;
        pos['lastprice'] = close();
      }

      this.maxUpl = min(this.maxUpl, uPnl); //

      let profitApi = await getProfit();
      // // debugger;
      // if (isNaN(uPnl) || uPnl === null || uPnl === undefined) {
      //   debugger;
      //   trace('TesterReportLayout:collectDataTester + 1', 'uPnl is NaN', { positions, uPnl, buyPrice, sellPrice });
      // }

      globals.report.chartAddPointAgg('Profit/Drawdown', 'Zero', 0, 'last');
      globals.report.chartAddPointAgg('Profit/Drawdown', 'Profit', profitApi, 'max');
      globals.report.chartAddPointAgg('Profit/Drawdown', 'Drawdown', uPnl, 'min');

      globals.report.fullReportChart.addPointAggByDate('Profit', profitApi, 'max');
      globals.report.fullReportChart.addPointAggByDate('Drawdown', uPnl, 'min');

      let sizeUsdSell = posSizeSell * sellPrice;
      let sizeUsdBuy = posSizeBuy * buyPrice;
      let sizeUsd = sizeUsdSell + sizeUsdBuy;

      validateNumbersInObject({
        sizeUsd,
        sizeUsdBuy,
        sizeUsdSell,
        posSizeBuy,
        posSizeSell,
        uPnl,
        maxUsdSize: this.maxUsdSize,
      });

      // globals.report.chartAddPointAgg('Position size', 'All Usd', sizeUsd ? sizeUsd : null, 'max');
      // globals.report.chartAddPointAgg('Position size', 'Usd Buy', sizeUsdBuy ? sizeUsdBuy : null, 'max');
      // globals.report.chartAddPointAgg('Position size', 'Usd Sell', sizeUsdSell ? sizeUsdSell : null, 'max');
      //
      // globals.report.chartAddPointAgg('Coin size', 'Zero', 0);
      // globals.report.chartAddPointAgg('Coin size', 'Coin Buy', posSizeBuy ? posSizeBuy : null, 'max');
      // globals.report.chartAddPointAgg('Coin size', 'Coin Sell', posSizeSell ? posSizeSell : null, 'max');

      globals.report.chartAddPointAgg('Price chart', 'Price', close());
      globals.report.chartAddPointAgg('Price chart', 'Entry Price Buy', buyPrice ? buyPrice : null);
      globals.report.chartAddPointAgg('Price chart', 'Entry Price Sell', sellPrice ? sellPrice : null);

      this.maxUsdSize = max(sizeUsdBuy + sizeUsdSell, this.maxUsdSize);
      return { status: 'ok', updated: timeToString(tms()), iterator: this.iterator };
    } catch (e) {
      error(e, { buyPrice, sellPrice, posSizeBuy, posSizeSell, uPnl });
    }
  };

  getTesterSpend() {
    this.endTimeTester = new Date().getTime();

    let sec = Math.round((this.endTimeTester - this.startTimeTester) / 1000);
    // min:sec
    let min = Math.floor(sec / 60);
    sec = sec % 60;
    return min + ':' + sec;
  }

  async onArgsUpdate(args) {
    // log('TesterReportLayout:onArgsUpdate', 'args', { args }, true);
  }

  async onReportAction(data = { action: '', value: '' }) {
    //let { action, value } = data; //action, value
    // log('TesterReportLayout:onReportAction', 'action', data, true);
  }
}
