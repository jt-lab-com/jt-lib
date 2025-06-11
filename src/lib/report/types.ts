import { ReportChartOptions } from './widgets/report-chart';

export type AggType = 'last' | 'min' | 'max' | 'sum' | 'avg';

export interface ExtendedReportChartOptions extends ReportChartOptions {
  lineColor?: string;
}
