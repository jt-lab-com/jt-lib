import { ReportWidget } from './report-widget';
import { globals } from '../../core/globals';
import { BaseError } from '../../core/errors';

export class ReportActionButton extends ReportWidget {
  _callback: (args: any) => Promise<any>;
  constructor(
    private readonly label: string,
    private readonly action: string,
    private payload: string | number | object,
    callback: (args: any) => Promise<any> = undefined,
  ) {
    super();

    if (callback && typeof callback !== 'function') {
      throw new BaseError('Callback must be a function', { type: typeof callback });
    }
    if (callback && typeof callback === 'function') {
      this._callback = callback;

      globals.events.subscribe('onReportAction', this.onReportAction, this);
    }
  }

  async onReportAction(data) {
    let { action, value } = data;
    if (action !== this.action) {
      return;
    }
    await this._callback(data);
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
