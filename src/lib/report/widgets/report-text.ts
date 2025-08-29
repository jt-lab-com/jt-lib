import { ReportWidget } from './report-widget';
import { warning } from '../../core/log';

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

    //warning('ReportText::constructor','test');
  }

  updateOptions(options: TextOptions) {
    if (options?.variant) this.variant = options.variant;
    if (options?.align) this.align = options.align;
    this.isVisible = options?.isVisible ?? this.isVisible;
  }

  setText(text: string) {
    this.text = text;
  }

  static getBlock(text: string, variant?: TextVariant, align?: TextAlignment): TextReportBlock {
    return {
      type: 'text',
      isVisible: true,
      data: {
        value: text,
        variant: variant ?? 'body2',
        align: align ?? 'left',
      },
    };
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
