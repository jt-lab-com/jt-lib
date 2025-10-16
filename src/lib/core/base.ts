export function uniqueId(length = 4): string {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

export function isIterable(obj: object) {
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.iterator] === 'function';
}

export function getArgNumber(argName: string, defaultValue: number, isRequired = false, args = undefined): number {
  if (!args) args = ARGS;

  if (Array.isArray(args[argName])) {
    throw new Error(`getArgNumber - user's argument "${argName}" is passed twice in scenario arguments`);
  }
  let result: number;
  if (args[argName] || args[argName] === 0) {
    result = Number(args[argName]);
    if (isNaN(result)) {
      throw new Error(`getArgNumber Argument {${argName}} is required, update scenario arguments`);
    }
  } else {
    result = defaultValue;
    if (isRequired) {
      throw new Error(`getArgNumber Argument {${argName}} is required, update scenario arguments`);
    }
  }

  return result;
}

export function getArgString(argName: string, defaultValue: string, isRequired = false, args = undefined): string {
  if (!args) args = ARGS;

  if (Array.isArray(args[argName])) {
    throw new Error(`getArgString - user argument "${argName}" is passed twice in scenario arguments`);
  }
  let result: string;

  if (args[argName]) {
    result = String(args[argName]);
  } else {
    result = defaultValue;

    if (isRequired) {
      throw new Error(`getArgString Argument {${argName}} is required, update scenario arguments`);
    }
  }

  return result;
}

export function getArgBoolean(
  argName: string,
  defaultValue: boolean = false,
  isRequired = false,
  args = undefined,
): boolean {
  if (!args) args = ARGS;

  if (Array.isArray(args[argName])) {
    throw new Error(`getArgBoolean - user argument "${argName}" is passed twice in scenario arguments`);
  }

  let result: boolean;

  if (typeof args[argName] === 'string') {
    result = args[argName].toLowerCase() === 'true';
  } else {
    if (args[argName]) {
      result = Boolean(args[argName]);
    } else {
      if (isRequired) {
        throw new Error(`getArgBoolean Argument {${argName}} is required, update scenario arguments`);
      }
      result = defaultValue;
    }
  }

  return result;
}
