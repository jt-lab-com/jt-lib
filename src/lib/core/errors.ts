import { currentTimeString } from '../utils/date-time';
import { getArgBoolean, uniqueId } from './base';
import { globals } from './globals';

export class BaseError extends Error {
  allContext: any[] = [];
  internalStack: string[] = [];
  id: string;

  constructor(error: Error | BaseError, context?: any);
  constructor(message: string, context?: any);
  constructor(param: string | BaseError | Error, context: any = {}) {
    const message = typeof param === 'string' ? param : param.message;
    super(message);

    let stack;

    this.id = uniqueId(2);
    if (param instanceof Error) {
      this.stack = param.stack;
      stack = param.stack.split('\n');
    } else {
      stack = this.stack.split('\n');
    }

    let line = stack[1];
    this.addContext(line, context);

    if (this.internalStack.length === 0) {
      this.internalStack = new Error().stack.split('\n');
    }
  }

  addContext(line: string, context: any = undefined) {
    if (!context) return;

    this.allContext.push({ line, context });
    if (getArgBoolean('isDebug', false)) {
      let time = currentTimeString();
      if (!globals.userData.has('glAllContext')) globals.userData.set('glAllContext', []);
      let glAllContext = globals.userData.get('glAllContext');
      glAllContext.push({ time, line, context });
    }
  }
}
