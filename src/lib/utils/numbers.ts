import { BaseError } from '../core/errors';
import { warning } from '../core/log';

const DEFAULT_TOLERANCE = 0.00000000000001;

//TODO  change all validate function to return true | false.  NOT a throw error
export const validateNumbers = (...args: any[]): boolean => {
  let i = 0;
  for (let arg of args) {
    if (!isRealNumber(arg)) {
      i++;
      warning('validateNumbers', 'All arguments must be valid numbers and not NaN. Wrong argument  № ' + i, {
        type: typeof arg,
        value: arg,
        isUndefined: arg === undefined,
        isNaN: isNaN(arg),
      });
    }
  }
  if (i > 0) return false;
  return true;
};

export const validateNumbersInObject = (obj: any): boolean => {
  if (typeof obj !== 'object') {
    throw new BaseError('The argument must be an object');
  }

  let wrongKeys = [];
  for (let key in obj) {
    if (isNaN(obj[key])) {
      wrongKeys.push({ key: key, value: obj[key], vType: typeof obj[key] });
    }
  }

  if (wrongKeys.length > 0) {
    warning('validateNumbersInObject', 'All values of the object must be valid numbers. Wrong keys: ', wrongKeys);
    return false;
  }
  return true;
};

export const isRealNumber = (number: number) => {
  return typeof number === 'number' && isFinite(number);
};

/**
 * Normalize a number to a given number of digits
 * @param number The number to normalize
 * @param digits The number of digits to normalize to
 * @returns {number} The normalized number
 * @example normalize(1.23456789, 4) // 1.2346
 */
export const normalize = (number: number, digits = 2): number => {
  if (isNaN(number) || isNaN(digits)) {
    throw new BaseError('normalize: number is NaN', { number, digits });
  }
  return parseFloat(number.toFixed(digits));
};

export const abs = (number: number): number => {
  if (isNaN(number)) {
    throw new BaseError('abs: number is NaN', { number });
  }
  return Math.abs(number);
};
/**
 * Check if a number is zero
 * @param number The number to check
 * @returns {boolean} True if the number is zero within the tolerance provided
 * @example isZero(0.000000000000005) // true
 */
export const isZero = (number: number): boolean => {
  if (isNaN(number)) {
    throw new BaseError('isZero: number or tolerance is NaN', { number });
  }
  return Math.abs(number) < DEFAULT_TOLERANCE;
};

//TODO add to manual information about tolerance why we use it

/**
 * Check if a number is equal to another number within a tolerance value
 * @param a The first number
 * @param b The second number
 * @returns {boolean} True if the numbers are equal within the tolerance provided
 * @example isEqual(1.000000000000005, 1) // true
 */

export const isEqual = (a: number, b: number): boolean => {
  if (isNaN(a) || isNaN(b)) {
    throw new BaseError('isEqual: at least one of argument is NaN', { a, b });
  }
  return Math.abs(a - b) < DEFAULT_TOLERANCE; // a 3 b 3.01 0.01 < 0.00000000000001 false
};

export const isNotEqual = (a: number, b: number): boolean => {
  if (isNaN(a) || isNaN(b)) {
    throw new BaseError('isNotEqual: at least one of argument is NaN', { a, b });
  }

  return Math.abs(a - b) > DEFAULT_TOLERANCE;
};
export const isMore = (a: number, b: number): boolean => {
  if (isNaN(a) || isNaN(b)) {
    throw new BaseError('isMore: at least one of argument is NaN', { a, b });
  }

  return a - b > DEFAULT_TOLERANCE;
};

export const isLess = (a: number, b: number): boolean => {
  if (isNaN(a) || isNaN(b)) {
    throw new BaseError('isLess: at least one of argument is NaN', { a, b });
  }
  return b - a > DEFAULT_TOLERANCE;
};

export const isBetween = (number: number, min: number, max: number): boolean => {
  if (validateNumbersInObject({ number, min, max }) === false) {
    throw new BaseError('isBetween: at least one of argument is NaN', { number, min, max });
  }
  return number >= min && number <= max;
};

/**
 * Calculate the percentage difference between two numbers
 * @param a The first number
 * @param b The second number
 * @param isAbs Whether to return the absolute value of the percentage difference
 * @returns {number} The percentage  form a to b
 * @example percentDifference(100, 90) // (100 - 90) / 100 * 100 = 10
 * @example percentDifference(90,100) // (90 - 100) / 90 * 100 = -11.11
 */
export const percentDifference = (a: number, b: number, isAbs = false): number => {
  if (isNaN(a) || isNaN(b)) {
    throw new BaseError('percentDifference: at least one of argument is NaN', { a, b });
  }

  let result = ((a - b) / a) * 100;
  return isAbs ? Math.abs(result) : result;
};

export function rand(min: number, max: number) {
  if (isNaN(min) || isNaN(max)) {
    throw new BaseError('rand: at least one of argument is NaN', { min, max });
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function max(number: number, max: number) {
  if (isNaN(number) || isNaN(max)) {
    throw new BaseError('max: at least one of argument is NaN', { number, max });
  }
  return Math.max(number, max);
}

export function min(number: number, min: number) {
  if (isNaN(number) || isNaN(min)) {
    throw new BaseError('min: at least one of argument is NaN', { number, min });
  }
  return Math.min(number, min);
}

export const numberToCurrency = (number: number, digits = 2, options = {}): string => {
  number = normalize(number, digits);
  return number.toLocaleString('en-US', options);
};
