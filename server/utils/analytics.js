/**
 * Pure analytics aggregation helpers.
 *
 * All functions operate on plain arrays of trade objects, so they can be
 * unit-tested without a database and composed behind the analytics routes.
 * Breakeven trades count toward the total but never toward wins or losses.
 * Metrics that cannot be meaningfully computed resolve to `null` (the API
 * layer serialises those as N/A) — never NaN/Infinity.
 */

import { round } from './calculations.js';

const sum = (values) => values.reduce((acc, value) => acc + value, 0);
const mean = (values) => (values.length ? sum(values) / values.length : null);

/** Build the cumulative-R equity curve ordered by trade date. */
export function buildEquityCurve(trades) {
  const sorted = [...trades].sort((a, b) => {
    const da = new Date(a.tradeDate).getTime();
    const db = new Date(b.tradeDate).getTime();
    if (da !== db) return da - db;
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  });

  let running = 0;
  return sorted.map((trade) => {
    running = round(running + Number(trade.actualR || 0), 2);
    return {
      id: trade._id ? String(trade._id) : null,
      date: trade.tradeDate,
      instrument: trade.instrument,
      strategy: trade.strategy,
      actualR: round(Number(trade.actualR || 0), 2),
      netR: running,
    };
  });
}

/** Maximum peak-to-trough decline of the cumulative-R curve. */
export function computeMaxDrawdown(curve) {
  if (!Array.isArray(curve) || curve.length === 0) return null;
  let peak = 0; // equity curve starts at 0R
  let maxDrawdown = 0;
  for (const point of curve) {
    if (point.netR > peak) peak = point.netR;
    const drawdown = peak - point.netR;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  return round(maxDrawdown, 2);
}

/** Aggregate statistics per month (YYYY-MM buckets). */
export function aggregateMonthly(trades) {
  const buckets = new Map();

  for (const trade of trades) {
    const date = new Date(trade.tradeDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        label: date.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        trades: 0,
        wins: 0,
        losses: 0,
        totalR: 0,
      });
    }
    const bucket = buckets.get(key);
    bucket.trades += 1;
    bucket.totalR = round(bucket.totalR + Number(trade.actualR || 0), 2);
    if (trade.outcome === 'WIN') bucket.wins += 1;
    if (trade.outcome === 'LOSS') bucket.losses += 1;
  }

  return [...buckets.values()]
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      trades: bucket.trades,
      wins: bucket.wins,
      losses: bucket.losses,
      winRate: bucket.trades ? round((bucket.wins / bucket.trades) * 100, 1) : null,
      netR: bucket.totalR,
    }));
}
/** Core summary metrics computed from a set of closed trades. */
export function aggregateSummary(trades) {
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.outcome === 'WIN');
  const losingTrades = trades.filter((t) => t.outcome === 'LOSS');
  const breakevenTrades = trades.filter((t) => t.outcome === 'BREAKEVEN');

  const allR = trades.map((t) => Number(t.actualR || 0));
  const winRs = winningTrades.map((t) => Number(t.actualR));
  const lossRs = losingTrades.map((t) => Number(t.actualR));
  const positiveRs = allR.filter((value) => value > 0);
  const negativeRs = allR.filter((value) => value < 0);

  const winRate = totalTrades ? round((winningTrades.length / totalTrades) * 100, 2) : null;
  const netR = totalTrades ? round(sum(allR), 2) : null;
  const avgR = totalTrades ? round(sum(allR) / totalTrades, 2) : null;
  const avgWinR = winningTrades.length ? round(mean(winRs), 2) : null;
  const avgLossR = losingTrades.length ? round(mean(lossRs), 2) : null;

  // Profit factor — guard the zero-loss scenario:
  // positive ÷ |negative|; null (N/A) instead of Infinity when losses are 0.
  const positiveSum = sum(positiveRs);
  const negativeAbsSum = Math.abs(sum(negativeRs));
  let profitFactor = null;
  if (negativeAbsSum > 0 && positiveSum > 0) {
    profitFactor = round(positiveSum / negativeAbsSum, 2);
  } else if (negativeAbsSum > 0) {
    profitFactor = 0; // only losses on record
  }
  // else: only wins / all breakeven => N/A (no meaningful ratio)

  // Expectancy = (winRate × avgWin) − (lossRate × |avgLoss|), decimal rates.
  let expectancy = null;
  if (totalTrades && avgWinR != null && avgLossR != null) {
    const winRateDec = winningTrades.length / totalTrades;
    const lossRateDec = losingTrades.length / totalTrades;
    expectancy = round(winRateDec * avgWinR - lossRateDec * Math.abs(avgLossR), 2);
  }

  const equityCurve = buildEquityCurve(trades);

  return {
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    breakevenTrades: breakevenTrades.length,
    winRate,
    netR,
    avgR,
    avgWinR,
    avgLossR,
    profitFactor,
    expectancy,
    maxDrawdownR: computeMaxDrawdown(equityCurve),
    equityCurve,
    monthly: aggregateMonthly(trades),
    demoTrades: trades.filter((t) => t.isDemo).length,
  };
}

/** Group trade metrics by any field, e.g. instrument or strategy. */
export function groupMetrics(trades, groupBy) {
  const groups = new Map();

  for (const trade of trades) {
    const name = String(trade[groupBy] ?? 'Unknown');
    if (!groups.has(name)) {
      groups.set(name, { name, trades: 0, wins: 0, losses: 0, breakevens: 0, totalR: 0, winRs: [], lossRs: [] });
    }
    const group = groups.get(name);
    group.trades += 1;
    group.totalR = round(group.totalR + Number(trade.actualR || 0), 2);
    if (trade.outcome === 'WIN') {
      group.wins += 1;
      group.winRs.push(Number(trade.actualR));
    } else if (trade.outcome === 'LOSS') {
      group.losses += 1;
      group.lossRs.push(Number(trade.actualR));
    } else {
      group.breakevens += 1;
    }
  }

  return [...groups.values()]
    .map((group) => ({
      name: group.name,
      trades: group.trades,
      wins: group.wins,
      losses: group.losses,
      breakevens: group.breakevens,
      winRate: group.trades ? round((group.wins / group.trades) * 100, 1) : null,
      avgWinR: group.winRs.length ? round(mean(group.winRs), 2) : null,
      avgLossR: group.lossRs.length ? round(mean(group.lossRs), 2) : null,
      netR: group.totalR,
      avgR: group.trades ? round(group.totalR / group.trades, 2) : null,
    }))
    .sort((a, b) => b.netR - a.netR);
}

export const aggregateInstruments = (trades) => groupMetrics(trades, 'instrument');
export const aggregateStrategies = (trades) => groupMetrics(trades, 'strategy');