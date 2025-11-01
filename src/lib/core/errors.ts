import { currentTimeString } from '../utils/date-time';
import { getArgBoolean, uniqueId } from './base';
import { globals } from './globals';

export class BaseError extends Error {
  allContext: any[] = [];
  internalStack: string[] = [];

  id: string;

  constructor(error: Error | BaseError, context?: any);
  constructor(message: string, context?: any);
  constructor(arg1: string | BaseError | Error, context: any = {}) {
    name: 'BaseError';
    const message = typeof arg1 === 'string' ? arg1 : arg1.message;
    super(message);

    let thisStack = this.stack.split('\n');

    this.id = uniqueId(2);
    if (arg1 instanceof BaseError) {
    }
    if (arg1 instanceof Error) {
      this.stack = arg1.stack;
    }

    if (arg1 instanceof BaseError) {
      if (Array.isArray(arg1.allContext)) this.allContext = arg1.allContext;
      this.internalStack = arg1.internalStack;
    }

    let line = thisStack[1];

    if (typeof context === 'object') this.addContext(line, context);

    if (this.internalStack.length === 0) {
      this.internalStack = new Error().stack.split('\n');
    }
  }

  addContext(line: string, context: any = undefined) {
    if (!context) return;
    //let stack = new Error().stack.split('\n');
    //console.log('Adding error context:', { line, context, id: this.id, stack });
    this.allContext.push({ line, context });

    if (getArgBoolean('isDebug', false)) {
      let time = currentTimeString();
      if (!globals.userData.has('glAllContext')) globals.userData.set('glAllContext', []);
      let glAllContext = globals.userData.get('glAllContext');
      glAllContext.push({ time, line, context });
    }
  }
}
