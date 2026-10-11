import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Card } from './ui.jsx';
import { useBalance } from '../balance/BalanceContext.jsx';
import { computeAccountEquity } from '../utils/account.js';
import { formatMoney } from '../utils/format.js';

/**
 * Account balance card.
 *
 * Lets you set the starting balance and the risk-per-trade %, then shows the
 * resulting equity: current balance, total profit/loss in $ and total R.
 * P&L is compounded per trade (risk = running balance × risk%).
 */
export default function AccountBalanceCard({ trades = [] }) {
  const { startingBalance, setStartingBalance, riskPercent, setRiskPercent, balanceConfigured } =
    useBalance();

  const equity = useMemo(
    () => computeAccountEquity(trades, { startingBalance, riskPercent }),
    [trades, startingBalance, riskPercent]
  );

  const pnlPositive = equity.totalPnl >= 0;
  const showPnl = equity.enabled && equity.tradesCounted > 0;

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Wallet size={16} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Account balance</h3>
            <p className="text-xs text-neutral-500">Starting balance + risk per trade</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="starting-balance">
            Starting balance ($)
          </label>
          <input
            id="starting-balance"
            type="number"
            min="0"
            step="100"
            className="input font-mono"
            value={startingBalance}
            onChange={(e) => setStartingBalance(e.target.value)}
            placeholder="10000"
          />
        </div>
        <div>
          <label className="label" htmlFor="risk-per-trade">
            Risk per trade (%)
          </label>
          <input
            id="risk-per-trade"
            type="number"
            min="0"
            max="100"
            step="0.25"
            className="input font-mono"
            value={riskPercent}
            onChange={(e) => setRiskPercent(e.target.value)}
            placeholder="1"
          />
        </div>
      </div>

      {showPnl ? (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-input px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">Current balance</p>
            <p className="mt-0.5 font-mono text-lg font-semibold text-foreground">
              {formatMoney(equity.currentBalance)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-input px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">Total P&L</p>
            <p
              className={`mt-0.5 flex items-center gap-1 font-mono text-lg font-semibold ${
                pnlPositive ? 'text-positive' : 'text-negative'
              }`}
            >
              {pnlPositive ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              {formatMoney(equity.totalPnl, { showSign: true })}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-input px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">Total R</p>
            <p
              className={`mt-0.5 font-mono text-lg font-semibold ${
                equity.totalR >= 0 ? 'text-positive' : 'text-negative'
              }`}
            >
              {equity.totalR >= 0 ? '+' : ''}
              {equity.totalR}R
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-border bg-surface-alt/40 px-3 py-3 text-xs text-neutral-500">
          <p className="font-medium text-neutral-400">How money P&L works</p>
          <p className="mt-1 leading-relaxed">
            Set a starting balance and a risk-per-trade percentage. Each trade's money P&L is
            {balanceConfigured ? (
              <> derived from its R-multiple × risk (compounded per trade). Add a few trades to see the numbers.</>
            ) : (
              <> risk × R-multiple. Enter a positive balance and risk % to calculate it.</>
            )}
          </p>
        </div>
      )}
    </Card>
  );
}