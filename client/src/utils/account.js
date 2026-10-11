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

  for (const trade of ordered) {
    const r = toNumber(trade.actualR);
    const risk = enabled ? balance * (riskPct / 100) : 0;
    const pnl = risk * r;
    balance += pnl;
    totalPnl += pnl;
    totalR += r;
    perTrade.set(String(trade.id || trade._id), {
      riskAmount: risk,
      pnl,
      balanceAfter: balance,
      r,
    });
  }

  return {
    enabled,
    currentBalance: balance,
    totalPnl,
    totalR: round2(totalR),
    tradesCounted: ordered.length,
    perTrade,
  };
}