export function timeFormatAddZero(timestamp: number) {
  if (timestamp < 10) {
    return '0' + timestamp;
  }
  return timestamp;
}

export function currentTimeString() {
  return timeToString(currentTime());
}

export function currentTime() {
  return timeCurrent();
}

export function timeCurrent() {
  if (isTester()) {
    return tms() ?? ARGS.startDate.getTime();
  } else {
    return Date.now();
  }
}

export function serverTime() {
  return new Date().getTime();
}

export function timeToString(timestamp: number = undefined) {
  // formant YYYY-MM-DD HH:MM:SS
  if (!timestamp) timestamp = currentTime();

  const date = new Date(timestamp);
  return (
    date.getUTCFullYear() +
    '-' +
    timeFormatAddZero(date.getUTCMonth() + 1) +
    '-' +
    timeFormatAddZero(date.getUTCDate()) +
    ' ' +
    timeFormatAddZero(date.getUTCHours()) +
    ':' +
    timeFormatAddZero(date.getUTCMinutes()) +
    ':' +
    timeFormatAddZero(date.getUTCSeconds())
  );
}

export function timeToStrHms(timestamp: number): string {
  // formant HH:MM:SS
  const date = new Date(timestamp);
  return (
    timeFormatAddZero(date.getUTCHours()) +
    ':' +
    timeFormatAddZero(date.getUTCMinutes()) +
    ':' +
    timeFormatAddZero(date.getUTCSeconds())
  );
}

export function stringToTimestamp(str: string) {
  // formant YYYY-MM-DD HH:MM:SS
  const date = new Date(str);
  return date.getTime();
}
