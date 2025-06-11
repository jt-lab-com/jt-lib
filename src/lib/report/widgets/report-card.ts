import { AggType } from '../types';
import { ReportWidget } from './report-widget';

export class ReportCard extends ReportWidget {
  private readonly title: string;
  private readonly options: ReportCardOptions = {};
  private variant: CardVariant;
  private value: number | string;
  private sum: number;
  private cnt: number;
  private aggType: AggType;

  constructor(params: ReportCardParams) {
    super();
    this.title = params.title;
    this.variant = params.variant ?? CardVariant.Text;
    this.options = params.options ?? this.options;
    this.value = 0;
    this.sum = 0;
    this.cnt = 0;
    this.aggType = 'last';
    this.updateOptions(params.options);
  }

  setVariant(variant: CardVariant) {
    this.variant = variant;
  }

  updateOptions(options?: ReportCardOptions) {
    if (options?.format) this.options.format = options.format;
    if (options?.icon) this.options.icon = options.icon;
    if (options?.currency) this.options.currency = options.currency;
    if (options?.caption) this.options.caption = options.caption;
    this.isVisible = options?.isVisible ?? this.isVisible;
  }

  setValue(value: number | string | boolean, aggType: AggType = 'last', options?: ReportCardOptions) {
    this.updateOptions(options);

    if (typeof value !== 'number') {
      this.value = String(value);
      this.aggType = 'last';
      return;
    }

    this.aggType = aggType;

    if (aggType === 'last') {
      this.value = value;
      return;
    }

    if (aggType === 'max') {
      this.value = Math.max(+this.value, value);
      return;
    }

    if (aggType === 'min') {
      if (this.value === 0) {
        this.value = value;
      }
      this.value = Math.min(+this.value, value);
      return;
    }

    if (aggType === 'avg' || aggType === 'sum') {
      this.sum += value;
      this.cnt++;
      return;
    }
  }

  getValue() {
    if (this.aggType === 'avg') {
      return Math.round((this.sum / this.cnt) * 100) / 100;
    }

    if (this.aggType === 'sum') {
      return Math.round(this.sum * 100) / 100;
    }

    if (typeof this.value === 'number') {
      return Math.round(this.value * 100) / 100;
    }
    return this.value;
  }

  prepareDataToReport(): CardDataReportBlock {
    return {
      type: 'card',
      isVisible: this.isVisible,
      data: {
        title: this.title,
        value: this.getValue(),
        variant: this.variant,
        options: this.options,
      },
    };
  }
}

export interface ReportCardParams {
  title?: string;
  variant?: CardVariant;
  options?: ReportCardOptions;
}

export interface ReportCardOptions {
  format?: CardNumberFormat;
  currency?: string;
  icon?: string;
  caption?: string;
  isVisible?: boolean;
}

export enum CardVariant {
  Text = 'text',
  Number = 'number',
  Percent = 'percent',
}

export enum CardNumberFormat {
  Default = 'default',
  Short = 'short',
  Date = 'date',
  Currency = 'currency',
}

export enum CardIcon {
  ChartUp = 'chart-up',
  ChartDown = 'chart-down',
}
