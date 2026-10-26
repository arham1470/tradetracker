import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Calendar,
  Layers,
  PieChart,
  Plus,
  RefreshCw,
  Scale,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { analyticsApi, tradeApi, toErrorMessage } from '../services/api.js';
import FilterBar from '../components/FilterBar.jsx';
import { Card, EmptyState, ErrorBanner, Spinner } from '../components/ui.jsx';
import { HorizontalRBar, MonthlyChart, OutcomeDonut, REquityChart, useChartTheme, COLORS } from '../components/charts.jsx';
import AccountBalanceCard from '../components/AccountBalanceCard.jsx';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNumber, formatPercent, formatR, signClass } from '../utils/format.js';
import { datasetSlice } from '../utils/datasets.js';

/**
 * Modern Animated Dashboard — high-fidelity trading performance command center.
 * Headline metrics come from /api/analytics/summary (server-computed).
 * Date/instrument filters are mirrored client-side for dynamic view-slicing.
 */

export default function DashboardPage() {
  const [filters, setFilters] = useState({ range: '90', instrument: '' });
  const [summary, setSummary] = useState(null);
  const [allTrades, setAllTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const load = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
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
      setRefreshing(false);
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
      <div className="animate-fade-rise space-y-6">
        <PageHeader
          filters={filters}
          onFilters={setFilters}
          loading={loading}
          refreshing={refreshing}
          onRefresh={() => load(true)}
          lastRefreshed={lastRefreshed}
        />
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-accent/20 animate-ping absolute inset-0" />
            <div className="w-14 h-14 rounded-2xl border-2 border-accent border-t-transparent animate-spin flex items-center justify-center relative bg-surface shadow-xl">
              <Zap size={22} className="text-accent animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Syncing portfolio analytics…</p>
            <p className="text-xs text-neutral-500 mt-1">Crunching trade journal data & expectancy curves</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-rise space-y-6">
      <PageHeader
        filters={filters}
        onFilters={setFilters}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => load(true)}
        lastRefreshed={lastRefreshed}
        tradeCount={stats.totalTrades}
      />

      <ErrorBanner message={error} onRetry={() => load(true)} />

      {summary?.totalTrades === 0 ? (
        <div className="glass-card p-10 text-center animate-fade-rise-up">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent shadow-inner mb-4">
            <Sparkles size={28} className="animate-pulse" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No trades recorded yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
            Log your first backtested trade or seed demo data in Settings to unlock automated equity curves, expectancy stats, and market insights.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/add"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.99]"
            >
              <Plus size={16} />
              Add your first trade
            </Link>
          </div>
        </div>
      ) : (
        <DashboardContent stats={stats} sliced={sliced} allTrades={allTrades} />
      )}
    </div>
  );
}

function DashboardContent({ stats, sliced, allTrades }) {
  // Edge score assessment
  const profitFactorNum = Number(stats.profitFactor || 0);
  const winRateNum = Number(stats.winRate || 0);
  const isHealthyEdge = profitFactorNum >= 1.3 || (winRateNum >= 50 && Number(stats.netR) > 0);

  return (
    <div className="space-y-6">
      {/* Edge & Outcome Horizon Bar */}
      <section className="glass-card p-4 animate-fade-rise-up delay-50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold shadow-sm ${
                isHealthyEdge
                  ? 'bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30'
              }`}
            >
              {isHealthyEdge ? <Award size={18} /> : <Activity size={18} />}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Trading System Edge</span>
                <span
                  className={`chip text-[11px] font-semibold ${
                    isHealthyEdge
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                  }`}
                >
                  {profitFactorNum >= 1.6
                    ? 'Excellent Edge'
                    : profitFactorNum >= 1.2
                    ? 'Consistent Edge'
                    : 'Developing Edge'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                {stats.totalTrades} closed backtests · Expectancy{' '}
                <span className={`font-mono font-medium ${signClass(stats.expectancy)}`}>
                  {formatR(stats.expectancy, 2)}/trade
                </span>
              </p>
            </div>
          </div>

          {/* Quick Outcome Distribution Bar */}
          <div className="flex flex-col gap-1.5 sm:w-72">
            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
              <span className="text-emerald-500 font-semibold">{stats.winningTrades}W ({formatPercent(stats.winRate, 0)})</span>
              <span className="text-neutral-400">{stats.breakevenTrades}BE</span>
              <span className="text-rose-500 font-semibold">{stats.losingTrades}L</span>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-alt ring-1 ring-border/50">
              <div
                style={{ width: `${stats.totalTrades ? (stats.winningTrades / stats.totalTrades) * 100 : 0}%` }}
                className="bg-emerald-500 transition-all duration-500"
                title={`Wins: ${stats.winningTrades}`}
              />
              <div
                style={{ width: `${stats.totalTrades ? (stats.breakevenTrades / stats.totalTrades) * 100 : 0}%` }}
                className="bg-neutral-500 transition-all duration-500"
                title={`Breakeven: ${stats.breakevenTrades}`}
              />
              <div
                style={{ width: `${stats.totalTrades ? (stats.losingTrades / stats.totalTrades) * 100 : 0}%` }}
                className="bg-rose-500 transition-all duration-500"
                title={`Losses: ${stats.losingTrades}`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Account balance + compounded P&L simulation */}
      <section className="animate-fade-rise-up delay-100">
        <AccountBalanceCard trades={allTrades} />
      </section>

      {/* Headline Metric Cards — Top Row */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <ModernStatCard
          label="Total Closed Trades"
          value={formatNumber(stats.totalTrades, 0)}
          sub={stats.demoTrades ? `${stats.demoTrades} demo seeded` : 'Completed backtests'}
          icon={<Layers size={18} className="text-blue-500" />}
          delay="delay-100"
          accentBg="bg-blue-500/10 text-blue-500"
        />
        <ModernStatCard
          label="Win Rate"
          value={formatPercent(stats.winRate)}
          sub={`${stats.winningTrades}W · ${stats.losingTrades}L · ${stats.breakevenTrades}BE`}
          icon={<Target size={18} className={Number(stats.winRate) >= 50 ? 'text-emerald-500' : 'text-foreground'} />}
          valueColor={Number(stats.winRate) >= 50 ? 'text-emerald-500' : 'text-foreground'}
          progressBar={stats.winRate}
          delay="delay-150"
          accentBg="bg-emerald-500/10 text-emerald-500"
        />
        <ModernStatCard
          label="Net Performance"
          value={formatR(stats.netR)}
          sub={`Avg ${formatR(stats.avgR)} per trade`}
          icon={<TrendingUp size={18} className={signClass(stats.netR)} />}
          valueColor={signClass(stats.netR)}
          delay="delay-200"
          accentBg={Number(stats.netR) >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}
        />
        <ModernStatCard
          label="Max Drawdown"
          value={formatR(stats.maxDrawdownR)}
          sub="Peak-to-trough drop"
          icon={<ShieldAlert size={18} className="text-rose-500" />}
          valueColor="text-rose-500"
          delay="delay-250"
          accentBg="bg-rose-500/10 text-rose-500"
        />
      </section>

      {/* Headline Metric Cards — Second Row */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <ModernStatCard
          label="Average Win"
          value={formatR(stats.avgWinR)}
          sub="Mean winning multiple"
          icon={<ArrowUpRight size={18} className="text-emerald-500" />}
          valueColor="text-emerald-500"
          delay="delay-150"
          accentBg="bg-emerald-500/10 text-emerald-500"
        />
        <ModernStatCard
          label="Average Loss"
          value={formatR(stats.avgLossR)}
          sub="Mean losing multiple"
          icon={<ArrowDownRight size={18} className="text-rose-500" />}
          valueColor="text-rose-500"
          delay="delay-200"
          accentBg="bg-rose-500/10 text-rose-500"
        />
        <ModernStatCard
          label="Profit Factor"
          value={stats.profitFactor === null ? 'N/A' : formatNumber(stats.profitFactor)}
          sub="Gross wins ÷ gross losses"
          icon={<Zap size={18} className="text-amber-500" />}
          valueColor={profitFactorNum >= 1.5 ? 'text-emerald-500' : profitFactorNum >= 1.0 ? 'text-foreground' : 'text-rose-500'}
          delay="delay-250"
          accentBg="bg-amber-500/10 text-amber-500"
        />
        <ModernStatCard
          label="Trade Expectancy"
          value={stats.expectancy === null ? 'N/A' : formatR(stats.expectancy, 3)}
          sub="Mathematical edge per trade"
          icon={<Scale size={18} className={signClass(stats.expectancy)} />}
          valueColor={signClass(stats.expectancy)}
          delay="delay-300"
          accentBg="bg-blue-500/10 text-blue-500"
        />
      </section>

      {/* Cumulative R Equity Curve */}
      <section className="glass-card p-5 animate-fade-rise-up delay-200 group">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent shadow-sm group-hover:scale-105 transition-transform">
              <TrendingUp size={18} />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Cumulative R Equity Trajectory</h2>
              <p className="text-xs text-neutral-500">
                Visual equity growth trajectory across {sliced.length} filtered trades
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="chip border-accent/30 bg-accent/10 font-mono text-accent">
              <Sparkles size={12} /> Net {formatR(stats.netR)}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-border/40 bg-surface/60 p-2 backdrop-blur-sm">
          <REquityChart data={stats.equityCurve || []} />
        </div>
      </section>

      {/* 2x2 Analytics Charts Grid */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5 animate-fade-rise-up delay-250 group">
          <CardTitle
            title="Performance by Instrument"
            subtitle="Net R return & win rate grouped per market pair"
            icon={<BarChart3 size={16} className="text-blue-500" />}
          />
          <div className="mt-3">
            <HorizontalRBar data={slicedInstruments(sliced)} />
          </div>
        </div>

        <div className="glass-card p-5 animate-fade-rise-up delay-300 group">
          <CardTitle
            title="Performance by Strategy"
            subtitle="Ranked playbook efficacy across filtered backtests"
            icon={<Zap size={16} className="text-amber-500" />}
          />
          <div className="mt-3">
            <HorizontalRBar data={slicedStrategies(sliced)} />
          </div>
        </div>

        <div className="glass-card p-5 animate-fade-rise-up delay-300 group">
          <CardTitle
            title="Win / Loss Distribution"
            subtitle="Closed trade outcomes in current view"
            icon={<PieChart size={16} className="text-emerald-500" />}
          />
          <div className="mt-3">
            <OutcomeDonut
              wins={countOutcome(sliced, 'WIN')}
              losses={countOutcome(sliced, 'LOSS')}
              breakevens={countOutcome(sliced, 'BREAKEVEN')}
            />
          </div>
        </div>

        <div className="glass-card p-5 animate-fade-rise-up delay-350 group">
          <CardTitle
            title="Win Rate by Timeframe"
            subtitle="Execution consistency across candle intervals"
            icon={<Target size={16} className="text-indigo-500" />}
          />
          <div className="mt-3">
            <WinRateByTimeframe trades={sliced} />
          </div>
        </div>
      </section>

      {/* Monthly Performance Timeline */}
      <section className="glass-card p-5 animate-fade-rise-up delay-400 group">
        <CardTitle
          title="Monthly Performance Horizon"
          subtitle="Net R generated per calendar month across backtested history"
          icon={<Calendar size={16} className="text-accent" />}
        />
        <div className="mt-3">
          <MonthlyChart data={stats.monthly || []} />
        </div>
      </section>
    </div>
  );
}

function PageHeader({ filters, onFilters, loading, refreshing, onRefresh, lastRefreshed, tradeCount }) {
  return (
    <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">
            Portfolio Live Journal
          </span>
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Trading Dashboard
        </h1>
        <p className="mt-0.5 text-xs text-neutral-500">
          {lastRefreshed ? `Synchronized at ${lastRefreshed.toLocaleTimeString()}` : 'Your backtest performance at a glance'}
          {tradeCount !== undefined && ` · ${tradeCount} total trades logged`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Refresh button with rotating icon */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-neutral-300 shadow-sm transition hover:bg-surface-alt hover:text-foreground active:scale-95 disabled:opacity-50"
          title="Refresh portfolio statistics"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin text-accent' : ''} />
          <span>{refreshing ? 'Updating…' : 'Refresh'}</span>
        </button>

        {/* Primary CTA */}
        <Link
          to="/add"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/35 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={16} />
          Log New Trade
        </Link>

        {/* Filter bar */}
        <div className="w-full lg:w-auto">
          <FilterBar filters={filters} onChange={onFilters} />
        </div>
      </div>
    </header>
  );
}

function ModernStatCard({ label, value, sub, icon, valueColor = 'text-foreground', progressBar = null, delay = '', accentBg = 'bg-accent/10 text-accent' }) {
  return (
    <div
      className={`glass-card p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg animate-fade-rise-up ${delay} relative overflow-hidden group`}
    >
      {/* Ambient background hover glow */}
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-accent/5 blur-xl group-hover:bg-accent/10 transition-colors" />

      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 truncate">{label}</p>
        {icon && (
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${accentBg} transition-transform group-hover:scale-110 shadow-sm`}>
            {icon}
          </span>
        )}
      </div>

      <p className={`mt-2 font-mono text-2xl font-bold tracking-tight ${valueColor}`}>
        {value}
      </p>

      {/* Optional mini progress bar (e.g. for win rate) */}
      {progressBar !== null && !Number.isNaN(Number(progressBar)) && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-surface-alt overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ${Number(progressBar) >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
            style={{ width: `${Math.min(100, Math.max(0, Number(progressBar)))}%` }}
          />
        </div>
      )}

      {sub && <p className="mt-1.5 text-xs text-neutral-500 truncate">{sub}</p>}
    </div>
  );
}

function CardTitle({ title, subtitle, icon }) {
  return (
    <div className="flex items-center gap-2.5">
      {icon && (
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-alt text-neutral-300 border border-border/60">
          {icon}
        </span>
      )}
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
      </div>
    </div>
  );
}

/** Minimal client-side grouping for the instrument chart in the filtered view. */
function slicedInstruments(trades) {
  const byInstrument = new Map();
  for (const trade of trades) {
    if (!byInstrument.has(trade.instrument)) {
      byInstrument.set(trade.instrument, { name: trade.instrument, netR: 0, wins: 0, trades: 0 });
    }
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
    if (!byStrategy.has(key)) {
      byStrategy.set(key, { name: key, netR: 0, wins: 0, trades: 0 });
    }
    const group = byStrategy.get(key);
    group.netR += Number(trade.actualR || 0);
    group.trades += 1;
    if (trade.outcome === 'WIN') group.wins += 1;
  }
  return [...byStrategy.values()]
    .map((d) => ({ ...d, netR: Number(d.netR.toFixed(2)) }))
    .sort((a, b) => b.netR - a.netR);
}

/** Win rate grouped by timeframe — clean animated horizontal bar chart with accurate colors and benchmark line. */
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
    return (
      <div className="flex h-[160px] items-center justify-center text-sm text-neutral-500">
        No timeframe data recorded for this view
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 38)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid stroke={chart.grid} horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fill: chart.tick, fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={44}
          tick={{ fill: chart.tick, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => [`${value}%`, 'Win Rate']}
          contentStyle={{
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))',
            borderRadius: '0.75rem',
            fontSize: '12px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
          }}
        />
        <Bar dataKey="winRate" name="Win rate" radius={[0, 6, 6, 0]} barSize={16}>
          {rows.map((entry) => (
            <Cell
              key={entry.name}
              fill={(entry.winRate ?? 0) >= 50 ? COLORS.positive : COLORS.negative}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}