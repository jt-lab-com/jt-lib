import { error } from '../core/log';

/**
 * Rounds timestamp to the nearest timeframe (in milliseconds)
 * @param timestamp - timestamp in milliseconds
 * @param tfMin - timeframe in minutes (1, 5, 15, 60, 240, 1440, 10080, 43200)
 * @returns {number}
 */
export function roundTimeByTimeframe(timestamp: number, tfMin: number | string): number {
  if (typeof tfMin === 'string') {
    tfMin = convertTimeframeToNumber(tfMin);
  }
  tfMin = tfMin * 60 * 1000;
  return Math.floor(timestamp / tfMin) * tfMin;
}

const timeframeMapString = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
  '1M': '1M',
  m1: '1m',
  m5: '5m',
  m15: '15m',
  m60: '1h',
  m240: '4h',
  m1440: '1d',
  m10080: '1w',
  m43200: '1M',
  h1: '1h',
  h4: '4h',
  d1: '1d',
  w1: '1w',
  M1: '1M',
};
const timeframeMapNumber = {
  '1m': 1,
  '5m': 5,
  '15m': 15,
  '1h': 60,
  '4h': 240,
  '1d': 1440,
  '1w': 10080,
  '1M': 43200,
  m1: 1,
  m5: 5,
  m15: 15,
  h1: 60,
  h4: 240,
  d1: 1440,
  w1: 10080,
  M1: 43200,
};

/**
 * Converts timeframe to string
 * @param timeframe - timeframe in minutes (1, 5, 15, 60, 240, 1440, 10080, 43200)
 * @returns {*} ('1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M')
 */
export const convertTimeframeToString = (timeframe: string | number): TimeFrame => {
  if (typeof timeframe === 'string') {
    return timeframeMapString[timeframe];
  }
  if (typeof timeframe === 'number') {
    return timeframeMapString[`m${timeframe}`];
  }
};

export const convertTimeframeToNumber = (timeframe: string | number): number => {
  if (typeof timeframe === 'string') {
    return timeframeMapNumber[timeframe];
  }
  if (typeof timeframe === 'number') {
    if (timeframeMapString[`m${timeframe}`]) return timeframe;
    else {
      error('convertTimeframeToNumber', `Timeframe ${timeframe} is not supported`);
      return null;
    }
  }
};

export function calculateCandlesInMonth(timeStart: number, tfMin = 1) {
  let date = new Date(timeStart);

  let startOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  let startOfMonthTimestamp = startOfMonth.getTime();

  let endOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  let endOfMonthTimestamp = endOfMonth.getTime() + 24 * 60 * 60 * 1000;

  // _consoleInfo(
  //   'calculateCandlesInMonth',
  //   'start ',
  //   timeToString(startOfMonthTimestamp),
  //   'end ',
  //   timeToString(endOfMonthTimestamp),
  // );

  return Math.ceil((endOfMonthTimestamp - startOfMonthTimestamp) / (tfMin * 60 * 1000));
}
