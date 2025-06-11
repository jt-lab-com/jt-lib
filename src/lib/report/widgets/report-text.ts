import { ReportWidget } from './report-widget';

type TextVariant = 'body1' | 'body2' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2' | 'caption';
type TextAlignment = 'left' | 'center' | 'right';

export interface TextOptions {
  variant?: TextVariant;
  align?: TextAlignment;
  isVisible?: boolean;
}

export class ReportText extends ReportWidget {
  constructor(private text: string, private variant?: TextVariant, private align?: TextAlignment) {
    super();
  }

  updateOptions(options: TextOptions) {
    if (options?.variant) this.variant = options.variant;
    if (options?.align) this.align = options.align;
    this.isVisible = options?.isVisible ?? this.isVisible;
  }

  setText(text: string) {
    this.text = text;
  }

  prepareDataToReport(): TextReportBlock {
    return {
      type: 'text',
      isVisible: this.isVisible,
      data: {
        value: this.text,
        variant: this.variant ?? 'body2',
        align: this.align ?? 'left',
      },
    };
  }
}
