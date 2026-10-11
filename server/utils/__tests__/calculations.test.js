/**
 * Zero-dependency unit tests for calculations.js and analytics.js.
 * Run with:  npm run test:calc
 * (Node's built-in node:test runner — no extra dependencies needed.)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeActualR,
  computePlannedRR,
  computeTradeDerivatives,
  deriveOutcome,
  round,
  validatePosition,
} from '../calculations.js';
import { aggregateSummary, buildEquityCurve, computeMaxDrawdown, aggregateInstruments } from '../analytics.js';

// ---------------------------------------------------------------- calculations

test('round handles decimals and edge values', () => {
  assert.equal(round(1.005, 2), 1.01);
  assert.equal(round(2), 2);
  assert.equal(round(null), null);
  assert.equal(round('abc'), null);
});

test('planned R:R for BUY', () => {
  // entry 1.1000, SL 1.0900 (risk 100 pips), TP 1.1300 (reward 300 pips) => 3
  assert.equal(computePlannedRR('BUY', 1.1, 1.09, 1.13), 3);
  assert.equal(computePlannedRR('BUY', 1.1, 1.09, null), null);
});

test('planned R:R for SELL', () => {
  // entry 2315.0, SL 2325.0, TP 2290.0 => 25/10 = 2.5
  assert.equal(computePlannedRR('SELL', 2315, 2325, 2290), 2.5);
});

test('actual R for BUY wins and losses', () => {
  // entry 1.1000, SL 1.0900 => risk 0.01 (kind of, 100 pips)
  assert.equal(computeActualR('BUY', 1.1, 1.09, 1.13), 3); // +3R
  assert.equal(computeActualR('BUY', 1.1, 1.09, 1.09), -1); // full loss
  assert.equal(computeActualR('BUY', 1.1, 1.09, 1.1), 0); // breakeven
});

test('actual R for SELL', () => {
  assert.equal(computeActualR('SELL', 1.1, 1.11, 1.07), 3);
  assert.equal(computeActualR('SELL', 1.1, 1.11, 1.11), -1);
});

test('actual R handles zero risk', () => {
  assert.equal(computeActualR('BUY', 1.1, 1.1, 1.12), null);
});

test('outcome derivation', () => {
  assert.equal(deriveOutcome(2), 'WIN');
  assert.equal(deriveOutcome(-1), 'LOSS');
  assert.equal(deriveOutcome(0), 'BREAKEVEN');
  assert.equal(deriveOutcome(null), null);
});

test('position validation', () => {
  assert.deepEqual(validatePosition('BUY', 1.1, 1.09, 1.12), { valid: true });
  assert.equal(validatePosition('BUY', 1.1, 1.11, 1.12).valid, false); // SL above entry
  assert.equal(validatePosition('SELL', 1.1, 1.09, 1.12).valid, false); // SL below entry
  assert.equal(validatePosition('BUY', 1.1, 1.09, 1.09).valid, false); // TP <= entry
  assert.equal(validatePosition('BUY', 1.1, 1.1, 1.12).valid, false); // zero risk
  assert.equal(validatePosition('BUY', 0, 1, 1.2).valid, false); // non-positive prices
});

test('computeTradeDerivatives returns everything', () => {
  const result = computeTradeDerivatives('BUY', 1.1, 1.09, 1.13, 1.13);
  assert.deepEqual(result, { plannedRR: 3, actualR: 3, outcome: 'WIN' });
});

// ------------------------------------------------------------------ analytics

const t = (id, date, actualR, instrument = 'EURUSD', strategy = 'Test', outcomeOverride) => ({
  _id: id,
  tradeDate: new Date(date),
  actualR,
  instrument,
  strategy,
  outcome: outcomeOverride || (actualR > 0 ? 'WIN' : actualR < 0 ? 'LOSS' : 'BREAKEVEN'),
  createdAt: new Date(date),
  isDemo: false,
});

test('summary metrics on mixed dataset', () => {
  const trades = [t('1', '2024-01-10', 2), t('2', '2024-01-11', -1), t('3', '2024-01-12', 0), t('4', '2024-01-13', -1)];
  const s = aggregateSummary(trades);
  assert.equal(s.totalTrades, 4);
  assert.equal(s.winningTrades, 1);
  assert.equal(s.losingTrades, 2);
  assert.equal(s.breakevenTrades, 1);
  assert.equal(s.winRate, 25);
  assert.equal(s.netR, 0);
  assert.equal(s.avgR, 0);
  assert.equal(s.avgWinR, 2);
  assert.equal(s.avgLossR, -1);
  assert.equal(s.profitFactor, 1); // 2 / |−2|
  assert.equal(s.expectancy, 0); // (0.25 × 2) − (0.5 × 1)
});

test('all-breakeven dataset yields N/A metrics without NaN/Infinity', () => {
  const s = aggregateSummary([t('1', '2024-01-10', 0), t('2', '2024-01-11', 0)]);
  assert.equal(s.totalTrades, 2);
  assert.equal(s.breakevenTrades, 2);
  assert.equal(s.winRate, 0);
  assert.equal(s.profitFactor, null);
  assert.equal(s.expectancy, null);
  assert.equal(s.maxDrawdownR, 0);
  assert.equal(Number.isNaN(s.profitFactor), false);
  assert.equal(Number.isFinite(s.netR), true);
});

test('empty dataset', () => {
  const s = aggregateSummary([]);
  assert.equal(s.totalTrades, 0);
  assert.equal(s.netR, null);
  assert.equal(s.winRate, null);
  assert.equal(s.profitFactor, null);
  assert.equal(s.maxDrawdownR, null);
  assert.deepEqual(s.equityCurve, []);
});

test('zero-loss scenario never yields Infinity for profit factor', () => {
  const s = aggregateSummary([t('1', '2024-01-10', 2), t('2', '2024-01-11', 3)]);
  assert.equal(s.profitFactor, null); // N/A (would be positive/0 = Infinity)
});

test('equity curve and max drawdown', () => {
  const trades = [t('1', '2024-01-10', 1), t('2', '2024-01-11', -2), t('3', '2024-01-12', 1)];
  const curve = buildEquityCurve(trades);
  assert.deepEqual(curve.map((p) => p.netR), [1, -1, 0]);
  assert.equal(computeMaxDrawdown(curve), 2); // peak 1 → trough −1
  assert.equal(computeMaxDrawdown([]), null);
});

test('instrument grouping', () => {
  const trades = [
    t('1', '2024-01-10', 2, 'EURUSD'),
    t('2', '2024-01-11', -1, 'EURUSD'),
    t('3', '2024-01-12', 1.5, 'XAUUSD'),
  ];
  const groups = aggregateInstruments(trades);
  assert.equal(groups.length, 2);
  const eurusd = groups.find((g) => g.name === 'EURUSD');
  assert.equal(eurusd.netR, 1);
  assert.equal(eurusd.winRate, 50);
  assert.equal(eurusd.trades, 2);
});

test('monthly aggregation', () => {
  const trades = [t('1', '2024-01-10', 2), t('2', '2024-01-11', -1), t('3', '2024-02-01', 1)];
  const months = aggregateSummary(trades).monthly;
  assert.equal(months.length, 2);
  assert.equal(months[0].label, 'Jan 2024');
  assert.equal(months[0].netR, 1);
  assert.equal(months[1].netR, 1);
});