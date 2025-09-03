import { BaseError } from '../core/errors';

// export function errorContext(e: Error | BaseError, context: any): BaseError {
//   let line = new Error().stack.split('\n')[2];
//   if (e instanceof BaseError) {
//     e.addContext(line, context);
//   } else {
//     return new BaseError(e, context);
//   }
//
//   return e;
// }
