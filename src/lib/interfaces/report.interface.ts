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
    | 'text'
    | 'chart_playback';

  type ReportBlockData =
    | TableRow[]
    | CardData
    | ChartData
    | Record<string, unknown>
    | ActionButtonData
    | TextData
    | TVChartData
    | PlaybackChartSymbolData;

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

  interface TVChartData {
    symbol: string;
    startTime: number;
    endTime: number;
    interval: string;
    visibleRange?: PlaybackChartVisibleRange;
    shapes?: PlaybackChartShape[];
    priceLines?: PlaybackChartPriceLine[];
    indicators?: LineSeries[];
    oscillators?: LineSeries[];
    height?: number;
    width?: number;
  }

  interface PlaybackChartVisibleRange {
    from: number;
    to: number;
  }

  interface PlaybackChartShape {
    id?: string;
    shape?: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
    text?: string;
    renderTime: number;
    position: 'aboveBar' | 'belowBar' | 'inBar';
    options?: PlaybackChartShapeOptions;
  }

  interface PlaybackChartShapeOptions {
    color?: string;
    size?: number;
  }

  interface PlaybackChartPriceLine {
    id?: string;
    renderTime: number;
    price: number;
    title: string;
    options?: PlaybackChartPriceLineOptions;
  }

  interface PlaybackChartPriceLineOptions {
    color?: string;
    lineWidth?: TVChartSeriesLineWidth;
    lineStyle?: TVChartSeriesLineStyle;
    axisLabelVisible?: boolean;
  }

  interface LineSeries {
    name?: string;
    color?: string;
    lineWidth?: TVChartSeriesLineWidth;
    lineStyle?: TVChartSeriesLineStyle;
    lineType?: TVChartSeriesLineType;
    data: Array<{ time: number; value: number }>;
  }

  export type TVChartSeriesLineWidth = 1 | 2 | 3 | 4;
  export enum TVChartSeriesLineStyle {
    Solid = 0,
    Dotted = 1,
    Dashed = 2,
    LargeDashed = 3,
    SparseDotted = 4,
  }
  export enum TVChartSeriesLineType {
    Simple = 0,
    WithSteps = 1,
    Curved = 2,
  }

  interface PlaybackChartSymbolData {
    startTime: number;
    endTime: number;
    symbol: string;
    interval: string;
    visibleRange?: PlaybackChartVisibleRange;
    shapes?: PlaybackChartShape[];
    priceLines?: PlaybackChartPriceLine[];
    cards?: PlaybackChartCard[];
  }

  type PlaybackChartCard<T extends CardType = CardType> = T extends CardType.Text
    ? PlaybackChartTextCard
    : T extends CardType.Formula
      ? PaybackChartFormulaCard
      : T extends CardType.Date
        ? PlaybackChartDateCard
        : T extends CardType.Currency
          ? PlaybackChartCurrencyCard
          : never;

  interface PlaybackChartBaseCard {
    id?: string;
    title: string;
    renderTime: number;
  }

  interface PlaybackChartTextCard extends PlaybackChartBaseCard {
    type: CardType.Text;
    value: string;
    // options?: unknown;
  }

  interface PaybackChartFormulaCard extends PlaybackChartBaseCard {
    type: CardType.Formula;
    value: string;
    options?: FormulaOptions;
  }

  export interface FormulaOptions {
    precision?: number;
    prefix?: string;
    suffix?: string;
  }

  interface PlaybackChartDateCard extends PlaybackChartBaseCard {
    type: CardType.Date;
    value: number | string;
    options?: DateOptions;
  }

  export interface DateOptions {
    format?: string;
  }

  interface PlaybackChartCurrencyCard extends PlaybackChartBaseCard {
    type: CardType.Currency;
    value: number;
    options?: CurrencyOptions;
  }

  export interface CurrencyOptions {
    currency?: string;
  }

  export enum CardType {
    Text = 'text',
    Formula = 'formula',
    Date = 'date',
    Currency = 'currency',
  }

  export type ActionButtonReportBlock = GenericReportBlock<'action_button', ActionButtonData>;
  export type TableDataReportBlock = GenericReportBlock<'table', TableRow[]>;
  export type CardDataReportBlock = GenericReportBlock<'card', CardData>;
  export type ChartDataReportBlock = GenericReportBlock<'chart', ChartData>;
  export type OptimizerResultsReportBlock = GenericReportBlock<'optimizer_results', Record<string, unknown>>;
  export type TextReportBlock = GenericReportBlock<'text', TextData>;
  export type TVChartReportBlock = GenericReportBlock<'trading_view_chart', TVChartData>;
  export type TVChartPlayerReportBlock = GenericReportBlock<'chart_playback', PlaybackChartSymbolData>;

  export interface ReportData {
    id: string;
    symbol: string;
    description?: string;
    blocks: ReportBlock[];
  }
}
