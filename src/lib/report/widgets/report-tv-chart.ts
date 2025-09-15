import { ReportWidget } from './report-widget';

export class ReportTVChart extends ReportWidget {
  async prepareDataToReport(): TVChartReportBlock {
    return {
      name: '',
      type: 'trading_view_chart',
      isVisible: true,
      data: {},
    };
  }
}
