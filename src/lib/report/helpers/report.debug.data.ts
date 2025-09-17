import { globals } from '../../core/globals';
import { BaseObject } from '../../core/base-object';
import { EventEmitter, TriggerService } from '../../events';
import { TriggerTask } from '../../events/triggers/types';
import { PriceTriggerDirection, PriceTriggerTask } from '../../events/triggers/price/types';
import { normalize, percentDifference } from '../../utils/numbers';
import { TimeTriggerTask } from '../../events/triggers/time/types';
import { currentTime, timeToString } from '../../utils/date-time';
import { error, logOnce } from '../../core/log';
import { uniqueId } from '../../core/base';

export const debugAllPositions = async () => {
  globals.report.clearTable('🪲ALL Positions');

  let positions = (await getPositions()).map((pos) => {
    pos['info'] = undefined;
    return pos;
  });

  globals.report.tableUpdate('🪲ALL Positions', positions as any);
};

export const debugAllTriggers = () => {
  // Triggers info
  globals.report.clearTable('🪲ALL Open Triggers');
  globals.report.clearTable('🪲ALL Closed Triggers');

  let triggerTasksOpen = [];
  let triggerTasksClosed = [];

  let types = {};
  let typesBase = {};
  for (let objId in globals._objects) {
    const obj = globals._objects[objId];

    const type = obj?.constructor?.name;
    if (obj instanceof BaseObject) typesBase[objId] = type;
    types[objId] = type + ' ' + obj._isDestroyed;

    if (!(obj instanceof TriggerService)) continue;

    const formatTasks = (task: TriggerTask) => {
      const newId = `${objId} ${task.id}#` + uniqueId(2);
      let toExecute = '';
      try {
        switch (task.type) {
          case 'price':
            const priceTask = task as PriceTriggerTask;

            let percentDiff = percentDifference(priceTask.triggerPrice, close(priceTask.symbol), false);
            if (priceTask.direction === PriceTriggerDirection.DownToUp)
              percentDiff = percentDifference(close(priceTask.symbol), priceTask.triggerPrice, false);

            toExecute = `${normalize(percentDiff, 2)}%`;

            break;
          case 'time':
            const timeTask = task as TimeTriggerTask;
            const min = normalize((timeTask.triggerTime - currentTime()) / 1000 / 60, 1);
            toExecute = Math.abs(min) > 1 ? `${min} min` : `${normalize(min, 1) * 60} sec`;
            break;
        }
      } catch (e) {
        error(e, { task });
      }
      return { toExecute, ...task, id: newId, isDestroyed: obj?._isDestroyed ?? 'no prop' };
    };

    const activeTasks = obj.getActiveTasks().map(formatTasks);
    const inactiveTasks = obj.getInactiveTasks().map(formatTasks);

    triggerTasksOpen = triggerTasksOpen.concat(activeTasks);
    triggerTasksClosed = triggerTasksClosed.concat(inactiveTasks);
  }
  //  log('BasketsReportLayout::debugAllTriggers', 'types', { types }, true);
  //  log('BasketsReportLayout::debugAllTriggers', 'typesBase', { typesBase }, true);

  globals.report.tableUpdate('🪲ALL Open Triggers', triggerTasksOpen as any);
  globals.report.tableUpdate('🪲ALL Closed Triggers', triggerTasksClosed as any);
};

export const debugAllEvents = () => {
  globals.report.clearTable('🪲ALL Events');

  let events = [];

  for (let objId in globals._objects) {
    const obj = globals._objects[objId];
    if (!(obj instanceof EventEmitter)) continue;
    const listeners = obj.getListeners().map((listener) => ({
      ...listener,
      id: `${objId}-${listener.id}`,
      ownerId: listener.owner?.id,
      owner: undefined,
    }));

    events = events.concat(listeners);
  }

  globals.report.tableUpdate('🪲ALL Events', events as any);
};

export const debugSystemUsage = () => {
  let sysInfo = systemUsage();
  globals.report.chartAddPointAgg('🪲System Usage', 'CPU', sysInfo?.cpu ?? null, 'max', {
    maxPoints: 1440,
    aggPeriod: 1000 * 60,
  });
  globals.report.chartAddPointAgg('🪲System Usage', 'CPU avg', sysInfo?.cpu ?? null, 'avg');
  globals.report.chartAddPointAgg('🪲System Usage', 'Memory', sysInfo?.memory ?? null, 'max');
  logOnce('🪲System Usage', 'System Usage', sysInfo);
};

export const debugCheckAllObjects = () => {
  let objects = [];

  const getProps = (obj: object) => {
    let props = {};
    if (!obj) return props;
    for (let prop in obj) {
      if (typeof obj[prop] === 'function') continue;

      if (typeof obj[prop] === 'string' || typeof obj[prop] === 'boolean' || typeof obj[prop] === 'number') {
        props[prop] = obj[prop];
      } else if (typeof obj[prop] === 'undefined' || obj[prop] === null) {
        props[prop] = obj[prop] + '';
      } else {
        props[prop] = typeof obj[prop];
      }
    }
    return props;
  };
  for (let objId in globals._objects) {
    const obj = globals._objects[objId];
    let objInfo = {
      id: objId,
      created: timeToString(obj._created),
      type: obj?.constructor?.name,
      isDestroyed: obj?._isDestroyed ?? ' - ',
      symbol: obj?.symbol ?? '-',
      props: getProps(obj),
    };

    objects.push(objInfo);
  }

  globals.report.tableUpdate('🪲ALL Objects', objects as any);
};
