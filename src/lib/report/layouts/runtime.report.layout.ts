import { BaseObject } from '../../core/base-object';
import { globals } from '../../core/globals';
import { currentTime, timeCurrent, timeToStrHms, timeToString } from '../../utils/date-time';
import { error, log } from '../../core/log';
import { ChartType } from '../widgets/report-chart';
import { getArgBoolean, getArgString } from '../../core/base';
import { abs, max, min, normalize, numberToCurrency, validateNumbersInObject } from '../../utils/numbers';

export class RuntimeReportLayout extends BaseObject {
  version = '2.08';

  lastTimeUpdated = 0;
  startTimeTester = 0;
  endTimeTester = 0;
  symbol = '';

  private _startDate: number;
  private timerHandler: any;
  private isByTimer: boolean;
  private timeToNextUpdate = 0;
  private nextTimeReportUpdate = 0;
  private timmeUntilFastUpdate = 0;
  private profit = 0;
  private dataOrders = [];

  constructor(
    args = {
      isByTimer: false,
    },
  ) {
    super(args);

    this.timmeUntilFastUpdate = currentTime() + 5 * 60 * 1000; // 5 min

    //this.symbol = global.strategy.symbols[0];
    this.startTimeTester = new Date().getTime();

    globals.events.subscribe('onArgsUpdate', this.onArgsUpdate, this);

    //--------------------------RUNTIME--------------------------
    if (args?.isByTimer) {
      this.timerHandler = setTimeout(this.collectDataRuntime.bind(this), 5000);
      this.isByTimer = true;
      log('RuntimeReportLayout:constructor', ' Timer is set for CollectReportData', {}, true);
    } else {
      globals.triggers.registerTimeHandler('CollectReportData', this.collectDataRuntime, this);

      globals.triggers.addTaskByTime({
        name: 'CollectReportData',
        triggerTime: timeCurrent() + 2000,
        interval: 1000 * 5,
      });
    }

    //update report every 5 sec
    globals.triggers.addTaskByTime({
      name: 'updateReport',
      triggerTime: timeCurrent() + 1000,
      interval: 1000 * 5,
      callback: this.updateReport,
    });

    globals.events.subscribe('onOrderChange', this.collectOrdersRuntime, this);

    globals.events.subscribe('onReportAction', this.onReportAction, this);

    this._startDate = currentTime();

    globals.report.createChart('Profit/Drawdown', { chartType: ChartType.Area });

    //set default Title and description
    // Note: globals.strategy is not available in current type definitions
  }

  updateReport = async (args) => {
    await globals.report.updateReport();
  };

  async collectOrdersRuntime(order: Order) {
    this.dataOrders.push({ ...order, info: undefined });
    if (this.dataOrders.length > 30) {
      //shift
      globals.report.clearTable('ALL Orders');
      this.dataOrders.shift();
    }
  }

  addProfit(profit = 0, symbol = '') {
    this.profit += profit;
    globals.report.cardSetValue('Profit', this.profit);

    if (!isTester()) {
      globals.report.chartAddPoint('Profit', 'Profit', this.profit);
    }
  }

  async collectDataRuntime() {
    if (this.isByTimer) {
      this.timerHandler = setTimeout(this.collectDataRuntime.bind(this), 5000);
    }
    //globals.report.cardSetValue('isTradeAllowed', globals.isTradeAllowed);
    globals.report.cardSetValue('Updated', timeToStrHms(tms()));

    return { status: 'ok', updated: timeToString(tms()) };
  }

  async onArgsUpdate(args) {
    // log('RuntimeReportLayout:onArgsUpdate', 'args', { args }, true);
  }

  async onReportAction(data = { action: '', value: '' }) {
    //let { action, value } = data; //action, value
    // log('RuntimeReportLayout:onReportAction', 'action', data, true);
  }
}
