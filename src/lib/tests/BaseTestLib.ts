import { BaseScript } from '../script';
import { testReport } from './helpers/testsReport';
import { log } from '../core/log';
import { globals } from '../core/globals';
import { BaseError } from '../core/errors';

export class BaseTestLib extends BaseScript {
  name = 'Base Test';
  async onInit() {
    if (!isTester()) {
      throw new BaseError('BaseTestLib:onInit This script can be run only in tester mode');
    }
    await super.onInit();
    const className = this.constructor.name;
    log('BaseTestLib:onInit', className, { symbols: this.symbols });
  }
  async onStop(): Promise<void> {
    testReport(this.name);
    await super.onStop();
    await globals.report.updateReport();
  }
}
