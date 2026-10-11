import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp } from 'lucide-react';
import { analyticsApi, tradeApi, toErrorMessage } from '../services/api.js';
import FilterBar from '../components/FilterBar.jsx';
import { Card, EmptyState, ErrorBanner, Spinner } from '../components/ui.jsx';
import { HorizontalRBar, MonthlyChart, OutcomeDonut, REquityChart, StatCard, useChartTheme, COLORS } from '../components/charts.jsx';
import AccountBalanceCard from '../components/AccountBalanceCard.jsx';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNumber, formatPercent, formatR, signClass } from '../utils/format.js';
import { datasetSlice } from '../utils/datasets.js';

/**
 * Dashboard — trading performance overview.
 * Headline numbers come from /api/analytics/summary (server-computed).
 * Date/instrument filters are mirrored client-side for the small charts.
 */

export default function DashboardPage() {
  const [filters, setFilters] = useState({ range: '90', instrument: '' });
  const [summary, setSummary] = useState(null);
  const [allTrades, setAllTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = {};
    if (filters.range && filters.range !== '0') params.range = filters.range;
    if (filters.instrument) params.instrument = filters.instrument;
    try {
      const [summaryRes, tradesRes] = await Promise.all([
        analyticsApi.getSummary(params),
        tradeApi.getTrades({ limit: 1000, sort: 'tradeDate', order: 'desc' }),
      ]);
      setSummary(summaryRes.data);
      setAllTrades(tradesRes.data.trades);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const sliced = datasetSlice(allTrades, filters.range, filters.instrument);

  const stats = summary || {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    breakevenTrades: 0,
    winRate: null,
    netR: null,
    avgR: null,
    avgWinR: null,
    avgLossR: null,
    profitFactor: null,
    expectancy: null,
    maxDrawdownR: null,
    equityCurve: [],
    monthly: [],
    demoTrades: 0,
  };

  if (loading && !summary) {
    return (
      <div className="animate-fade-rise">
        <PageHeader filters={filters} onFilters={setFilters} />
        <Spinner />
      </div>
    );
  }

  return (
    <div className="animate-fade-rise space-y-6">
      <PageHeader filters={filters} onFilters={setFilters} loading={loading} lastRefreshed={lastRefreshed} />
      <ErrorBanner message={error} onRetry={load} />

      {summary?.totalTrades === 0 ? (
        <Card>
          <EmptyState
            title="No trades yet"
            message="Add your first backtested trade, or seed the demo dataset from the Settings page to see charts and metrics in action."
            icon={<TrendingUp size={40} />}
          />
          <div className="flex justify-center pb-6">
            <Link to="/add" className="btn-primary">
              <Plus size={16} />
              Add your first trade
            </Link>
          </div>
        </Card>
      ) : (
        <DashboardContent stats={stats} sliced={sliced} allTrades={allTrades} />
      )}
    </div>
  );
}
function DashboardContent({ stats, sliced, allTrades }) {
  return (
    <>
      {/* Account balance + P&L — computed across the full trade log, not the filtered view */}
      <AccountBalanceCard trades={allTrades} />

      {/* Headline metric cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total closed trades" value={formatNumber(stats.totalTrades, 0)} sub={stats.demoTrades ? `${stats.demoTrades} demo seeded` : null} />
        <StatCard
          label="Win rate"
          value={formatPercent(stats.winRate)}
          sub={`${stats.winningTrades}W · ${stats.losingTrades}L · ${stats.breakevenTrades}BE`}
          accent={Number(stats.winRate) >= 50 ? 'text-positive' : 'text-foreground'}
        />
        <StatCard
          label="Net performance"
          value={formatR(stats.netR)}
          sub={<span className={signClass(stats.netR)}>avg {formatR(stats.avgR)} per trade</span>}
          accent={signClass(stats.netR)}
        />
        <StatCard label="Max drawdown" value={formatR(stats.maxDrawdownR)} sub="peak-to-trough (R)" accent="text-negative" />
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Average winning R" value={formatR(stats.avgWinR)} accent="text-positive" />
        <StatCard label="Average losing R" value={formatR(stats.avgLossR)} accent="text-negative" />
        <StatCard label="Profit factor" value={stats.profitFactor === null ? 'N/A' : formatNumber(stats.profitFactor)} sub="gross wins ÷ gross losses" />
        <StatCard label="Expectancy" value={stats.expectancy === null ? 'N/A' : formatR(stats.expectancy, 3)} sub="per trade (R)" accent={signClass(stats.expectancy)} />
      </section>

      {/* Cumulative R equity curve */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Cumulative R equity curve</h2>
            <p className="mt-0.5 text-xs text-neutral-500">Net R across the {sliced.length} trades in view</p>
          </div>
          <span className="chip border-accent/30 bg-accent/10 text-accent">
            <TrendingUp size={14} /> {formatR(stats.netR)}
          </span>
        </div>
        <REquityChart data={stats.equityCurve || []} />
      </Card>

      {/* Charts row */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle title="Performance by instrument" subtitle="Net R per market" />
          <HorizontalRBar data={slicedInstruments(sliced)} />
        </Card>
        <Card>
          <CardTitle title="Performance by strategy" subtitle="Net R per strategy" />
          <HorizontalRBar data={slicedStrategies(sliced)} />
        </Card>
        <Card>
          <CardTitle title="Win / loss distribution" subtitle="Closed trades in view" />
          <OutcomeDonut
            wins={countOutcome(sliced, 'WIN')}
            losses={countOutcome(sliced, 'LOSS')}
            breakevens={countOutcome(sliced, 'BREAKEVEN')}
          />
        </Card>
        <Card>
          <CardTitle title="Win rate by timeframe" subtitle="Win rate per timeframe in view" />
          <WinRateByTimeframe trades={sliced} />
        </Card>
      </section>

      {/* Monthly performance */}
      <Card>
        <CardTitle title="Monthly performance" subtitle="Net R per calendar month" />
        <MonthlyChart data={stats.monthly || []} />
      </Card>
    </>
  );
}
function PageHeader({ filters, onFilters, loading, lastRefreshed }) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString()}` : 'Your backtest performance at a glance'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {loading && <span className="text-xs text-neutral-500">Refreshing…</span>}
        <Link to="/add" className="btn-primary">
          <Plus size={16} />
          Add trade
        </Link>
      </div>
      <div className="w-full lg:w-auto">
        <FilterBar filters={filters} onChange={onFilters} />
      </div>
    </header>
  );
}

function CardTitle({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>
    </div>
  );
}

/** Minimal client-side grouping for the instrument chart in the filtered view. */
function slicedInstruments(trades) {
  const byInstrument = new Map();
  for (const trade of trades) {
    if (!byInstrument.has(trade.instrument)) byInstrument.set(trade.instrument, { name: trade.instrument, netR: 0, wins: 0, trades: 0 });
    const group = byInstrument.get(trade.instrument);
    group.netR += Number(trade.actualR || 0);
    group.trades += 1;
    if (trade.outcome === 'WIN') group.wins += 1;
  }
  return [...byInstrument.values()].map((d) => ({
    ...d,
    netR: Number(d.netR.toFixed(2)),
    winRate: d.trades ? Math.round((d.wins / d.trades) * 1000) / 10 : null,
  }));
}

function countOutcome(trades, outcome) {
  return trades.filter((trade) => trade.outcome === outcome).length;
}
/** Client-side grouping for the strategy chart in the filtered view. */
function slicedStrategies(trades) {
  const byStrategy = new Map();
  for (const trade of trades) {
    const key = trade.strategy || 'Unknown';
    if (!byStrategy.has(key)) byStrategy.set(key, { name: key, netR: 0, wins: 0, trades: 0 });
    const group = byStrategy.get(key);
    group.netR += Number(trade.actualR || 0);
    group.trades += 1;
    if (trade.outcome === 'WIN') group.wins += 1;
  }
  return [...byStrategy.values()]
    .map((d) => ({ ...d, netR: Number(d.netR.toFixed(2)) }))
    .sort((a, b) => b.netR - a.netR);
}

/** Win rate grouped by timeframe — a small bar chart with accurate colors. */
function WinRateByTimeframe({ trades }) {
  const chart = useChartTheme();
  const rows = useMemo(() => {
    const byTf = new Map();
    for (const trade of trades) {
      const key = trade.timeframe || '?';
      if (!byTf.has(key)) byTf.set(key, { name: key, winRate: 0, trades: 0, wins: 0 });
      const group = byTf.get(key);
      group.trades += 1;
      if (trade.outcome === 'WIN') group.wins += 1;
    }
    return [...byTf.values()]
      .map((group) => ({
        name: group.name,
        trades: group.trades,
        winRate: group.trades ? Math.round((group.wins / group.trades) * 1000) / 10 : null,
        netR: 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [trades]);

  if (!rows.length) {
    return <div className="flex h-[160px] items-center justify-center text-sm text-neutral-500">No timeframe data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 36)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid stroke={chart.grid} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: chart.tick, fontSize: 11 }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={40} tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(value) => `${value}%`} labelFormatter={() => ''} />
        <Bar dataKey="winRate" name="Win rate" radius={[0, 4, 4, 0]} barSize={16}>
          {rows.map((entry) => (
            <Cell key={entry.name} fill={(entry.winRate ?? 0) >= 50 ? COLORS.positive : COLORS.negative} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}