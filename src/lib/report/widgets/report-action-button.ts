import { ReportWidget } from './report-widget';

export class ReportActionButton extends ReportWidget {
  constructor(
    private readonly label: string,
    private readonly action: string,
    private payload: string | number | object,
  ) {
    super();
  }

  updatePayload(payload: string | number | object) {
    this.payload = payload;
  }

  prepareDataToReport() {
    return {
      type: 'action_button',
      isVisible: this.isVisible,
      data: {
        label: this.label,
        action: this.action,
        payload: this.payload,
      },
    };
  }
}
