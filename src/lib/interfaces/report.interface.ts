namespace ReportTypes {
  interface GenericReportBlock<T extends ReportBlockType, D extends ReportBlockData> {
    type: T;
    name?: string;
    isVisible: boolean;
    data: D;
  }

  interface ReportBlock {
    type: ReportBlockType;
    name?: string;
    data: ReportBlockData;
  }

  type ReportBlockType =
    | 'trading_view_chart'
    | 'table'
    | 'chart'
    | 'card'
    | 'optimizer_results'
    | 'action_button'
    | 'text';
  type ReportBlockData = TableRow[] | CardData | ChartData | Record<string, unknown> | ActionButtonData | TextData;

  type TableRow = Record<string, any>;

  interface CardData {
    title: string;
    value: string | number;
    variant: CardVariant;
    options?: CardOptions;
  }

  export type CardVariant = 'text' | 'number' | 'percent';

  interface CardOptions {
    format?: CardNumberFormat;
    currency?: string;
    icon?: string;
    caption?: string;
  }

  export type CardNumberFormat = 'default' | 'currency' | 'date';

  interface ChartData {
    series: Series[];
    time: string[];
  }

  interface Series {
    name: string;
    data: number[];
  }

  interface ActionButtonData {
    title: string;
    paramName: string;
    value: string | number;
  }

  interface TextData {
    value: string;
    variant: string;
    align: string;
  }

  export type ActionButtonReportBlock = GenericReportBlock<'action_button', ActionButtonData>;
  export type TableDataReportBlock = GenericReportBlock<'table', TableRow[]>;
  export type CardDataReportBlock = GenericReportBlock<'card', CardData>;
  export type ChartDataReportBlock = GenericReportBlock<'chart', ChartData>;
  export type OptimizerResultsReportBlock = GenericReportBlock<'optimizer_results', Record<string, unknown>>;
  export type TextReportBlock = GenericReportBlock<'text', TextData>;

  export interface ReportData {
    id: string;
    symbol: string;
    description?: string;
    blocks: ReportBlock[];
  }
}
