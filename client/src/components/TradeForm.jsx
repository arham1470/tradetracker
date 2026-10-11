import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { DIRECTIONS, INSTRUMENTS, SESSIONS, TIMEFRAMES } from '../constants/index.js';
import { toDateInputValue } from '../utils/format.js';
import { computeActualR, computePlannedRR, deriveOutcome } from '../utils/calculations.js';

/**
 * Shared trade form used by the Add Trade page and the edit modal in
 * Trade History. Live-preview shows the server-side math (actual R,
 * planned R:R, outcome) before you save. The outcome submitted on the form
 * is informational only — the server ALWAYS recomputes it.
 */

export const emptyForm = {
  tradeDate: toDateInputValue(new Date()),
  instrument: 'EURUSD',
  direction: 'BUY',
  strategy: '',
  timeframe: 'H1',
  session: 'LONDON',
  entryPrice: '',
  stopLoss: '',
  takeProfit: '',
  exitPrice: '',
  outcome: 'WIN', // informational only — server overwrites it
  notes: '',
  screenshotUrl: '',
};

function PillGroup({ options, value, onChange, formatter = (option) => option }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const optionValue = option.value ?? option;
        const selected = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              selected
                ? 'border-accent bg-accent/15 text-foreground'
                : 'border-border text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {formatter(option)}
          </button>
        );
      })}
    </div>
  );
}

export function TradeForm({ initial, onSubmit, submitting, submitLabel, onCancel, compact }) {
  const [form, setForm] = useState(() => ({ ...emptyForm, ...(initial || {}) }));

  const setField = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  const setSelect = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const isEditing = Boolean(initial?.id || initial?._id);

  // Live preview of what the server will compute.
  const preview = useMemo(() => {
    const entry = Number(form.entryPrice);
    const stop = Number(form.stopLoss);
    const target = Number(form.takeProfit);
    const exit = Number(form.exitPrice);
    return {
      actualR: computeActualR(form.direction, entry, stop, exit),
      plannedRR: computePlannedRR(form.direction, entry, stop, target),
      outcome: deriveOutcome(computeActualR(form.direction, entry, stop, exit)),
    };
  }, [form.direction, form.entryPrice, form.stopLoss, form.takeProfit, form.exitPrice]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      tradeDate: form.tradeDate,
      instrument: form.instrument,
      direction: form.direction,
      strategy: form.strategy,
      timeframe: form.timeframe,
      session: form.session,
      entryPrice: Number(form.entryPrice),
      stopLoss: Number(form.stopLoss),
      takeProfit: form.takeProfit === '' ? null : Number(form.takeProfit),
      exitPrice: Number(form.exitPrice),
      notes: form.notes,
      screenshotUrl: form.screenshotUrl,
    });
  };

  const previewOutcomeStyles =
    preview.outcome === 'WIN' ? 'text-positive' : preview.outcome === 'LOSS' ? 'text-negative' : 'text-neutral-400';

  // Compact mode renders tighter padding/gaps so the form fits comfortably
  // inside the edit modal without excessive scrolling.
  const sectionClass = compact ? 'card p-4' : 'card p-5';
  const headingClass = compact ? 'mb-3 text-sm font-semibold text-foreground' : 'mb-4 text-sm font-semibold text-foreground';

  return (
    <form onSubmit={handleSubmit} className={compact ? 'space-y-4' : 'space-y-6'}>
      {/* Live computed preview */}
      <div className={`${compact ? 'grid-cols-3 gap-2 px-3 py-3' : 'grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-3'} grid rounded-xl border border-border bg-surface-alt/40`}>
        <div>
          <p className="label">Planned R:R</p>
          <p className="font-mono text-lg font-semibold text-neutral-200">
            {preview.plannedRR === null ? '—' : `${preview.plannedRR} : 1`}
          </p>
        </div>
        <div>
          <p className="label">Actual R</p>
          <p className={`font-mono text-lg font-semibold ${previewOutcomeStyles}`}>
            {preview.actualR === null ? '—' : `${preview.actualR > 0 ? '+' : ''}${preview.actualR}R`}
          </p>
        </div>
        <div>
          <p className="label">Outcome</p>
          <p className={`font-mono text-lg font-semibold ${previewOutcomeStyles}`}>
            {preview.outcome === 'WIN' ? 'Win' : preview.outcome === 'LOSS' ? 'Loss' : '—'}
          </p>
          <p className="text-[11px] text-neutral-600">recomputed by server</p>
        </div>
      </div>
{/* Trade setup */}
      <section className={sectionClass}>
        <h2 className={headingClass}>Setup</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label" htmlFor="tradeDate">Trade date *</label>
            <input id="tradeDate" type="date" className="input" value={form.tradeDate} onChange={setField('tradeDate')} required />
          </div>
          <div>
            <label className="label">Instrument *</label>
            <PillGroup options={INSTRUMENTS} value={form.instrument} onChange={setSelect('instrument')} formatter={({ label }) => label} />
          </div>
          <div>
            <label className="label">Direction *</label>
            <PillGroup options={DIRECTIONS} value={form.direction} onChange={setSelect('direction')} formatter={({ label }) => label} />
          </div>
          <div>
            <label className="label" htmlFor="strategy">Strategy *</label>
            <input id="strategy" className="input" placeholder="e.g. London breakout" value={form.strategy} onChange={setField('strategy')} maxLength={80} required />
          </div>
          <div>
            <label className="label">Timeframe *</label>
            <PillGroup options={TIMEFRAMES} value={form.timeframe} onChange={setSelect('timeframe')} formatter={({ value }) => value} />
          </div>
          <div>
            <label className="label">Session *</label>
            <select className="input" value={form.session} onChange={setField('session')}>
              {SESSIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Prices */}
      <section className={sectionClass}>
        <h2 className={headingClass}>Prices</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="entryPrice">Entry price *</label>
            <input id="entryPrice" type="number" step="any" min="0" className="input font-mono" placeholder={form.instrument === 'XAUUSD' ? '2315.50' : '1.09000'} value={form.entryPrice} onChange={setField('entryPrice')} required />
          </div>
          <div>
            <label className="label" htmlFor="stopLoss">Stop-loss *</label>
            <input id="stopLoss" type="number" step="any" min="0" className="input font-mono" placeholder={form.instrument === 'XAUUSD' ? '2305.50' : '1.08900'} value={form.stopLoss} onChange={setField('stopLoss')} required />
          </div>
          <div>
            <label className="label" htmlFor="takeProfit">Take-profit <span className="normal-case text-neutral-600">(optional)</span></label>
            <input id="takeProfit" type="number" step="any" min="0" className="input font-mono" placeholder={form.instrument === 'XAUUSD' ? '2345.50' : '1.10000'} value={form.takeProfit} onChange={setField('takeProfit')} />
          </div>
          <div>
            <label className="label" htmlFor="exitPrice">Exit price *</label>
            <input id="exitPrice" type="number" step="any" min="0" className="input font-mono" placeholder={form.instrument === 'XAUUSD' ? '2330.00' : '1.09500'} value={form.exitPrice} onChange={setField('exitPrice')} required />
          </div>
        </div>
        <p className="mt-3 text-xs text-neutral-600">
          {form.direction === 'BUY'
            ? 'Buy → stop-loss must be below entry, take-profit above.'
            : 'Sell → stop-loss must be above entry, take-profit below.'}
        </p>
      </section>
{/* Notes & screenshot */}
      <section className={sectionClass}>
        <h2 className={headingClass}>Notes</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="screenshotUrl">Chart screenshot URL <span className="normal-case text-neutral-600">(optional)</span></label>
            <input id="screenshotUrl" type="url" className="input" placeholder="https://…/screenshot.png" value={form.screenshotUrl} onChange={setField('screenshotUrl')} maxLength={500} />
          </div>
          <div>
            <label className="label" htmlFor="notes">Notes <span className="normal-case text-neutral-600">(optional)</span></label>
            <textarea id="notes" className="input resize-y" rows={2} placeholder="Setup context, news, confluences…" value={form.notes} onChange={setField('notes')} maxLength={2000} />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={submitting} className="btn-primary">
          <Save size={16} />
          {submitting ? 'Saving…' : submitLabel || (isEditing ? 'Save changes' : 'Save trade')}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="btn-secondary">
            <X size={16} />
            Cancel
          </button>
        ) : (
          <Link to="/trades" className="btn-secondary">
            <X size={16} />
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}