import { currentTime, timeToString } from '../../utils/date-time';
import { error, log, warning } from '../../core/log';
import { AggType } from '../types';
import { ReportWidget } from './report-widget';
import { globals } from '../../core/globals';

export class ReportChart extends ReportWidget {
  buffer;
  lines;
  x;
  linesInfo: LinesInfo;

  AGG_PERIOD = 86400000; // 1 day in ms
  MAX_POINTS = 5000;

  nextTimeToAggregate = 0;
  isNewDotsReady = false;
  lastXValue = 0;

  chartType: ChartType = ChartType.Line;

  constructor(private readonly name: string, options?: ReportChartOptions) {
    super();
    this.buffer = {};
    this.lines = {};
    this.x = [];
    this.linesInfo = {};
    this.MAX_POINTS = options?.maxPoints ?? this.MAX_POINTS;
    this.AGG_PERIOD = options?.aggPeriod ?? this.AGG_PERIOD;
    this.chartType = options?.chartType ?? this.chartType;
    this.nextTimeToAggregate = currentTime() + this.AGG_PERIOD;
  }

  setLineInfo(name: string, aggType: AggType = 'max', color?: string) {
    let lineNameWithAgg = aggType + '_' + name;
    this.linesInfo[lineNameWithAgg] = { name: name, aggType: aggType, color };
    this.lines[lineNameWithAgg] = [];
  }

  getLength() {
    return this.x.length;
  }
  getLine(name: string): number[] {
    if (!this.lines[name]) {
      warning('ReportCharts::getLine()', 'No line with name: ' + name);
      return [];
    }
    return this.lines[name];
  }

  clear() {
    this.buffer = {};
    this.lines = {};
    this.x = [];
    this.linesInfo = {};
    this.nextTimeToAggregate = currentTime() + this.AGG_PERIOD;
    this.isNewDotsReady = false;
    this.lastXValue = 0;
  }

  addPoint(lineName: string, valueX: number, valueY: number, color?: string) {
    if (!this.linesInfo[lineName]) {
      this.linesInfo[lineName] = { name: lineName, aggType: 'none', color };
      this.lines[lineName] = [];
    }

    if (this.x.length > this.MAX_POINTS) {
      const shift = Math.round(this.MAX_POINTS * 0.25);
      this.x.splice(0, shift);
      for (let line in this.lines) {
        this.lines[line].splice(0, shift - 1);
      }
      log('ReportCharts::updatePointsToChart()', ' Too many points in chart. Max points: ' + this.MAX_POINTS);
    }
    //TODO Charts.addPoint можно использовать только в одном месте / может пойти перекос по точкам одних будет больше чем других
    //нужно сделать проверку на количество точек во всех линиях / агрегатор
    this.lines[lineName].push(valueY);
    if (this.lines[lineName].length > this.x.length) {
      this.x.push(valueX);
    }
  }

  addPointByDate(lineName: string, valueY: number, color?: string) {
    this.addPoint(lineName, currentTime(), valueY, color);
  }

  addPointAggByDate(lineName: string, value: number, aggType: AggType = 'max', color?: string) {
    if (this.isNewDotsReady) {
      this.updatePointsToChart();
    }

    if (!this.buffer[lineName]) {
      this.buffer[lineName] = { lastValue: 0, sum: 0, avg: 0, min: null, max: null, cnt: 0, lastX: 0 };
      const lineNameWithAgg = aggType + '_' + lineName;
      this.linesInfo[lineNameWithAgg] = { name: lineName, aggType: aggType, color };
      this.lines[lineNameWithAgg] = [];
    }

    let pointInfo = this.buffer[lineName];
    // if (pointInfo.lastX === currentTime()) {
    //   return;
    // }

    pointInfo.sum += value;
    pointInfo.cnt++;

    if (pointInfo.min === null) pointInfo.min = value;
    pointInfo.min = Math.min(pointInfo.min, value);

    if (pointInfo.max === null) pointInfo.max = value;
    pointInfo.max = Math.max(pointInfo.max, value);

    pointInfo.lastValue = value;
    pointInfo.lastX = currentTime();

    if (currentTime() > this.nextTimeToAggregate && !this.isNewDotsReady) {
      this.lastXValue = currentTime();
      this.isNewDotsReady = true;
    }
  }

  private updatePointsToChart = () => {
    //TODO проверить нормально ли работает обрезка точек
    if (this.x.length > this.MAX_POINTS) {
      const shift = Math.round(this.MAX_POINTS * 0.25);
      this.x.splice(0, shift - 1);
      for (let line in this.lines) {
        this.lines[line].splice(0, shift - 1);
      }
      log('ReportCharts::updatePointsToChart()', 'Too many points in chart. Max points: ' + this.MAX_POINTS);
    }

    for (let lineNameWithAgg in this.linesInfo) {
      let lineInfo = this.linesInfo[lineNameWithAgg];
      let lineName = lineInfo.name;
      let pointInfo = this.buffer[lineName];

      let pointValue = 0;
      switch (lineInfo.aggType) {
        case 'sum':
          pointValue = pointInfo.sum;
          break;
        case 'avg':
          pointValue = pointInfo.sum / pointInfo.cnt;
          break;
        case 'max':
          pointValue = pointInfo.max;
          break;
        case 'min':
          pointValue = pointInfo.min;
          break;
        case 'last':
          pointValue = pointInfo.lastValue;
          break;
        default:
          pointValue = pointInfo.lastValue;
          break;
      }
      this.lines[lineNameWithAgg].push(pointValue);
      this.buffer[lineName] = { lastValue: 0, sum: 0, avg: 0, min: null, max: null, cnt: 0, lastX: 0 };
    }
    this.x.push(this.lastXValue);
    this.isNewDotsReady = false;
    this.nextTimeToAggregate = currentTime() + this.AGG_PERIOD;
  };

  setAggPeriodByDates(start: number, end: number, dotCount: number) {
    this.AGG_PERIOD = (end - start) / dotCount;
  }

  prepareDataToReport = (): ChartDataReportBlock => {
    const series = [];
    const colors = [];

    for (const lineName in this.linesInfo) {
      series.push({
        name: this.linesInfo[lineName].name,
        data: this.lines[lineName],
      });

      if (this.linesInfo[lineName].color) {
        colors.push(this.linesInfo[lineName].color);
      }
    }

    return {
      type: 'chart',
      name: this.name,
      isVisible: this.isVisible,
      data: {
        series: series,
        time: this.x,
        type: this.chartType,
        ...(!!colors.length && { colors }),
      },
    };
  };

  //TODO make additional class for full report
  prepareDataToFullReport = async (): ChartDataReportBlock => {
    if (!isTester()) return;

    if (!this.lines['max_Profit']) {
      error('ReportChart::prepareDataToOptimize', 'No profit line in chart', { lines: Object.keys(this.lines) });
      return [];
    }

    if (!this.lines['min_Drawdown']) {
      error('ReportChart::prepareDataToOptimize', 'No Drawdown line in chart', { lines: Object.keys(this.lines) });
      return [];
    }

    let startTime = ARGS.startDate.getTime();

    //need end on the month end
    let endTime = new Date(ARGS.endDate.getFullYear(), ARGS.endDate.getMonth() + 1, 0).getTime();
    let step = 1000 * 60 * 60 * 24; // 1 day

    let result = {};
    let time = 0;

    let prevTime = 0;
    // let oneDay = 1000 * 60 * 60 * 24;
    // let today = Math.floor(tms() / oneDay) * oneDay; //today 00:00
    let optimizerChartData = {};

    time = startTime;
    let length = Math.floor((endTime - startTime) / step);
    for (let i = 0; i < length + 1; i++) {
      time = Math.floor(time / step) * step; //today 00:00
      optimizerChartData[time] = { profit: 0, drawdown: 0, isChanged: false };
      time += step;
    }

    let chart = new ReportChart('Optimizer profit');
    globals.report.dropChart('Optimizer profit');
    for (let i = 0; i < this.x.length; i++) {
      time = this.x[i];
      result[time] = { profit: this.lines['max_Profit'][i], drawdown: this.lines['min_Drawdown'][i] };

      let roundTime = Math.floor(time / step) * step;

      if (optimizerChartData[roundTime]) {
        optimizerChartData[roundTime] = {
          profit: this.lines['max_Profit'][i],
          drawdown: this.lines['min_Drawdown'][i],
          isChanged: true,
        };

        chart.addPoint('max_Profit', roundTime, this.lines['max_Profit'][i]);
        chart.addPoint('min_Drawdown', roundTime, this.lines['min_Drawdown'][i]);

        // let before1day = Math.floor((time - step) / step) * step;
        // if (optimizerChartData[before1day].isChanged === false) {
        //   optimizerChartData[before1day] = {
        //     profit: this.lines['max_Profit'][i],
        //     drawdown: this.lines['min_Drawdown'][i],
        //     isChanged: true,
        //   };
        // }
      }

      prevTime = time;
    }
    globals.report.addChart('Optimizer profit', chart);
    globals.report.setLayoutIndex('chart', 'Optimizer profit', 1);
    let cntDodts = 0;
    let cntNotChanged = 0;
    if (1) {
      let profit = 0;
      let drawdown = 0;
      time = startTime;

      for (let i = 0; i < length + 1; i++) {
        let roundTime = Math.floor(time / step) * step;

        if (optimizerChartData[roundTime]) {
          cntDodts++;
          time = Math.floor(time / step) * step; //today 00:00

          let cValue = optimizerChartData[roundTime];

          if (cValue.isChanged === false) {
            cntNotChanged++;
            optimizerChartData[roundTime] = { profit: profit, drawdown: drawdown, isChanged: true };
          }
          profit = cValue.profit;
          drawdown = cValue.drawdown;

          time += step;
          if (time > tms()) break;
        }
      }
    }
    log(
      'ReportChart::prepareDataToOptimizer',
      'Result',
      {
        cntResult: Object.keys(result).length,
        cntResultChart: Object.keys(optimizerChartData).length,
        lastTime: timeToString(time),
        length: length,
        cntDodts,
        cntNotChanged,
      },
      true,
    );

    let orders = await getOrders(ARGS.symbol);

    let volumeUsd = 0;
    for (let order of orders) {
      if (order.status === 'closed') {
        volumeUsd += order.price * order.amount;
      }
    }

    return {
      type: 'optimizer_coins_basket',
      name: this.name,
      isVisible: this.isVisible,
      workingBalance: 1000,
      volumeUsd: volumeUsd,
      ordersCount: orders.length,
      //profitChart: result,
      profitChart: optimizerChartData,
      data: {},
    };
  };
}

export interface ReportChartOptions {
  maxPoints?: number;
  aggPeriod?: number;
  chartType?: ChartType;
  layoutIndex?: number;
}

export enum ChartType {
  Line = 'line',
  Area = 'area',
}

type LinesInfo = Record<string, LineInfo>;

interface LineInfo {
  name: string;
  aggType: AggType | 'none';
  color: string;
}
