/**
 * `datasetSlice(trades, filters)` picks, per dashboard/analytics page,
 * the same slice that the backend analytics endpoints compute:
 *   1. instrument filter (or 'all' / null = all)
 *   2. strategy filter (or 'all' / null = all)
 *   3. date range (range days back / 0 = all) or explicit startDate / endDate
 * This keeps charts and card filters consistent offline, while all
 * authoritative numbers still come from the server.
 */

export function toDateString(date) {
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function datasetSlice(trades, rangeOrFilters, instrumentParam, strategyParam, startDateParam, endDateParam) {
  let sliced = Array.isArray(trades) ? trades : [];

  let range = '0';
  let instrument = '';
  let strategy = '';
  let startDate = '';
  let endDate = '';

  if (rangeOrFilters && typeof rangeOrFilters === 'object') {
    range = rangeOrFilters.range ?? '0';
    instrument = rangeOrFilters.instrument ?? '';
    strategy = rangeOrFilters.strategy ?? '';
    startDate = rangeOrFilters.startDate ?? '';
    endDate = rangeOrFilters.endDate ?? '';
  } else {
    range = rangeOrFilters ?? '0';
    instrument = instrumentParam ?? '';
    strategy = strategyParam ?? '';
    startDate = startDateParam ?? '';
    endDate = endDateParam ?? '';
  }

  if (instrument && instrument !== 'all') {
    sliced = sliced.filter((trade) => trade.instrument === instrument);
  }

  if (strategy && strategy !== 'all') {
    sliced = sliced.filter((trade) => trade.strategy === strategy);
  }

  if (startDate) {
    const fromTime = new Date(startDate).setHours(0, 0, 0, 0);
    sliced = sliced.filter((trade) => new Date(trade.tradeDate).getTime() >= fromTime);
  }

  if (endDate) {
    const toTime = new Date(endDate).setHours(23, 59, 59, 999);
    sliced = sliced.filter((trade) => new Date(trade.tradeDate).getTime() <= toTime);
  }

  if (!startDate && !endDate && range && range !== '0' && range !== 'all' && Number(range) > 0) {
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