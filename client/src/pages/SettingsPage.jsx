import { useState } from 'react';
import { Copy, Database, ShieldAlert, TerminalSquare } from 'lucide-react';
import { tradeApi, toErrorMessage } from '../services/api.js';
import { Card, ErrorBanner } from '../components/ui.jsx';

/**
 * Settings — data maintenance info and usage notes.
 * The app is unauthenticated by design (personal local use only).
 */

function CommandBlock({ command, caption }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };
  return (
    <div className="rounded-lg border border-border bg-input">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <p className="text-[11px] uppercase tracking-wide text-neutral-500">{caption}</p>
        <button type="button" onClick={copy} className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white">
          {copied ? 'Copied ✓' : <><Copy size={12} /> Copy</>}
        </button>
      </div>
      <p className="px-3 py-2.5 font-mono text-sm text-amber-300">{command}</p>
    </div>
  );
}

export default function SettingsPage() {
  const [demoStats, setDemoStats] = useState(null);
  const [countError, setCountError] = useState(null);

  const refreshCounts = async () => {
    setCountError(null);
    try {
      const trades = await tradeApi.getTrades({ limit: 1000 });
      const demo = trades.data.trades.filter((t) => t.isDemo).length;
      const real = trades.data.trades.length - demo;
      setDemoStats({ demo, real });
    } catch (err) {
      setDemoStats(null);
      setCountError(toErrorMessage(err));
    }
  };

  return (
    <div className="animate-fade-rise space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">Data maintenance & information</p>
      </header>

      <ErrorBanner message={countError} />

      <Card>
        <div className="mb-4 flex items-start gap-3">
          <div className="mt-0.5 text-accent"><Database size={20} /></div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white">Demo data</h2>
            <p className="mt-1 text-sm leading-relaxed text-neutral-400">
              The repo includes a <span className="font-medium text-neutral-200">seed script</span> that inserts ~34
              clearly-labelled demo trades (flagged <span className="text-amber-400">demo</span>) so you can explore the
              dashboard with realistic numbers. Run it from the server folder:
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <CommandBlock command="npm run seed" caption="Insert demo trades (idempotent)" />
          <CommandBlock command="npm run seed -- clean" caption="Delete ALL trades (real + demo)" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={refreshCounts} className="btn-secondary btn-sm">
            Count stored trades
          </button>
          {demoStats ? (
            <span className="text-xs text-neutral-400">
              {demoStats.real} real · {demoStats.demo} demo trade{demoStats.demo === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="text-xs text-neutral-600">query the API to see current counts</span>
          )}
        </div>
      </Card>
<Card>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-negative"><ShieldAlert size={20} /></div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white">Privacy & security</h2>
            <p className="mt-1 text-sm leading-relaxed text-neutral-400">
              TradeTrack is a <strong className="text-neutral-200">personal, local application</strong>. It has{' '}
              <strong className="text-neutral-200">no authentication layer</strong>, so it is intended to run only on
              your own machine. Do not expose the API or client publicly without adding auth yourself. The database
              connection string is read from environment variables — never hardcoded.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-neutral-400">
              Trade data lives only in your own MongoDB database. There is no broker integration and the app does not
              contact any external service.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-positive"><TerminalSquare size={20} /></div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white">How performance is calculated</h2>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-neutral-400">
              <li>
                <span className="font-medium text-neutral-300">Actual R</span> uses the real exit price and initial risk
                (|entry − stop-loss|), for both Buy and Sell trades — exits never assume a fixed +2R/−1R.
              </li>
              <li>
                <span className="font-medium text-neutral-300">Planned R:R</span> uses the take-profit when provided.
              </li>
              <li>
                All derived values are <span className="font-medium text-neutral-300">recomputed on the server</span> on
                every save — client-submitted values are never trusted.
              </li>
              <li>
                Metrics that cannot be meaningfully computed (e.g. profit factor with no losses, or an empty dataset)
                display <span className="font-medium text-neutral-300">N/A</span> instead of NaN/Infinity.
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}