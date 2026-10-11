import { useCallback, useEffect, useState } from 'react';
import { analyticsApi, toErrorMessage } from '../services/api.js';
import FilterBar from '../components/FilterBar.jsx';
import { Card, EmptyState, ErrorBanner, Spinner } from '../components/ui.jsx';
import { HorizontalRBar } from '../components/charts.jsx';
import { formatNumber, formatPercent, formatR, signClass } from '../utils/format.js';

/**
 * Analytics — deeper dives into the same dataset the dashboard summarises.
 * Both grouped endpoints (by instrument / by strategy) are server-computed
 * from the shared aggregators.
 */

export default function AnalyticsPage() {
  const [filters, setFilters] = useState({ range: '0', instrument: '' });
  const [instruments, setInstruments] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = {};
    if (filters.range && filters.range !== '0') params.range = filters.range;
    if (filters.instrument) params.instrument = filters.instrument;
    try {
      const [instrumentsRes, strategiesRes] = await Promise.all([
        analyticsApi.getInstruments(params),
        analyticsApi.getStrategies(params),
      ]);
      setInstruments(instrumentsRes.data.instruments);
      setStrategies(strategiesRes.data.strategies);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="animate-fade-rise space-y-6">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Analytics</h1>
          <p className="mt-1 text-sm text-neutral-500">Breakdowns by market and by strategy</p>
        </div>
      </header>
      <FilterBar filters={filters} onChange={setFilters} />
      <ErrorBanner message={error} onRetry={load} />

      {loading ? (
        <Spinner />
      ) : instruments.length === 0 && strategies.length === 0 ? (
        <Card>
          <EmptyState
            title="No analytics yet"
            message="Once you log trades (or seed the demo dataset) the instrument and strategy breakdowns will appear here."
          />
        </Card>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle title="Performance by instrument" subtitle={`${instruments.length} markets tracked`} />
              {instruments.length ? <HorizontalRBar data={instruments} /> : <EmptyState title="No instruments in view" />}
              {instruments.length > 0 && <InstrumentTable rows={instruments} />}
            </Card>
            <Card>
              <SectionTitle title="Performance by strategy" subtitle={`${strategies.length} strategies tracked`} />
              {strategies.length ? <HorizontalRBar data={strategies} /> : <EmptyState title="No strategies in view" />}
              {strategies.length > 0 && <StrategyTable rows={strategies} />}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>
    </div>
  );
}

/** Shared table shell for the grouped analytics. */
function TableShell({ children }) {
  return (
    <div className="mt-5 overflow-x-auto border-t border-border pt-2">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-neutral-500">
            <th className="py-2 text-left font-medium">Name</th>
            <th className="py-2 text-right font-medium">Trades</th>
            <th className="py-2 text-right font-medium">Win rate</th>
            <th className="py-2 text-right font-medium">Net R</th>
            <th className="py-2 text-right font-medium">Avg R</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">{children}</tbody>
      </table>
    </div>
  );
}

function Row({ name, row, nameClassName = '' }) {
  return (
    <tr className="hover:bg-surface-alt/60">
      <td className={`py-2.5 font-medium text-white ${nameClassName}`}>{row.name ?? name}</td>
      <td className="py-2.5 text-right text-neutral-400">{formatNumber(row.trades, 0)}</td>
      <td className="py-2.5 text-right text-neutral-300">{formatPercent(row.winRate)}</td>
      <td className={`py-2.5 text-right font-mono font-semibold ${signClass(row.netR)}`}>{formatR(row.netR)}</td>
      <td className={`py-2.5 text-right font-mono ${signClass(row.avgR)}`}>{formatR(row.avgR)}</td>
    </tr>
  );
}

function InstrumentTable({ rows }) {
  return (
    <TableShell>
      {rows.map((row) => (
        <Row key={row.name} name={row.name} row={row} />
      ))}
    </TableShell>
  );
}

function StrategyTable({ rows }) {
  return (
    <TableShell>
      {rows.map((row) => (
        <Row key={row.name} name={row.name} row={row} />
      ))}
    </TableShell>
  );
}