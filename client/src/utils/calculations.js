/**
 * Client-side mirror of the server calculation utilities.
 *
 * Used ONLY for the live form preview. The server always recomputes
 * actualR / plannedRR / outcome before storing a trade — never trust
 * client-submitted derived values.
 */

export function round(value, decimals = 2) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

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

export function computePlannedRR(direction, entryPrice, stopLoss, takeProfit) {
  if (takeProfit == null || takeProfit === '' || Number.isNaN(Number(takeProfit))) return null;
  const entry = Number(entryPrice);
  const stop = Number(stopLoss);
  const target = Number(takeProfit);

  const risk = direction === 'BUY' ? entry - stop : stop - entry;
  const reward = direction === 'BUY' ? target - entry : entry - target;
  if (risk <= 0 || reward <= 0) return null;
  return round(reward / risk, 2);
}

export function deriveOutcome(actualR) {
  if (actualR == null || Number.isNaN(Number(actualR))) return null;
  if (actualR > 0) return 'WIN';
  if (actualR < 0) return 'LOSS';
  return 'BREAKEVEN';
}