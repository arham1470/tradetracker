/**
 * `datasetSlice(trades, range, instrument)` picks, per dashboard/analytics page,
 * the same slice that the backend analytics endpoints compute:
 *   1. date filter (range days back / 0 = all)
 *   2. instrument filter (null = all)
 * This keeps charts and card filters consistent offline, while all
 * authoritative numbers still come from the server.
 */

export function toDateString(date) {
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function datasetSlice(trades, range, instrument) {
  let sliced = Array.isArray(trades) ? trades : [];

  if (instrument) {
    sliced = sliced.filter((trade) => trade.instrument === instrument);
  }

  if (range && Number(range) > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(range));
    cutoff.setHours(0, 0, 0, 0);
    sliced = sliced.filter((trade) => new Date(trade.tradeDate).getTime() >= cutoff.getTime());
  } else if (range === 'none') {
    sliced = sliced.filter((trade) => Number.isFinite(Number(trade.actualR)));
  }

  return sliced;
}

/** Add offsets that make seeded/backtested data exercise realistic dates. */
export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}