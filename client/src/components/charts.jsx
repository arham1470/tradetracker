import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDate, formatNumber, formatR } from '../utils/format.js';
import { useTheme } from '../theme/ThemeContext.jsx';

export const COLORS = {
  accent: '#3b82f6',
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#94a3b8',
};

/** Theme-aware chart colours (axes, grid, donut stroke). */
export function useChartTheme() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return {
    tick: dark ? '#6b7280' : '#64748b',
    grid: dark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.15)',
    cursor: dark ? 'rgba(148,163,184,0.06)' : 'rgba(100,116,139,0.08)',
    donutStroke: dark ? '#0d1117' : '#ffffff',
  };
}

/** Recharts axis tick object styled for the active theme. */
const axisTick = (chart) => ({ fill: chart.tick, fontSize: 11 });

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-neutral-300">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2 text-neutral-400">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color || entry.fill || COLORS.accent }} />
          <span className="capitalize">{entry.name}:</span>
          <span className="font-mono font-medium text-foreground">
            {entry.dataKey === 'netR' ? formatR(entry.value) : formatNumber(entry.value, Number.isInteger(entry.value) ? 0 : 2)}
          </span>
        </p>
      ))}
    </div>
  );
}

function NoData({ height = 280 }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center" style={{ height }}>
      <p className="text-sm text-neutral-500">No data for the selected filters</p>
      <p className="text-xs text-neutral-600">Add trades or widen the date range to see charts.</p>
    </div>
  );
}

/** Cumulative R equity curve (area chart). */
export function REquityChart({ data }) {
  const chart = useChartTheme();
  if (!data || !data.length) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.35} />
            <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={chart.grid} vertical={false} />
        <XAxis dataKey="date" tick={axisTick(chart)} tickFormatter={(value) => formatDate(value)} minTickGap={48} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick(chart)} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="netR" name="Net R" stroke={COLORS.accent} strokeWidth={2} fill="url(#equityFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Win/loss distribution donut. */
export function OutcomeDonut({ wins = 0, losses = 0, breakevens = 0 }) {
  const chart = useChartTheme();
  const data = [];
  if (wins > 0) data.push({ name: 'Wins', value: wins, fill: COLORS.positive });
  if (breakevens > 0) data.push({ name: 'Breakeven', value: breakevens, fill: COLORS.neutral });
  if (losses > 0) data.push({ name: 'Losses', value: losses, fill: COLORS.negative });

  if (!data.length) return <NoData height={260} />;
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="h-52 min-w-[180px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              stroke={chart.donutStroke}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-2 text-sm">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2 text-neutral-400">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.fill }} />
              {entry.name}
            </span>
            <span className="font-semibold text-foreground">
              {entry.value}
              <span className="ml-2 font-mono text-xs text-neutral-500">
                {total ? Math.round((entry.value / total) * 100) : 0}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
/** Horizontal net-R bar chart (instruments / strategies). */
export function HorizontalRBar({ data, dataKey = 'netR' }) {
  const chart = useChartTheme();
  if (!data || !data.length) return <NoData />;
  const chartData = [...data].sort((a, b) => (b.netR ?? 0) - (a.netR ?? 0));
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 46)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid stroke={chart.grid} horizontal={false} />
        <XAxis type="number" tick={axisTick(chart)} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={axisTick(chart)} width={74} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: chart.cursor }} />
        <Bar dataKey={dataKey} name="Net R" radius={[0, 4, 4, 0]} barSize={18}>
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={(entry.netR ?? 0) >= 0 ? COLORS.positive : COLORS.negative} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Monthly net R bar chart. */
export function MonthlyChart({ data }) {
  const chart = useChartTheme();
  if (!data || !data.length) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={chart.grid} vertical={false} />
        <XAxis dataKey="label" tick={axisTick(chart)} minTickGap={24} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick(chart)} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: chart.cursor }} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
        <Bar dataKey="netR" name="Net R" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.key} fill={(entry.netR ?? 0) >= 0 ? COLORS.positive : COLORS.negative} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Dashboard-friendly number card with subtle accent styling. */
export function StatCard({ label, value, sub, accent = 'text-foreground' }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={`mt-1.5 font-mono text-2xl font-semibold tracking-tight ${accent}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}