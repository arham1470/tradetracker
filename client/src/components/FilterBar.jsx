import { useMemo } from 'react';
import { INSTRUMENTS } from '../constants/index.js';

/**
 * Shared filter bar used by Dashboard + Analytics.
 * `filters` = { range, instrument } — range is number-of-days (or 0 = all).
 */
export default function FilterBar({ filters, onChange }) {
  const ranges = [
    { value: '0', label: 'All' },
    { value: '30', label: '30D' },
    { value: '90', label: '90D' },
    { value: '180', label: '6M' },
    { value: '365', label: '1Y' },
  ];

  const instrumentOptions = useMemo(() => [{ value: '', label: 'All instruments' }, ...INSTRUMENTS], []);

  const selectedRangeLabel = ranges.find((r) => r.value === String(filters.range))?.label ?? 'All';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg border border-border bg-surface p-0.5">
        {ranges.map((range) => (
          <button
            key={range.value}
            type="button"
            onClick={() => onChange({ ...filters, range: range.value })}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
              String(filters.range) === range.value
                ? 'bg-accent/15 text-foreground'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      <div className="flex rounded-lg border border-border bg-surface p-0.5">
        {instrumentOptions.map((instrument) => (
          <button
            key={instrument.value}
            type="button"
            onClick={() => onChange({ ...filters, instrument: instrument.value })}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
              filters.instrument === instrument.value
                ? 'bg-accent/15 text-foreground'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {instrument.label}
          </button>
        ))}
      </div>

      <span className="text-xs text-neutral-600">{selectedRangeLabel}</span>
    </div>
  );
}