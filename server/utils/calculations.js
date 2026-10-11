/**
 * Reusable trade calculation utilities.
 *
 * These functions are the single source of truth for every derived value
 * (planned R:R, actual R-multiple, outcome). The trade model, controllers and
 * seed script all call into here — formulas are NEVER duplicated in controllers.
 */

/** Round to a sensible number of decimals (2 for R-multiples, percents, etc.). */
export function round(value, decimals = 2) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

/**
 * Validate that the stop-loss sits on the correct side of the entry for the
 * selected direction (and take-profit on its correct side when provided).
 * Returns `{ valid: true }` or `{ valid: false, error }`.
 */
export function validatePosition(direction, entryPrice, stopLoss, takeProfit) {
  const entry = Number(entryPrice);
  const stop = Number(stopLoss);
  const target = takeProfit == null || takeProfit === '' || Number.isNaN(Number(takeProfit)) ? null : Number(takeProfit);

  if (!Number.isFinite(entry) || !Number.isFinite(stop) || entry <= 0 || stop <= 0) {
    return { valid: false, error: 'Entry and stop-loss must be positive numbers.' };
  }

  const risk = Math.abs(entry - stop);
  if (risk === 0) {
    return { valid: false, error: 'The stop-loss must not equal the entry price (risk would be zero).' };
  }

  if (direction === 'BUY') {
    if (stop >= entry) {
      return { valid: false, error: 'For BUY trades the stop-loss must be BELOW the entry price.' };
    }
    if (target != null && target <= entry) {
      return { valid: false, error: 'For BUY trades the take-profit must be ABOVE the entry price.' };
    }
  } else if (direction === 'SELL') {
    if (stop <= entry) {
      return { valid: false, error: 'For SELL trades the stop-loss must be ABOVE the entry price.' };
    }
    if (target != null && target >= entry) {
      return { valid: false, error: 'For SELL trades the take-profit must be BELOW the entry price.' };
    }
  } else {
    return { valid: false, error: 'Direction must be BUY or SELL.' };
  }

  return { valid: true };
}

/**
 * Planned risk-to-reward ratio.
 *
 *   BUY : risk  = entry − SL , reward = TP − entry
 *   SELL: risk  = SL − entry , reward = entry − TP
 *
 * Returns null when the take-profit is not provided or the ratio is not
 * meaningful (e.g. reward <= 0).
 */
export function computePlannedRR(direction, entryPrice, stopLoss, takeProfit) {
  const entry = Number(entryPrice);
  const stop = Number(stopLoss);
  if (takeProfit == null || takeProfit === '' || Number.isNaN(Number(takeProfit))) {
    return null; // optional field — no planned R:R available
  }
  const target = Number(takeProfit);

  const risk = direction === 'BUY' ? entry - stop : stop - entry;
  const reward = direction === 'BUY' ? target - entry : entry - target;
  if (risk <= 0 || reward <= 0) return null;

  return round(reward / risk, 2);
}

/**
 * Actual R-multiple based on the real exit price.
 *
 *   BUY : actualR = (exit − entry) / | entry − SL |
 *   SELL: actualR = (entry − exit) / | entry − SL |
 *
 * +2R ⇒ profit of twice initial risk, −1R ⇒ loss of one initial risk,
 * 0R ⇒ breakeven. Returns null if risk is zero.
 */
export function computeActualR(direction, entryPrice, stopLoss, exitPrice) {
  const entry = Number(entryPrice);
  const stop = Number(stopLoss);
  const exit = Number(exitPrice);

  if (!Number.isFinite(entry) || !Number.isFinite(stop) || !Number.isFinite(exit)) return null;

  const risk = Math.abs(entry - stop);
  if (risk === 0) return null;

  const move = direction === 'BUY' ? exit - entry : entry - exit;
  return round(move / risk, 2);
}

/** Derive the trade outcome from the actual R-multiple. */
export function deriveOutcome(actualR) {
  if (actualR == null || Number.isNaN(Number(actualR))) return null;
  if (actualR > 0) return 'WIN';
  if (actualR < 0) return 'LOSS';
  return 'BREAKEVEN';
}

/** Compute all derived fields for a trade in one call. */
export function computeTradeDerivatives(direction, entryPrice, stopLoss, takeProfit, exitPrice) {
  const actualR = computeActualR(direction, entryPrice, stopLoss, exitPrice);
  return {
    actualR,
    plannedRR: computePlannedRR(direction, entryPrice, stopLoss, takeProfit),
    outcome: deriveOutcome(actualR),
  };
}