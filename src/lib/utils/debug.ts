import { objectGetAllProperties } from './object';
import { log } from '../core/log';

export function objectFindPromise(obj: any): string[] {
  const paths: string[] = [];
  const seen: any[] = [];

  const isPromise = (v: any): v is Promise<any> =>
    !!v && (typeof v === 'object' || typeof v === 'function') && typeof (v as any).then === 'function';

  const walk = (value: any, path: string) => {
    if (isPromise(value)) {
      paths.push(path || '');
      return;
    }

    if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;

    // защита от циклов
    if (seen.includes(value)) return;
    seen.push(value);

    // массивы
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        walk(value[i], path ? `${path}[${i}]` : `[${i}]`);
      }
      return;
    }

    const keys = objectGetAllProperties(value);
    for (const key of keys) {
      try {
        walk(value[key], path ? `${path}.${key}` : key);
      } catch {
        // игнорируем ошибки при доступе к свойству
      }
    }
  };

  walk(obj, '');
  return paths;
}

export function objectFindInvalidNumbers(obj: any): string[] {
  const paths: string[] = [];
  const seen: any[] = [];

  const isInvalidNumber = (v: any): v is number => typeof v === 'number' && !Number.isFinite(v); // true для NaN, +Infinity, -Infinity

  const walk = (value: any, path: string) => {
    if (isInvalidNumber(value)) {
      paths.push(path || '');
      return;
    }

    if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;

    // защита от циклов
    if (seen.includes(value)) return;
    seen.push(value);

    // массивы
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        walk(value[i], path ? `${path}[${i}]` : `[${i}]`);
      }
      return;
    }

    const keys = objectGetAllProperties(value);
    // log('objectFindInvalidNumbers', 'walk', { class: value.constructor.name, path, keys }, true);

    for (const key of keys) {
      try {
        walk(value[key], path ? `${path}.${key}` : key);
      } catch {
        // игнорируем ошибки при доступе к свойству
      }
    }
  };

  walk(obj, '');
  return paths;
}
