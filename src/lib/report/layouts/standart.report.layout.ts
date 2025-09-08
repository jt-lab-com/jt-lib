import { BaseObject } from '../../core/base-object';
import { TesterReportLayout } from './tester.report.layout';
import { RuntimeReportLayout } from './runtime.report.layout';
import { globals } from '../../core/globals';
import { DebugReportLayout } from './debug.report.layout';

export class StandardReportLayout extends BaseObject {
  version = '2.08';

  private layout: TesterReportLayout | RuntimeReportLayout;
  private debugLayout: DebugReportLayout;

  constructor(
    args = {
      isByTimer: false,
    },
  ) {
    super(args);

    if (isTester()) {
      this.layout = new TesterReportLayout(args);
    } else {
      this.layout = new RuntimeReportLayout(args);
    }

    if (globals.isDebug) {
      this.debugLayout = new DebugReportLayout();
    }
  }
  async init() {}
}
