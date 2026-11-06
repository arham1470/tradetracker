import { useMemo, useState } from 'react';
import { Calendar, ChevronDown, Filter, Layers, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { INSTRUMENTS } from '../constants/index.js';

/**
 * Filter bar supporting:
 * - Instrument (default: XAUUSD, or selectable pair / all)
 * - Strategy (All or specific playbook)
 * - Date Filter (Presets: All, 30D, 90D, 6M, 1Y + Custom From/To range)
 */
export default function FilterBar({
  filters,
  onChange,
  strategies = [],
  showStrategy = true,
  defaultInstrument = 'XAUUSD',
  onReset = null,
}) {
  const [showCustomDate, setShowCustomDate] = useState(() => Boolean(filters.startDate || filters.endDate));

  const ranges = [
    { value: '0', label: 'All Time' },
    { value: '30', label: '30D' },
    { value: '90', label: '90D' },
    { value: '180', label: '6M' },
    { value: '365', label: '1Y' },
  ];

  const instrumentButtons = [
    { value: 'XAUUSD', label: 'XAUUSD · Gold' },
    { value: 'EURUSD', label: 'EURUSD' },
    { value: 'AUDUSD', label: 'AUDUSD' },
    { value: '', label: 'All Pairs' },
  ];

  const hasCustomDates = Boolean(filters.startDate || filters.endDate);
  const isFiltered =
    (filters.instrument !== undefined && filters.instrument !== defaultInstrument) ||
    Boolean(filters.strategy) ||
    hasCustomDates ||
    (filters.range && filters.range !== '0');

  const handleRangeClick = (rangeVal) => {
    onChange({
      ...filters,
      range: rangeVal,
      startDate: '',
      endDate: '',
    });
  };

  const handleCustomDateChange = (field, value) => {
    onChange({
      ...filters,
      [field]: value,
      range: 'custom',
    });
  };

  const handleClearCustomDates = () => {
    setShowCustomDate(false);
    onChange({
      ...filters,
      startDate: '',
      endDate: '',
      range: '0',
    });
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Instrument Pills */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mr-1 hidden sm:inline">
            Pair:
          </span>
          <div className="flex rounded-lg border border-border bg-surface p-0.5 shadow-sm">
            {instrumentButtons.map((inst) => {
              const active = (filters.instrument || '') === inst.value;
              return (
                <button
                  key={inst.value || 'all'}
                  type="button"
                  onClick={() => onChange({ ...filters, instrument: inst.value })}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    active
                      ? 'bg-accent text-white shadow-sm font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-surface-alt'
                  }`}
                >
                  {inst.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Strategy Dropdown */}
        {showStrategy && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mr-1 hidden sm:inline">
              Strategy:
            </span>
            <div className="relative">
              <select
                value={filters.strategy || ''}
                onChange={(e) => onChange({ ...filters, strategy: e.target.value })}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium shadow-sm transition appearance-none pr-7 focus:outline-none focus:ring-1 focus:ring-accent ${
                  filters.strategy
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-400 font-semibold'
                    : 'border-border bg-surface text-neutral-300 hover:border-neutral-500'
                }`}
              >
                <option value="" className="bg-surface text-foreground">
                  All Strategies
                </option>
                {strategies.map((strat) => (
                  <option key={strat} value={strat} className="bg-surface text-foreground">
                    {strat}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400"
              />
            </div>
          </div>
        )}

        {/* Date Filter Range Buttons */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mr-1 hidden sm:inline">
            Period:
          </span>
          <div className="flex rounded-lg border border-border bg-surface p-0.5 shadow-sm">
            {ranges.map((range) => {
              const active = !hasCustomDates && String(filters.range ?? '0') === range.value;
              return (
                <button
                  key={range.value}
                  type="button"
                  onClick={() => handleRangeClick(range.value)}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-all ${
                    active
                      ? 'bg-accent/20 text-accent font-semibold ring-1 ring-accent/30'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-surface-alt'
                  }`}
                >
                  {range.label}
                </button>
              );
            })}
          </div>

          {/* Toggle Custom Dates Button */}
          <button
            type="button"
            onClick={() => setShowCustomDate((prev) => !prev)}
            title="Custom Date Filter"
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition shadow-sm ${
              hasCustomDates || showCustomDate
                ? 'border-accent bg-accent/15 text-accent font-semibold'
                : 'border-border bg-surface text-neutral-400 hover:text-foreground hover:bg-surface-alt'
            }`}
          >
            <Calendar size={13} />
            <span className="hidden sm:inline">Dates</span>
          </button>
        </div>

        {/* Reset / Clear Button */}
        {isFiltered && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-surface px-2.5 py-1 text-xs text-neutral-400 transition hover:bg-surface-alt hover:text-foreground"
            title="Reset filters to default"
          >
            <RotateCcw size={12} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}
      </div>

      {/* Expandable Custom Date Range Bar */}
      {showCustomDate && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 p-2 text-xs animate-fade-rise">
          <span className="font-semibold text-accent flex items-center gap-1">
            <Calendar size={13} /> Custom Date Filter:
          </span>
          <div className="flex items-center gap-1.5">
            <label className="text-neutral-400">From:</label>
            <input
              type="date"
              className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
              value={filters.startDate || ''}
              onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-neutral-400">To:</label>
            <input
              type="date"
              className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
              value={filters.endDate || ''}
              onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
            />
          </div>
          {(filters.startDate || filters.endDate) && (
            <button
              type="button"
              onClick={handleClearCustomDates}
              className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-rose-400 ml-1 transition"
            >
              <X size={12} /> Clear dates
            </button>
          )}
        </div>
      )}
    </div>
  );
}
