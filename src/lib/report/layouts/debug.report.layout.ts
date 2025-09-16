import { globals } from '../../core/globals';
import { BaseObject } from '../../core/base-object';
import { currentTime } from '../../utils/date-time';
import { error, log, logOnce, trace, warning } from '../../core/log';

import {
  debugAllEvents,
  debugAllPositions,
  debugAllTriggers,
  debugCheckAllObjects,
  debugSystemUsage,
} from '../helpers/report.debug.data';

export class DebugReportLayout extends BaseObject {
  private isDebugAllPositions = false;
  private isDebugAllTriggers = false;
  private isDebugAllEvents = false;
  private isDebugCheckAllObjects = false;
  private isDebugSystemUsage = false;

  private debugLayout: DebugReportLayout;

  constructor() {
    super();

    if (isTester()) {
      log('DebugReportLayout', 'DebugReportLayout is disabled in tester mode', {}, true);
    }
    globals.events.subscribe('onArgsUpdate', this.onArgsUpdate, this);
    globals.events.subscribe('onReportAction', this.onReportAction, this);
    globals.events.subscribe('onOrderChange', this.onOrderChange, this);

    log('DebugReportLayout', 'DebugReportLayout is created', { isDebug: globals.isDebug });
  }

  async onOrderChange(order) {
    globals.report.tableUpdate('👾 OnOrderChange', { ...order, _updated: new Date().toUTCString() }, '_id');
  }
  async onReportAction(data: any) {
    let { action, value } = data;

    if (action.includes('isDebug') && this[action] !== undefined) {
      this[action] = !this[action];

      await this.showData();
      await globals.report.updateReport({ isForce: true });

      // logOnce('DebugReportLayout::onReportAction', 'onReportAction', {
      //   action,
      //   value,
      //   newValue: this[action],
      //   typeof: typeof this[action],
      //   isInclude: action.includes('isDebug'),
      //   thisClass: this.constructor.name,
      // });
    }
  }

  lastTimeUpdate = 0;
  doByTimer = async () => {
    const diff = currentTime() - this.lastTimeUpdate;
    this.lastTimeUpdate = currentTime();

    try {
      await this.showData();
      if (diff < 5000) {
        await globals.report.updateReport();
      }
      setTimeout(this.doByTimer, 5000);
    } catch (e) {
      error('BasketsReportLayout::doByTimer', 'Error in doByTimer', { e, diff });
    }
  };
  isInit = false;
  init() {
    if (this.isInit || globals.isDebug === false) return;

    setTimeout(this.doByTimer);

    this.createButtons();
    this.isInit = true;

    log('DebugReportLayout', 'DebugReportLayout initialized', {}, true);
  }
  async onArgsUpdate() {
    if (!globals.isDebug) return;
  }

  createButtons() {
    globals.report.createActionButton('👾 Positions', 'isDebugAllPositions', '1');
    globals.report.createActionButton('👾 Triggers', 'isDebugAllTriggers', '1');
    globals.report.createActionButton('👾 Emitters', 'isDebugAllEvents', '1');
    globals.report.createActionButton('👾 Objects', 'isDebugCheckAllObjects', '1');
    globals.report.createActionButton('👾System Usage', 'isDebugSystemUsage', '1');
  }
  async showData() {
    if (this.isDebugAllPositions) await debugAllPositions();
    if (this.isDebugAllTriggers) debugAllTriggers();
    if (this.isDebugAllEvents) debugAllEvents();
    if (this.isDebugCheckAllObjects) debugCheckAllObjects();
    if (this.isDebugSystemUsage) debugSystemUsage();

    logOnce('DebugReportLayout::showData', 'Show debug data', {
      isDebugAllPositions: this.isDebugAllPositions,
      isDebugAllTriggers: this.isDebugAllTriggers,
      isDebugAllEvents: this.isDebugAllEvents,
      isDebugCheckAllObjects: this.isDebugCheckAllObjects,
      isDebugSystemUsage: this.isDebugSystemUsage,
    });
  }
}
