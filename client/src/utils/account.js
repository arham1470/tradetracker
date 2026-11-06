/**
 * Account equity calculations.
 *
 * Converts the journal's R-multiples into money P&L for a balance:
 *   risk per trade = current running balance × risk%
 *   trade P&L      = risk per trade × actualR
 *
 * The risk amount is re-derived from the running balance before each trade,
 * so the money equity curve compounds exactly like a real account that risks
 * a fixed percentage per trade. Trades are applied in chronological order
 * (tradeDate, then createdAt as a tiebreaker).
 */

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function round2(value) {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

/**
 * Compute the account equity curve across all trades.
 *
 * @param {Array}  trades              Trade objects from the API (with `actualR`).
 * @param {Object} settings
 * @param {number|string} settings.startingBalance  Opening account balance.
 * @param {number|string} settings.riskPercent      Fraction of the balance risked per trade (%).
 * @returns {Object}
 *   - enabled      – true when a positive balance + risk% are configured.
 *   - currentBalance – balance after the last trade.
 *   - totalPnl     – sum of money P&L across all trades.
 *   - totalR       – sum of R-multiples across all trades.
 *   - tradesCounted – number of trades applied.
 *   - perTrade     – Map(tradeId -> { riskAmount, pnl, balanceAfter, r }).
 */
export function computeAccountEquity(trades = [], { startingBalance = 0, riskPercent = 0 } = {}) {
  const start = toNumber(startingBalance);
  const riskPct = toNumber(riskPercent);
  const enabled = start > 0 && riskPct > 0;

  const ordered = [...trades]
    .filter((trade) => trade && trade.actualR != null && Number.isFinite(Number(trade.actualR)))
    .sort((a, b) => {
      const da = new Date(a.tradeDate || 0).getTime();
      const db = new Date(b.tradeDate || 0).getTime();
      if (da !== db) return da - db;
      const ca = new Date(a.createdAt || 0).getTime();
      const cb = new Date(b.createdAt || 0).getTime();
      if (ca !== cb) return ca - cb;
      return String(a.id || a._id || '').localeCompare(String(b.id || b._id || ''));
    });

  let balance = start;
  let totalPnl = 0;
  let totalR = 0;
  const perTrade = new Map();

  let peakBalance = start;
  let maxDrawdownMoney = 0;
  let maxDrawdownPercent = 0;
  let peakR = 0;
  let maxDrawdownR = 0;

  const winningPnls = [];
  const losingPnls = [];
  const winRs = [];
  const lossRs = [];

  const equityCurve = [];
  if (ordered.length > 0) {
    equityCurve.push({
      date: ordered[0].tradeDate,
      balance: round2(start),
      pnl: 0,
      actualR: 0,
      netR: 0,
      label: 'Initial',
    });
  }

  for (let i = 0; i < ordered.length; i++) {
    const trade = ordered[i];
    const r = toNumber(trade.actualR);
    const risk = enabled ? balance * (riskPct / 100) : 0;
    const pnl = risk * r;
    balance += pnl;
    totalPnl += pnl;
    totalR += r;

    if (r > 0) {
      winningPnls.push(pnl);
      winRs.push(r);
    } else if (r < 0) {
      losingPnls.push(pnl);
      lossRs.push(r);
    }

    if (balance > peakBalance) peakBalance = balance;
    const currentDrawdown = peakBalance - balance;
    if (currentDrawdown > maxDrawdownMoney) maxDrawdownMoney = currentDrawdown;
    const currentDrawdownPct = peakBalance > 0 ? (currentDrawdown / peakBalance) * 100 : 0;
    if (currentDrawdownPct > maxDrawdownPercent) maxDrawdownPercent = currentDrawdownPct;

    if (totalR > peakR) peakR = totalR;
    const currentDrawdownR = peakR - totalR;
    if (currentDrawdownR > maxDrawdownR) maxDrawdownR = currentDrawdownR;

    const tradeId = String(trade.id || trade._id);
    perTrade.set(tradeId, {
      riskAmount: risk,
      pnl,
      balanceAfter: balance,
      r,
    });

    equityCurve.push({
      id: tradeId,
      date: trade.tradeDate,
      balance: round2(balance),
      pnl: round2(pnl),
      actualR: round2(r),
      netR: round2(totalR),
      instrument: trade.instrument,
      strategy: trade.strategy,
      direction: trade.direction,
      outcome: trade.outcome,
      tradeIndex: i + 1,
    });
  }

  const grossWinsMoney = winningPnls.reduce((acc, v) => acc + v, 0);
  const grossLossesMoney = Math.abs(losingPnls.reduce((acc, v) => acc + v, 0));
  let profitFactorMoney = null;
  if (grossLossesMoney > 0 && grossWinsMoney > 0) {
    profitFactorMoney = round2(grossWinsMoney / grossLossesMoney);
  } else if (grossLossesMoney > 0) {
    profitFactorMoney = 0;
  }

  const avgWinMoney = winningPnls.length ? grossWinsMoney / winningPnls.length : 0;
  const avgLossMoney = losingPnls.length ? Math.abs(losingPnls.reduce((acc, v) => acc + v, 0) / losingPnls.length) : 0;
  const expectancyMoney = ordered.length ? totalPnl / ordered.length : 0;
  const expectancyR = ordered.length ? totalR / ordered.length : 0;
  const roi = start > 0 ? ((balance - start) / start) * 100 : 0;

  return {
    enabled,
    startingBalance: start,
    currentBalance: round2(balance),
    totalPnl: round2(totalPnl),
    totalR: round2(totalR),
    roi: round2(roi),
    tradesCounted: ordered.length,
    winningTradesCount: winningPnls.length,
    losingTradesCount: losingPnls.length,
    breakevenTradesCount: ordered.length - winningPnls.length - losingPnls.length,
    winRate: ordered.length ? round2((winningPnls.length / ordered.length) * 100) : null,
    maxDrawdownMoney: round2(maxDrawdownMoney),
    maxDrawdownPercent: round2(maxDrawdownPercent),
    maxDrawdownR: round2(maxDrawdownR),
    avgWinMoney: round2(avgWinMoney),
    avgLossMoney: round2(avgLossMoney),
    avgWinR: winRs.length ? round2(winRs.reduce((a, b) => a + b, 0) / winRs.length) : null,
    avgLossR: lossRs.length ? round2(lossRs.reduce((a, b) => a + b, 0) / lossRs.length) : null,
    profitFactorMoney,
    expectancyMoney: round2(expectancyMoney),
    expectancyR: round2(expectancyR),
    equityCurve,
    perTrade,
  };
}