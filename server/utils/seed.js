import 'dotenv/config';
import mongoose from 'mongoose';
import Trade from '../models/Trade.js';
import { connectDB } from '../config/db.js';

/**
 * Optional demo-data seeder.
 *
 *   npm run seed          → seeds demo trades (idempotent resets)
 *   npm run seed -- clean → removes ALL trades (real + demo)
 *
 * Demo records are flagged with isDemo:true so dashboards tag them clearly
 * and you can remove them at any time from the Settings page.
 */

const STRATEGIES = [
  { name: 'Breakout', tf: 'H1', session: 'LONDON' },
  { name: 'Pullback', tf: 'M15', session: 'NEW_YORK' },
  { name: 'Range Fade', tf: 'M30', session: 'ASIA' },
];

function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

// Deterministic-ish generated rows: cheap pseudo-random using a seed.
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildDemoTrades() {
  const rand = mulberry32(42);
  const instruments = ['EURUSD', 'XAUUSD', 'AUDUSD'];
  const notes = [
    'Classic continuation, clean structure.',
    'Faded into a strong supply zone.',
    'News spike, held through consolidation.',
    'Low-volume move, questionable setup.',
    'Textbook pattern with full confluences.',
    'Chopped out early, kept it small.',
  ];
  const trades = [];

  const push = (dayOffset, instrument, strategyIdx, direction, entryPct, riskPct, rOutcome) => {
    const strat = STRATEGIES[strategyIdx % STRATEGIES.length];
    const base = instrument === 'XAUUSD' ? 2315.5 : instrument === 'AUDUSD' ? 0.6655 : 1.0925;
    const pipScale = instrument === 'EURUSD' ? 0.0001 : instrument === 'AUDUSD' ? 0.0001 : 0.1;
    const isBuy = direction === 'BUY';

    const entry = base + (isBuy ? entryPct : -entryPct) * pipScale * 4;
    const stop = isBuy ? entry - riskPct * pipScale * 20 : entry + riskPct * pipScale * 20;
    const risk = Math.abs(entry - stop);
    const exit = isBuy ? entry + risk * rOutcome : entry - risk * rOutcome;

    trades.push({
      instrument,
      direction,
      tradeDate: daysAgo(dayOffset),
      strategy: strat.name,
      timeframe: strat.tf,
      session: strat.session,
      entryPrice: Number(entry.toFixed(instrument === 'XAUUSD' ? 1 : 5)),
      stopLoss: Number(stop.toFixed(instrument === 'XAUUSD' ? 1 : 5)),
      takeProfit: isBuy
        ? Number((entry + risk * 3).toFixed(instrument === 'XAUUSD' ? 1 : 5))
        : Number((entry - risk * 3).toFixed(instrument === 'XAUUSD' ? 1 : 5)),
      exitPrice: Number(exit.toFixed(instrument === 'XAUUSD' ? 1 : 5)),
      notes: `${notes[Math.floor(rand() * notes.length)]} (demo data)`,
      screenshotUrl: '',
      isDemo: true,
    });
  };

  // ~34 demo trades spread over the last 90 days across all instruments.
  const rResults = [2.2, -1, 1, -1, 3, -1, 1.5, 2.8, -1, -1, 0.6, 2, -1, -1, 4, -1, 1.2, -1, 0, 2.5, -1, -1, 1.8, -1, 2, -1, -1, 3.2, 1, -1, -1, 2.2, -1, 1.5];
  const directions = ['BUY', 'SELL', 'SELL', 'BUY', 'BUY', 'SELL', 'BUY', 'SELL', 'BUY', 'SELL', 'SELL', 'BUY', 'SELL', 'BUY', 'BUY', 'SELL', 'BUY', 'SELL', 'BUY', 'SELL', 'BUY', 'SELL', 'BUY', 'SELL', 'BUY', 'SELL', 'BUY', 'SELL', 'BUY', 'SELL', 'BUY', 'SELL', 'BUY', 'SELL'];

  for (let i = 0; i < rResults.length; i += 1) {
    const instrument = instruments[i % instruments.length];
    const entryPct = rand() * 0.6 + 0.1;
    const riskPct = rand() * 0.5 + 0.3;
    push(i * 2 + 1, instrument, i % STRATEGIES.length, directions[i % directions.length], entryPct, riskPct, rResults[i]);
  }

  return trades;
}

async function seed() {
  await connectDB();

  try {
    if (process.argv.includes('clean')) {
      const result = await Trade.deleteMany({});
      console.log(`✖ Removed all trades (${result.deletedCount} records).`);
    } else {
      await Trade.deleteMany({ isDemo: true });
      const trades = buildDemoTrades();
      // Trade.create() fires the pre-validate hook so actualR / plannedRR /
      // outcome are computed through the SAME code path as normal saves.
      await Trade.create(trades);
      console.log(`✔ Seeded ${trades.length} demo trades (isDemo: true).`);
      console.log('   Open the Dashboard to view them. Remove them anytime from Settings.');
    }
  } catch (err) {
    console.error(`✖ Seeding failed: ${err.message}`);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

seed();