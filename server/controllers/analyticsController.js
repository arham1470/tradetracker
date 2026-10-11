import Trade from '../models/Trade.js';
import { aggregateInstruments, aggregateStrategies, aggregateSummary } from '../utils/analytics.js';
import { parseDate } from '../utils/queryHelpers.js';
import { ApiError } from '../utils/errors.js';

/** Filter trades by instrument + optional date range (used by all analytics). */
function analyticsFilter(query) {
  const filter = {};

  if (query.instrument) filter.instrument = query.instrument;

  const from = parseDate(query.startDate);
  const to = parseDate(query.endDate);
  if (from || to) {
    filter.tradeDate = {};
    if (from) filter.tradeDate.$gte = new Date(from.setHours(0, 0, 0, 0));
    if (to) filter.tradeDate.$lte = new Date(to.setHours(23, 59, 59, 999));
  }

  return filter;
}

/**
 * GET /api/analytics/summary
 * Full dashboard metrics: headline stats, equity curve, monthly breakdown.
 */
export async function getSummary(req, res) {
  const trades = await Trade.find(analyticsFilter(req.query)).sort({ tradeDate: 1 }).lean();
  res.json(aggregateSummary(trades));
}

/** GET /api/analytics/instruments — outcome & R metrics per instrument. */
export async function getInstruments(req, res) {
  const trades = await Trade.find(analyticsFilter(req.query)).lean();
  res.json({ instruments: aggregateInstruments(trades) });
}

/** GET /api/analytics/strategies — outcome & R metrics per strategy. */
export async function getStrategies(req, res) {
  const trades = await Trade.find(analyticsFilter(req.query)).lean();
  const strategies = aggregateStrategies(trades);
  strategies.sort((a, b) => b.netR - a.netR || b.trades - a.trades);
  res.json({ strategies });
}

/** Validate a known instrument when provided. */
export function assertValidInstrument(req, _res, next) {
  if (req.query.instrument) {
    const known = ['EURUSD', 'XAUUSD', 'AUDUSD'];
    if (!known.includes(req.query.instrument)) {
      return next(new ApiError(400, `Unknown instrument "${req.query.instrument}".`));
    }
  }
  next();
}