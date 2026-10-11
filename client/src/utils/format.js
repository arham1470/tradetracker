/** Formatting helpers with safe fallbacks for null/undefined. */

export function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatR(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
  const number = Number(value);
  const sign = number > 0 ? '+' : '';
  return `${sign}${number.toFixed(digits)}R`;
}

export function formatSignNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
  const number = Number(value);
  const sign = number > 0 ? '+' : '';
  return `${sign}${number.toFixed(digits)}`;
}

export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
  return `${Number(value).toFixed(digits)}%`;
}

export function formatPrice(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const number = Number(value);
  // XAUUSD prices use 2 decimals, FX pairs 5.
  const decimals = number >= 100 ? 2 : 5;
  return number.toFixed(decimals);
}

/** Format a money amount (USD) — "—" style fallback, optional +/- sign. */
export function formatMoney(value, { showSign = false, fallback = '—' } = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return fallback;
  const number = Number(value);
  const sign = number < 0 ? '-' : showSign && number > 0 ? '+' : '';
  return `${sign}$${Math.abs(number).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Value for <input type="date"> (YYYY-MM-DD local time, no UTC shift). */
export function toDateInputValue(date) {
  if (!date) return '';
  const d = new Date(date);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** Return the sign class used for R values across cards/tables. */
export function signClass(value) {
  const number = Number(value);
  if (Number.isNaN(number) || number === 0) return 'text-neutral-400';
  return number > 0 ? 'text-positive' : 'text-negative';
}