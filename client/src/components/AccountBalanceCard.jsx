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

  const presets = ['5000', '10000', '25000', '50000'];

  return (
    <div className="glass-card p-5 group transition-all duration-300">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent shadow-sm group-hover:scale-105 transition-transform">
            <Wallet size={18} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">Account Simulation & P&L</h3>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">Compounded</span>
            </div>
            <p className="text-xs text-neutral-500">Calculate actual portfolio equity based on running risk</p>
          </div>
        </div>

        {/* Quick balance preset chips */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-neutral-500 mr-1 font-medium hidden sm:inline">Presets:</span>
          {presets.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setStartingBalance(amount)}
              className={`rounded-lg px-2.5 py-1 text-xs font-mono transition-all ${
                String(startingBalance) === amount
                  ? 'bg-accent text-white font-medium shadow-sm'
                  : 'bg-surface-alt/70 text-neutral-400 hover:text-foreground hover:bg-surface-alt border border-border/60'
              }`}
            >
              ${Number(amount) / 1000}k
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <label className="label" htmlFor="starting-balance">
            Starting balance ($)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-sm">$</span>
            <input
              id="starting-balance"
              type="number"
              min="0"
              step="100"
              className="input pl-7 font-mono font-medium focus:border-accent"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              placeholder="10000"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="risk-per-trade">
            Risk per trade (%)
          </label>
          <div className="relative">
            <input
              id="risk-per-trade"
              type="number"
              min="0"
              max="100"
              step="0.25"
              className="input pr-8 font-mono font-medium focus:border-accent"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value)}
              placeholder="1"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-sm">%</span>
          </div>
        </div>
      </div>

      {showPnl ? (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/80 bg-input/70 p-3.5 transition-all hover:border-accent/30">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Current Balance</p>
            <p className="mt-1 font-mono text-xl font-bold tracking-tight text-foreground">
              {formatMoney(equity.currentBalance)}
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              from {formatMoney(Number(startingBalance))} start
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-input/70 p-3.5 transition-all hover:border-accent/30">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Total Net P&L</p>
            <p
              className={`mt-1 flex items-center gap-1.5 font-mono text-xl font-bold tracking-tight ${
                pnlPositive ? 'text-positive' : 'text-negative'
              }`}
            >
              {pnlPositive ? <TrendingUp size={18} className="animate-pulse" /> : <TrendingDown size={18} />}
              {formatMoney(equity.totalPnl, { showSign: true })}
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              {equity.currentBalance && Number(startingBalance) > 0
                ? `${pnlPositive ? '+' : ''}${(((equity.currentBalance - Number(startingBalance)) / Number(startingBalance)) * 100).toFixed(2)}% ROI`
                : 'ROI'}
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-input/70 p-3.5 transition-all hover:border-accent/30">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Compounded R Return</p>
            <p
              className={`mt-1 font-mono text-xl font-bold tracking-tight ${
                equity.totalR >= 0 ? 'text-positive' : 'text-negative'
              }`}
            >
              {equity.totalR >= 0 ? '+' : ''}
              {equity.totalR}R
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              Across {equity.tradesCounted} trade{equity.tradesCounted === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-border/70 bg-surface-alt/40 p-3.5 text-xs text-neutral-500">
          <p className="font-semibold text-neutral-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
            Compound Growth Simulation
          </p>
          <p className="mt-1 leading-relaxed">
            Enter your starting balance and risk percentage. Each backtested trade will compound risk based on current balance, showing your exact simulated account equity curve and growth.
          </p>
        </div>
      )}
    </div>
  );
}