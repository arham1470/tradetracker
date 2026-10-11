/** Shared constants used by forms, tables and filters. */

export const INSTRUMENTS = [
  { value: 'EURUSD', label: 'EURUSD' },
  { value: 'XAUUSD', label: 'XAUUSD · Gold' },
  { value: 'AUDUSD', label: 'AUDUSD' },
];

export const DIRECTIONS = [
  { value: 'BUY', label: 'Buy' },
  { value: 'SELL', label: 'Sell' },
];

export const TIMEFRAMES = [
  { value: 'M1', label: 'M1' },
  { value: 'M5', label: 'M5' },
  { value: 'M15', label: 'M15' },
  { value: 'M30', label: 'M30' },
  { value: 'H1', label: 'H1' },
  { value: 'H4', label: 'H4' },
  { value: 'D1', label: 'D1' },
];

export const SESSIONS = [
  { value: 'ASIA', label: 'Asian' },
  { value: 'LONDON', label: 'London' },
  { value: 'NEW_YORK', label: 'New York' },
  { value: 'OTHER', label: 'Other' },
];

export const OUTCOMES = [
  { value: 'WIN', label: 'Win' },
  { value: 'LOSS', label: 'Loss' },
  { value: 'BREAKEVEN', label: 'Breakeven' },
];

/** Human-friendly versions of enum values for display purposes. */
export const FORMAT_LABELS = {
  EURUSD: 'EURUSD',
  XAUUSD: 'XAUUSD',
  AUDUSD: 'AUDUSD',
  BUY: 'Buy',
  SELL: 'Sell',
  WIN: 'Win',
  LOSS: 'Loss',
  BREAKEVEN: 'Breakeven',
  ASIA: 'Asian',
  LONDON: 'London',
  NEW_YORK: 'New York',
  OTHER: 'Other',
};

/** Short time-ago ranges used by the dashboard filter. */
export const RANGE_PRESETS = [
  { value: 'all', label: 'All time' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last 12 months' },
];