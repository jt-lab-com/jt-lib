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

      const profit = await getProfit();
      let volumeUsd = 0;
      let orders = await getOrders(ARGS.symbol);

      for (let order of orders) {
        if (order.status === 'closed') {
          volumeUsd += order.cost;
        }
      }
      const recoveryFactor = this.maxUpl ? (await getProfit()) / abs(this.maxUpl) : 'n/a';

      globals.report.cardSetValue('Symbol', ARGS.symbol);

      globals.report.cardSetValue('Fee', getFee());

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

      globals.report.tableUpdate('Orders real', orders.slice(0, 99));
      if (orders.length > 100) {
        const last100 = min(100, orders.length - 100);
        globals.report.tableUpdate('Orders real', orders.slice(-last100));
      }

      let sTimeStart = timeToString(this.startTimeTester);
      let sTimeEnd = timeToString(this.endTimeTester);
      let secSpend = normalize((this.endTimeTester - this.startTimeTester) / 1000, 0);

      //

      log(
        'TesterReportLayout::onStopTester',
        'onStopTester',
        { fee, profit, volumeUsd, sTimeStart, sTimeEnd, secSpend, testedDays },
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
    let uPnl = 0;
    let sizeUsdSell = 0,
      sizeUsdBuy = 0;

    try {
      this.iterator++;
      const positions = await getPositions();

      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        if (pos.side === 'long') {
          buyPrice = pos.entryPrice;
          sizeUsdBuy = pos.notional;
        }
        if (pos.side === 'short') {
          sellPrice = pos.entryPrice;
          sizeUsdSell = pos.notional;
        }

        uPnl += pos.unrealizedPnl;
      }

      this.maxUpl = min(this.maxUpl, uPnl); //

      const profitApi = await getProfit();

      globals.report.chartAddPointAgg('Profit/Drawdown', 'Zero', 0, 'last');
      globals.report.chartAddPointAgg('Profit/Drawdown', 'Profit', profitApi, 'max');
      globals.report.chartAddPointAgg('Profit/Drawdown', 'Drawdown', uPnl, 'min');

      globals.report.fullReportChart.addPointAggByDate('Profit', profitApi, 'max');
      globals.report.fullReportChart.addPointAggByDate('Drawdown', uPnl, 'min');

      const sizeUsd = sizeUsdSell + sizeUsdBuy;

      validateNumbersInObject({
        sizeUsd,
        sizeUsdBuy,
        sizeUsdSell,
        uPnl,
        maxUsdSize: this.maxUsdSize,
      });

      globals.report.chartAddPointAgg('Price chart', 'Price', close());
      globals.report.chartAddPointAgg('Price chart', 'Entry Price Buy', buyPrice ? buyPrice : null);
      globals.report.chartAddPointAgg('Price chart', 'Entry Price Sell', sellPrice ? sellPrice : null);

      this.maxUsdSize = max(sizeUsd, this.maxUsdSize);
      return { status: 'ok', updated: timeToString(tms()), iterator: this.iterator };
    } catch (e) {
      error(e, { buyPrice, sellPrice, uPnl });
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
